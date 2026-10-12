from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
import sqlite3, uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB = Path(__file__).parent / 'bookflow.db'
lock = Lock()
app = FastAPI(title='BookFlow API')
SERVICES = [dict(id='consultation',name='Consultation',duration=60,price=50),dict(id='private-session',name='Private Session',duration=60,price=80),dict(id='group-class',name='Group Class',duration=90,price=35)]

@contextmanager
def connect():
    con=sqlite3.connect(DB, timeout=15)
    con.row_factory=sqlite3.Row
    try:
        yield con
    finally:
        con.close()

with connect() as db:
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('''CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, customer TEXT NOT NULL, email TEXT NOT NULL, service TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)''')
    db.commit()

class BookingIn(BaseModel):
    customer: str = Field(min_length=1,max_length=100)
    email: str = Field(min_length=3,max_length=254)
    service: str
    date: str
    time: str

@app.get('/health')
def health(): return {'status':'ok'}

@app.get('/services')
def services(): return SERVICES

@app.get('/bookings')
def bookings():
    with connect() as db:
        return [dict(row) for row in db.execute('SELECT * FROM bookings ORDER BY date,time')]

@app.get('/availability')
def availability(date:str,service:str):
    svc=next((s for s in SERVICES if s['name']==service),None)
    if not svc: raise HTTPException(404,'Service not found')
    try: day=datetime.strptime(date,'%Y-%m-%d').date()
    except ValueError: raise HTTPException(400,'Invalid date')
    with connect() as db:
        rows=[dict(r) for r in db.execute("SELECT * FROM bookings WHERE date=? AND status='Confirmed'",(date,))]
    slots=[]
    for hour in range(9,18):
        start=datetime.combine(day,datetime.min.time()).replace(hour=hour)
        end=start+timedelta(minutes=svc['duration'])
        overlap=any(start < datetime.fromisoformat(r['date']+'T'+r['time'])+timedelta(minutes=r['duration']) and end > datetime.fromisoformat(r['date']+'T'+r['time']) for r in rows)
        slots.append({'time':f'{hour:02d}:00','available':not overlap and end.hour<=18 and start>datetime.now()})
    return slots

@app.post('/bookings',status_code=201)
def create(data:BookingIn):
    svc=next((s for s in SERVICES if s['name']==data.service),None)
    if not svc: raise HTTPException(400,'Invalid service')
    try: start=datetime.fromisoformat(data.date+'T'+data.time)
    except ValueError: raise HTTPException(400,'Invalid date or time')
    if start<=datetime.now(): raise HTTPException(400,'Select a future time')
    if start.minute!=0 or not 9<=start.hour<18 or start+timedelta(minutes=svc['duration'])>start.replace(hour=18,minute=0):
        raise HTTPException(400,'Outside business hours')
    if '@' not in data.email: raise HTTPException(400,'Invalid email')
    with lock:
        with connect() as db:
            db.execute('BEGIN IMMEDIATE')
            rows=db.execute("SELECT date,time,duration FROM bookings WHERE date=? AND status='Confirmed'",(data.date,)).fetchall()
            if any(start < datetime.fromisoformat(r['date']+'T'+r['time'])+timedelta(minutes=r['duration']) and start+timedelta(minutes=svc['duration'])>datetime.fromisoformat(r['date']+'T'+r['time']) for r in rows):
                db.rollback()
                raise HTTPException(409,'This time slot is unavailable')
            item=dict(id=str(uuid.uuid4()),customer=data.customer.strip(),email=data.email.strip(),service=data.service,date=data.date,time=data.time,duration=svc['duration'],status='Confirmed',created_at=datetime.now(timezone.utc).isoformat())
            db.execute('INSERT INTO bookings VALUES (:id,:customer,:email,:service,:date,:time,:duration,:status,:created_at)',item)
            db.commit()
            return item

@app.patch('/bookings/{booking_id}/cancel')
def cancel(booking_id:str):
    with connect() as db:
        result=db.execute("UPDATE bookings SET status='Cancelled' WHERE id=? AND status='Confirmed'",(booking_id,))
        db.commit()
        if result.rowcount==0: raise HTTPException(404,'Active booking not found')
    return {'status':'Cancelled'}


# BOOKFLOW_INVENTORY_ROUTER
from inventory import router as inventory_router
app.include_router(inventory_router)

from rates import router as rates_router

app.include_router(rates_router)
