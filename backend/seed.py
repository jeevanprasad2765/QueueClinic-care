"""
seed.py — Database seeder for QueueCare
Seeds doctors, department stats, staff accounts, and sample appointments.
"""

import os
import sqlite3
import random
import string
from datetime import datetime
import bcrypt
from dotenv import load_dotenv

# Load .env configuration
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'queuecare.db')

DEFAULT_ADMIN_USER = os.getenv('DEFAULT_ADMIN_USER', 'admin')
DEFAULT_ADMIN_PASS = os.getenv('DEFAULT_ADMIN_PASS', 'Clinic@123')
DEFAULT_ADMIN_NAME = os.getenv('DEFAULT_ADMIN_NAME', 'Clinic Admin')

DEFAULT_RECEPTION_USER = os.getenv('DEFAULT_RECEPTION_USER', 'reception')
DEFAULT_RECEPTION_PASS = os.getenv('DEFAULT_RECEPTION_PASS', 'Desk@123')
DEFAULT_RECEPTION_NAME = os.getenv('DEFAULT_RECEPTION_NAME', 'Front Desk')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_token_id():
    chars = ''.join(c for c in string.ascii_uppercase + string.digits if c not in '01IO')
    return f"QC-{''.join(random.choices(chars, k=5))}"


def seed():
    with get_db() as db:
        # 1. Ensure staff table exists
        db.execute("""
            CREATE TABLE IF NOT EXISTS staff (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name          TEXT NOT NULL,
                role          TEXT NOT NULL DEFAULT 'staff'
            )
        """)

        # 2. Seed staff accounts
        admin_hash = hash_password(DEFAULT_ADMIN_PASS)
        reception_hash = hash_password(DEFAULT_RECEPTION_PASS)

        db.execute("""
            INSERT INTO staff (username, password_hash, name, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                name = excluded.name,
                role = excluded.role
        """, (DEFAULT_ADMIN_USER, admin_hash, DEFAULT_ADMIN_NAME, 'admin'))

        db.execute("""
            INSERT INTO staff (username, password_hash, name, role)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                name = excluded.name,
                role = excluded.role
        """, (DEFAULT_RECEPTION_USER, reception_hash, DEFAULT_RECEPTION_NAME, 'reception'))

        print(f"Seeded staff accounts: '{DEFAULT_ADMIN_USER}' and '{DEFAULT_RECEPTION_USER}'")

        # 3. Seed doctors if empty
        doctors = [
            (1, "Dr. Ananya Sharma", "General Medicine"),
            (2, "Dr. Rajesh Kumar",  "Cardiology"),
            (3, "Dr. Priya Nair",    "Dermatology"),
            (4, "Dr. Vikram Singh",  "Orthopedics"),
            (5, "Dr. Meera Patel",   "ENT"),
            (6, "Dr. Arjun Reddy",   "Pediatrics"),
            (7, "Dr. Kavya Rao",     "Gynecology"),
        ]
        db.executemany("INSERT OR REPLACE INTO doctors VALUES (?,?,?)", doctors)

        stats = [
            ("General Medicine", 10.0),
            ("Cardiology",       18.0),
            ("Dermatology",       8.0),
            ("Orthopedics",      15.0),
            ("ENT",              10.0),
            ("Pediatrics",       12.0),
            ("Gynecology",       15.0),
        ]
        db.executemany("INSERT OR REPLACE INTO dept_stats VALUES (?,?)", stats)

        # 4. Ensure appointments table exists with TEXT id
        db.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id           TEXT PRIMARY KEY,
                patient_name TEXT NOT NULL,
                age          INTEGER NOT NULL,
                phone        TEXT NOT NULL,
                doctor_id    INTEGER NOT NULL REFERENCES doctors(id),
                date         TEXT NOT NULL,
                slot         TEXT NOT NULL,
                symptoms     TEXT,
                urgency      TEXT DEFAULT 'normal',
                status       TEXT DEFAULT 'booked',
                no_show_prob REAL DEFAULT 0.0,
                pred_min     REAL DEFAULT 15.0,
                started_at   TEXT,
                completed_at TEXT
            )
        """)

        today = datetime.today().date().isoformat()
        sample_patients = [
            ("Aarav Patel", 32, "9876543210", 2, "09:00", "mild palpitations", "normal", "arrived", 0.12, 18.0),
            ("Sunita Rao", 64, "9876543211", 2, "09:30", "chest pain radiating to arm", "urgent", "in_consult", 0.08, 29.2),
            ("Rohan Gupta", 24, "9876543212", 3, "10:00", "severe acne breakouts on cheeks", "normal", "booked", 0.15, 8.0),
            ("Meenakshi Iyer", 45, "9876543213", 3, "10:30", "skin rash and itching", "normal", "booked", 0.22, 8.0),
            ("Vikram Malhotra", 58, "9876543214", 4, "11:00", "knee joint pain after walking", "normal", "arrived", 0.10, 15.0),
            ("Kavita Nair", 29, "9876543215", 7, "11:30", "irregular periods and cramps", "normal", "booked", 0.18, 15.0),
            ("Baby Anaya", 3, "9876543216", 6, "12:00", "fever and not eating food", "normal", "booked", 0.10, 12.0),
            ("Rajesh Varma", 62, "9876543217", 5, "14:00", "sore throat and earache", "normal", "booked", 0.14, 12.5),
            ("Deepa Sen", 38, "9876543218", 1, "14:30", "high fever and fatigue", "normal", "booked", 0.20, 10.0),
            ("Manoj Kumar", 51, "9876543219", 2, "15:00", "elevated blood pressure checkup", "normal", "booked", 0.35, 18.0),
        ]

        for p in sample_patients:
            token = generate_token_id()
            db.execute("""
                INSERT OR IGNORE INTO appointments
                (id, patient_name, age, phone, doctor_id, date, slot, symptoms, urgency, status, no_show_prob, pred_min)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (token, p[0], p[1], p[2], p[3], today, p[4], p[5], p[6], p[7], p[8], p[9]))

        db.commit()
    print("Seeding complete.")


if __name__ == '__main__':
    seed()
