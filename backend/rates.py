from datetime import date, timedelta
from pathlib import Path
import os
import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/rates", tags=["rates"])

DB_PATH = Path(
    os.getenv(
        "BOOKFLOW_RATES_DB",
        str(Path(__file__).resolve().parent / "rates.sqlite3")
    )
)


def connect():
    connection = sqlite3.connect(DB_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout=15000")
    return connection


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS room_rates (
                room_id INTEGER NOT NULL,
                day TEXT NOT NULL,
                price INTEGER NOT NULL CHECK(price >= 0),
                PRIMARY KEY(room_id, day)
            )
        """)


init_db()


class RateUpdate(BaseModel):
    room_ids: list[int] = Field(min_length=1)
    start: date
    end: date
    price: int = Field(ge=0)


@router.get("")
def get_rates(start: date, end: date):
    if end <= start:
        raise HTTPException(
            status_code=400,
            detail="End date must be after start date"
        )

    if (end - start).days > 366:
        raise HTTPException(
            status_code=400,
            detail="Date range must not exceed 366 days"
        )

    with connect() as db:
        rows = db.execute(
            """
            SELECT room_id, day, price
            FROM room_rates
            WHERE day >= ? AND day < ?
            ORDER BY room_id, day
            """,
            (start.isoformat(), end.isoformat())
        ).fetchall()

    return {"rates": [dict(row) for row in rows]}


@router.post("")
def update_rates(payload: RateUpdate):
    if payload.end <= payload.start:
        raise HTTPException(
            status_code=400,
            detail="End date must be after start date"
        )

    if (payload.end - payload.start).days > 366:
        raise HTTPException(
            status_code=400,
            detail="Date range must not exceed 366 days"
        )

    unique_room_ids = sorted(set(payload.room_ids))
    current = payload.start
    updates = []

    while current < payload.end:
        for room_id in unique_room_ids:
            updates.append((
                room_id,
                current.isoformat(),
                payload.price
            ))
        current += timedelta(days=1)

    with connect() as db:
        db.executemany(
            """
            INSERT INTO room_rates (room_id, day, price)
            VALUES (?, ?, ?)
            ON CONFLICT(room_id, day)
            DO UPDATE SET price = excluded.price
            """,
            updates
        )

    return {"updated": len(updates), "price": payload.price}
