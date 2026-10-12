import os
import sqlite3
from pathlib import Path
from datetime import date, timedelta
from contextlib import contextmanager

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/inventory", tags=["Room Inventory"])
DB = Path(__file__).resolve().parent / "inventory.db"


@contextmanager
def connection():
    db = sqlite3.connect(str(DB), timeout=15, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=15000")
    try:
        yield db
    finally:
        db.close()


def initialize():
    with connection() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS room_days (
            room_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            blocked INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (room_id, day),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        );

        CREATE TABLE IF NOT EXISTS room_reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            guest TEXT NOT NULL,
            email TEXT NOT NULL,
            check_in TEXT NOT NULL,
            check_out TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Confirmed',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_room_reservation_dates
        ON room_reservations(room_id, check_in, check_out);
        """)

        if db.execute("SELECT COUNT(*) FROM rooms").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO rooms(name,category) VALUES (?,?)",
                [
                    ("Deluxe 101", "Deluxe"),
                    ("Deluxe 102", "Deluxe"),
                    ("Deluxe 103", "Deluxe"),
                    ("Suite 201", "Suite"),
                    ("Suite 202", "Suite"),
                    ("Standard 301", "Standard"),
                ],
            )


initialize()


def dates_between(start, end):
    try:
        a = date.fromisoformat(start)
        b = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(422, "Invalid date format")

    days = (b - a).days
    if days <= 0 or days > 90:
        raise HTTPException(422, "Stay must be between 1 and 90 nights")

    return [(a + timedelta(days=i)).isoformat() for i in range(days)]


def ensure_room(db, room_id):
    row = db.execute(
        "SELECT * FROM rooms WHERE id=? AND active=1", (room_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Room not found")
    return row


class BlockRequest(BaseModel):
    room_ids: list[int] = Field(min_length=1, max_length=100)
    start: str
    end: str
    blocked: bool


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)


class ReservationCreate(BaseModel):
    room_id: int
    guest: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    check_in: str
    check_out: str


@router.get("/rooms")
def list_rooms():
    with connection() as db:
        return [
            dict(row) for row in db.execute(
                "SELECT * FROM rooms WHERE active=1 ORDER BY id"
            ).fetchall()
        ]


@router.post("/rooms")
def add_room(payload: RoomCreate):
    try:
        with connection() as db:
            cur = db.execute(
                "INSERT INTO rooms(name,category) VALUES (?,?)",
                (payload.name.strip(), payload.category.strip()),
            )
            return {"id": cur.lastrowid, "name": payload.name}
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Room name already exists")


@router.get("/calendar")
def calendar(start: str, end: str):
    days = dates_between(start, end)
    with connection() as db:
        rooms = [
            dict(r) for r in db.execute(
                "SELECT * FROM rooms WHERE active=1 ORDER BY id"
            ).fetchall()
        ]
        blocks = [
            dict(r) for r in db.execute(
                """
                SELECT room_id, day FROM room_days
                WHERE day >= ? AND day < ? AND blocked=1
                """, (start, end)
            ).fetchall()
        ]
        reservations = [
            dict(r) for r in db.execute(
                """
                SELECT * FROM room_reservations
                WHERE status='Confirmed'
                AND check_in < ? AND check_out > ?
                ORDER BY check_in
                """, (end, start)
            ).fetchall()
        ]

    return {
        "rooms": rooms,
        "days": days,
        "blocks": blocks,
        "reservations": reservations,
    }


@router.post("/blocks")
def update_blocks(payload: BlockRequest):
    days = dates_between(payload.start, payload.end)

    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            for room_id in set(payload.room_ids):
                ensure_room(db, room_id)

                if payload.blocked:
                    overlap = db.execute(
                        """
                        SELECT id FROM room_reservations
                        WHERE room_id=? AND status='Confirmed'
                        AND check_in < ? AND check_out > ?
                        LIMIT 1
                        """,
                        (room_id, payload.end, payload.start),
                    ).fetchone()

                    if overlap:
                        raise HTTPException(
                            409,
                            "Cannot block dates with confirmed reservations"
                        )

                for day in days:
                    db.execute(
                        """
                        INSERT INTO room_days(room_id,day,blocked)
                        VALUES (?,?,?)
                        ON CONFLICT(room_id,day)
                        DO UPDATE SET blocked=excluded.blocked
                        """,
                        (room_id, day, int(payload.blocked)),
                    )

            db.commit()
        except Exception:
            db.rollback()
            raise

    return {"success": True, "updated_days": len(days)}


@router.post("/reservations")
def create_reservation(payload: ReservationCreate):
    days = dates_between(payload.check_in, payload.check_out)

    if date.fromisoformat(payload.check_in) < date.today():
        raise HTTPException(422, "Check-in cannot be in the past")

    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            ensure_room(db, payload.room_id)

            blocked = db.execute(
                """
                SELECT day FROM room_days
                WHERE room_id=? AND blocked=1
                AND day>=? AND day<?
                LIMIT 1
                """,
                (payload.room_id, payload.check_in, payload.check_out),
            ).fetchone()

            if blocked:
                raise HTTPException(
                    409, f"Room is blocked on {blocked['day']}"
                )

            overlap = db.execute(
                """
                SELECT id FROM room_reservations
                WHERE room_id=? AND status='Confirmed'
                AND check_in < ? AND check_out > ?
                LIMIT 1
                """,
                (payload.room_id, payload.check_out, payload.check_in),
            ).fetchone()

            if overlap:
                raise HTTPException(
                    409, "Room is already reserved for these dates"
                )

            cur = db.execute(
                """
                INSERT INTO room_reservations
                (room_id,guest,email,check_in,check_out)
                VALUES (?,?,?,?,?)
                """,
                (
                    payload.room_id,
                    payload.guest.strip(),
                    payload.email.strip(),
                    payload.check_in,
                    payload.check_out,
                ),
            )
            db.commit()
            return {"id": cur.lastrowid, "status": "Confirmed"}
        except Exception:
            db.rollback()
            raise


@router.get("/reservations")
def list_reservations():
    with connection() as db:
        return [
            dict(r) for r in db.execute(
                """
                SELECT b.*, r.name AS room_name
                FROM room_reservations b
                JOIN rooms r ON r.id=b.room_id
                ORDER BY b.created_at DESC, b.id DESC
                """
            ).fetchall()
        ]


@router.post("/reservations/{reservation_id}/cancel")
def cancel_reservation(reservation_id: int):
    with connection() as db:
        cur = db.execute(
            """
            UPDATE room_reservations
            SET status='Cancelled'
            WHERE id=? AND status='Confirmed'
            """,
            (reservation_id,),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Active reservation not found")
    return {"success": True}
