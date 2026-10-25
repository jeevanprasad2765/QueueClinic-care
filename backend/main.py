"""
main.py — QueueCare Backend API
=================================
FastAPI server with SQLite, WebSocket live-updates, ML-powered scheduling,
staff authentication (JWT + bcrypt), and patient privacy protections.

Run with:  uvicorn main:app --reload --port 8000
"""

import sqlite3
import os
import re
import random
import string
from datetime import datetime, timedelta, date as date_type
from contextlib import contextmanager
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from jose import jwt, JWTError

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from ml import load_model, predict_no_show

# ═══════════════════════════════════════════════════════════════════════════
# Environment & App Setup
# ═══════════════════════════════════════════════════════════════════════════

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "queuecare_jwt_super_secret_key_2026_x7a9")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

app = FastAPI(title="QueueCare API", version="1.1.0")

# Allow the React frontend to call our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "queuecare.db")

# Load the ML model once at startup
model = load_model()


# ═══════════════════════════════════════════════════════════════════════════
# Security & Password Helpers
# ═══════════════════════════════════════════════════════════════════════════

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using bcrypt with random salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

# Rate limiting for staff login: 5 failed attempts -> 5 min lock
login_attempts: dict[str, dict] = {}

def check_rate_limit(username: str):
    now = datetime.now()
    record = login_attempts.get(username)
    if record and record.get("locked_until"):
        if now < record["locked_until"]:
            remaining = int((record["locked_until"] - now).total_seconds())
            mins = max(1, remaining // 60)
            raise HTTPException(
                status_code=429,
                detail=f"Account temporarily locked due to too many failed attempts. Try again in {mins} minute(s)."
            )
        else:
            login_attempts[username] = {"attempts": 0, "locked_until": None}

def record_failed_attempt(username: str):
    now = datetime.now()
    if username not in login_attempts:
        login_attempts[username] = {"attempts": 1, "locked_until": None}
    else:
        login_attempts[username]["attempts"] += 1

    if login_attempts[username]["attempts"] >= 5:
        login_attempts[username]["locked_until"] = now + timedelta(minutes=5)

def reset_failed_attempts(username: str):
    login_attempts.pop(username, None)

def require_staff(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """FastAPI dependency to protect staff-only endpoints."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    with get_db() as db:
        user = db.execute(
            "SELECT id, username, name, role FROM staff WHERE LOWER(username) = ?",
            (username.strip().lower(),)
        ).fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Staff account not found"
            )
        return dict(user)

def generate_token_id() -> str:
    """Generate unguessable random booking token e.g. QC-7F3K9."""
    chars = ''.join(c for c in string.ascii_uppercase + string.digits if c not in '01IO')
    return f"QC-{''.join(random.choices(chars, k=5))}"


# ═══════════════════════════════════════════════════════════════════════════
# Database Helpers
# ═══════════════════════════════════════════════════════════════════════════

@contextmanager
def get_db():
    """Context manager for database connections with dict-like row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create tables and seed initial data on startup."""
    with get_db() as db:
        # Staff Table
        db.execute("""
            CREATE TABLE IF NOT EXISTS staff (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name          TEXT NOT NULL,
                role          TEXT NOT NULL DEFAULT 'staff'
            );
        """)

        # Doctors Table
        db.execute("""
            CREATE TABLE IF NOT EXISTS doctors (
                id   INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                dept TEXT NOT NULL
            );
        """)

        # Department Stats Table
        db.execute("""
            CREATE TABLE IF NOT EXISTS dept_stats (
                dept    TEXT PRIMARY KEY,
                avg_min REAL NOT NULL
            );
        """)

        # Appointments Table with TEXT PRIMARY KEY (Tokens like QC-7F3K9)
        col_info = db.execute("PRAGMA table_info(appointments)").fetchall()
        id_col = next((c for c in col_info if c["name"] == "id"), None)
        if id_col and "INT" in id_col["type"].upper():
            db.executescript("""
                CREATE TABLE appointments_new (
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
                );
                INSERT OR IGNORE INTO appointments_new
                SELECT 'QC-' || substr('0000' || id, -5), patient_name, age, phone, doctor_id, date, slot, symptoms, urgency, status, no_show_prob, pred_min, started_at, completed_at
                FROM appointments;
                DROP TABLE appointments;
                ALTER TABLE appointments_new RENAME TO appointments;
            """)
        else:
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
                );
            """)

        # Seed staff accounts if empty
        if db.execute("SELECT COUNT(*) FROM staff").fetchone()[0] == 0:
            admin_user = os.getenv("DEFAULT_ADMIN_USER", "admin")
            admin_pass = os.getenv("DEFAULT_ADMIN_PASS", "Clinic@123")
            admin_name = os.getenv("DEFAULT_ADMIN_NAME", "Clinic Admin")

            rec_user = os.getenv("DEFAULT_RECEPTION_USER", "reception")
            rec_pass = os.getenv("DEFAULT_RECEPTION_PASS", "Desk@123")
            rec_name = os.getenv("DEFAULT_RECEPTION_NAME", "Front Desk")

            db.execute("""
                INSERT INTO staff (username, password_hash, name, role)
                VALUES (?, ?, ?, 'admin')
            """, (admin_user, hash_password(admin_pass), admin_name))

            db.execute("""
                INSERT INTO staff (username, password_hash, name, role)
                VALUES (?, ?, ?, 'reception')
            """, (rec_user, hash_password(rec_pass), rec_name))

        # Seed 7 doctors
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

        # Seed base consultation times per department (minutes)
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


# ═══════════════════════════════════════════════════════════════════════════
# Slot Configuration
# ═══════════════════════════════════════════════════════════════════════════

ALL_SLOTS = []
for h in range(9, 17):
    for m in (0, 30):
        if h == 16 and m == 30:
            continue
        if 13 <= h < 14:
            continue
        ALL_SLOTS.append(f"{h:02d}:{m:02d}")


# ═══════════════════════════════════════════════════════════════════════════
# Triage Engine
# ═══════════════════════════════════════════════════════════════════════════

TRIAGE = {
    "Dermatology": ["pimple","acne","rash","itch","itching","skin","eczema","psoriasis","hair fall","hair loss","dandruff","wart","mole","fungal","ringworm","hives","blister","boil","sunburn","dark spot","scar","nail","pigmentation","allergy"],
    "Cardiology": ["chest pain","palpitation","heart","blood pressure","bp","hypertension","cholesterol","heartbeat"],
    "Orthopedics": ["bone","joint","fracture","back pain","knee","sprain","shoulder","neck pain","muscle","ankle","hip","arthritis","spine","wrist","leg pain"],
    "ENT": ["ear","earache","throat","sore throat","nose","sinus","hearing","tonsil","runny nose","blocked nose","hoarse","snoring"],
    "Pediatrics": ["child","baby","infant","toddler","kid","newborn","vaccination"],
    "Gynecology": ["pregnant","pregnancy","period","periods","menstrual","pcos"],
}
URGENT = ["chest pain","breathless","shortness of breath","can't breathe","unconscious","severe bleeding","stroke","seizure","fainting","vomiting blood"]

def has(text, kw):
    return re.search(r"\b" + re.escape(kw) + r"s?\b", text) is not None

def triage_text(symptoms: str, age: Optional[int] = None):
    s = re.sub(r"[^a-z0-9' ]", " ", symptoms.lower())
    scores = {d: [k for k in kws if has(s, k)] for d, kws in TRIAGE.items()}
    best = max(scores, key=lambda d: len(scores[d]))
    dept = best if scores[best] else ("Pediatrics" if age is not None and age <= 12 else "General Medicine")
    urgency = "urgent" if any(has(s, k) for k in URGENT) else "normal"
    return {"dept": dept, "urgency": urgency, "matched": scores[best]}


# ═══════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str
    password: str

class TriageRequest(BaseModel):
    symptoms: str
    age: Optional[int] = None

class BookingRequest(BaseModel):
    patient_name: str
    age: int
    phone: str
    doctor_id: int
    date: str           # YYYY-MM-DD
    slot: str           # HH:MM
    symptoms: str
    urgency: str = "normal"

class StatusUpdate(BaseModel):
    status: str         # arrived | in_consult | completed | no_show


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket Connection Manager
# ═══════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, list[WebSocket]] = {}

    async def connect(self, doctor_id: int, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(doctor_id, []).append(ws)

    def disconnect(self, doctor_id: int, ws: WebSocket):
        if doctor_id in self.connections:
            self.connections[doctor_id] = [c for c in self.connections[doctor_id] if c != ws]

    async def broadcast(self, doctor_id: int):
        """Sends ONLY a signal to refresh. Never broadcasts patient private data."""
        if doctor_id not in self.connections:
            return
        dead = []
        for ws in self.connections[doctor_id]:
            try:
                await ws.send_json({"type": "refresh"})
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections[doctor_id] = [c for c in self.connections[doctor_id] if c != ws]

ws_manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

def get_dept_avg(db, dept: str) -> float:
    row = db.execute("SELECT avg_min FROM dept_stats WHERE dept = ?", (dept,)).fetchone()
    return row["avg_min"] if row else 15.0

def compute_pred_min(base_avg: float, age: int, urgency: str) -> float:
    duration = base_avg
    if age >= 60:
        duration *= 1.25
    if urgency == "urgent":
        duration *= 1.3
    return round(duration, 1)

def get_prior_no_shows(db, phone: str) -> int:
    row = db.execute(
        "SELECT COUNT(*) as cnt FROM appointments WHERE phone = ? AND status = 'no_show'",
        (phone,),
    ).fetchone()
    return row["cnt"]

def get_queue_data(doctor_id: int, date: Optional[str] = None) -> list:
    """Core calculation for live doctor queue and wait times."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    with get_db() as db:
        rows = db.execute(
            """SELECT a.*, d.name AS doctor_name, d.dept
               FROM appointments a
               JOIN doctors d ON a.doctor_id = d.id
               WHERE a.doctor_id = ? AND a.date = ?
               ORDER BY
                   CASE a.status
                       WHEN 'in_consult' THEN 0
                       WHEN 'arrived'    THEN 1
                       WHEN 'booked'     THEN 2
                       WHEN 'completed'  THEN 3
                       WHEN 'no_show'    THEN 4
                   END,
                   CASE a.urgency WHEN 'urgent' THEN 0 ELSE 1 END,
                   a.slot""",
            (doctor_id, date),
        ).fetchall()

        queue = []
        cumulative_wait = 0.0

        for row in rows:
            r = dict(row)
            if r["status"] == "in_consult":
                if r["started_at"]:
                    elapsed = (datetime.now() - datetime.fromisoformat(r["started_at"])).total_seconds() / 60
                    remaining = max(0, r["pred_min"] - elapsed)
                else:
                    remaining = r["pred_min"]
                cumulative_wait = remaining
                r["wait_min"] = 0
                r["eta_min"] = 0

            elif r["status"] in ("arrived", "booked"):
                r["wait_min"] = round(cumulative_wait, 1)
                r["eta_min"] = round(cumulative_wait, 1)
                if r["status"] == "booked":
                    cumulative_wait += r["pred_min"] * (1 - r["no_show_prob"])
                else:
                    cumulative_wait += r["pred_min"]
            else:
                r["wait_min"] = 0
                r["eta_min"] = 0

            queue.append(r)
        return queue


# ═══════════════════════════════════════════════════════════════════════════
# Startup Event
# ═══════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
def startup():
    init_db()
    print("[OK] QueueCare API ready — staff auth enabled & database initialised")


# ═══════════════════════════════════════════════════════════════════════════
# Staff Authentication Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """
    Authenticate clinic staff. Returns 8-hour JWT.
    Enforces a 5-minute lockout after 5 consecutive failed attempts.
    """
    username = req.username.strip().lower()
    check_rate_limit(username)

    with get_db() as db:
        user = db.execute(
            "SELECT * FROM staff WHERE LOWER(username) = ?",
            (username,)
        ).fetchone()

    if not user or not verify_password(req.password, user["password_hash"]):
        record_failed_attempt(username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    reset_failed_attempts(username)

    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    token_payload = {
        "sub": user["username"],
        "name": user["name"],
        "role": user["role"],
        "exp": expire,
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "name": user["name"],
        "role": user["role"],
        "username": user["username"],
    }

@app.get("/api/auth/me")
def get_current_user(staff=Depends(require_staff)):
    """Return currently authenticated staff profile."""
    return staff


# ═══════════════════════════════════════════════════════════════════════════
# Public Patient Endpoints
# ═══════════════════════════════════════════════════════════════════════════

# ── 1. Triage ─────────────────────────────────────────────────────────────

@app.post("/api/triage")
def triage(req: TriageRequest):
    """Analyse symptoms text → suggest a department and urgency level."""
    res = triage_text(req.symptoms, req.age)
    return {
        "dept": res["dept"],
        "department": res["dept"],
        "urgency": res["urgency"],
        "matched": res["matched"],
    }


# ── 2. List Doctors ───────────────────────────────────────────────────────

@app.get("/api/doctors")
def list_doctors(dept: Optional[str] = None):
    """Public list of active doctors and departments."""
    with get_db() as db:
        if dept:
            rows = db.execute("SELECT id, name, dept FROM doctors WHERE dept = ?", (dept,)).fetchall()
        else:
            rows = db.execute("SELECT id, name, dept FROM doctors ORDER BY dept").fetchall()
        return [dict(r) for r in rows]


# ── 3. Available Slots (strictly capacity data, zero patient info) ────────

@app.get("/api/slots")
def get_slots(doctor_id: int, date: str):
    """Public slot availability with smart overbooking."""
    with get_db() as db:
        bookings = db.execute(
            """SELECT slot, no_show_prob FROM appointments
               WHERE doctor_id = ? AND date = ? AND status NOT IN ('no_show', 'completed')""",
            (doctor_id, date),
        ).fetchall()

        slot_data = {s: {"count": 0, "no_show_sum": 0.0} for s in ALL_SLOTS}
        for b in bookings:
            s = b["slot"]
            if s in slot_data:
                slot_data[s]["count"] += 1
                slot_data[s]["no_show_sum"] += b["no_show_prob"]

        result = []
        for s in ALL_SLOTS:
            info = slot_data[s]
            capacity = 2 if info["no_show_sum"] >= 0.5 else 1
            result.append({
                "slot":        s,
                "available":   info["count"] < capacity,
                "booked":      info["count"],
                "capacity":    capacity,
                "high_demand": info["count"] > 0 and capacity == 2,
            })
        return result


# ── 4. Create Appointment ────────────────────────────────────────────────

@app.post("/api/appointments", status_code=201)
async def create_appointment(req: BookingRequest):
    """Book a new appointment with an unguessable token ID (e.g. QC-7F3K9)."""
    with get_db() as db:
        # Check slot capacity
        existing = db.execute(
            """SELECT no_show_prob FROM appointments
               WHERE doctor_id = ? AND date = ? AND slot = ?
                 AND status NOT IN ('no_show', 'completed')""",
            (req.doctor_id, req.date, req.slot),
        ).fetchall()

        count = len(existing)
        no_show_sum = sum(e["no_show_prob"] for e in existing)
        capacity = 2 if no_show_sum >= 0.5 else 1

        if count >= capacity:
            raise HTTPException(
                status_code=409,
                detail=f"Slot {req.slot} on {req.date} is fully booked. Please choose another slot.",
            )

        # Compute no-show probability
        try:
            appt_date = datetime.strptime(req.date, "%Y-%m-%d").date()
            lead_days = max(0, (appt_date - date_type.today()).days)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        prior = get_prior_no_shows(db, req.phone)
        hour = int(req.slot.split(":")[0])
        no_show_prob = predict_no_show(model, lead_days, req.age, prior, hour)

        # Compute predicted consultation duration
        doctor = db.execute("SELECT dept FROM doctors WHERE id = ?", (req.doctor_id,)).fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found.")

        dept_avg = get_dept_avg(db, doctor["dept"])
        pred_min = compute_pred_min(dept_avg, req.age, req.urgency)

        # Generate unique random token ID
        token_id = generate_token_id()

        db.execute(
            """INSERT INTO appointments
                   (id, patient_name, age, phone, doctor_id, date, slot,
                    symptoms, urgency, status, no_show_prob, pred_min)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?)""",
            (token_id, req.patient_name, req.age, req.phone, req.doctor_id,
             req.date, req.slot, req.symptoms, req.urgency,
             no_show_prob, pred_min),
        )

    # Notify staff live dashboards via WebSocket
    await ws_manager.broadcast(req.doctor_id)

    with get_db() as db:
        appt = db.execute("SELECT * FROM appointments WHERE id = ?", (token_id,)).fetchone()
        return dict(appt)


# ── 5. Get Single Appointment (Protected Patient Tracking) ───────────────

@app.get("/api/appointments/{appt_id}")
def get_appointment(appt_id: str, phone: Optional[str] = Query(None)):
    """
    Public patient tracking endpoint.
    Requires ?phone=... to protect patient privacy.
    Returns 404 with generic message if ID not found OR phone doesn't match.
    Does NOT leak other patients' names, ages, phones, or symptoms.
    """
    if not phone or not phone.strip():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We couldn't find a booking with those details."
        )

    clean_query = re.sub(r"\D", "", phone.strip())

    with get_db() as db:
        row = db.execute(
            """SELECT a.*, d.name AS doctor_name, d.dept
               FROM appointments a
               JOIN doctors d ON a.doctor_id = d.id
               WHERE a.id = ?""",
            (appt_id.strip(),),
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="We couldn't find a booking with those details."
            )

        clean_db = re.sub(r"\D", "", row["phone"])
        if clean_query != clean_db and phone.strip().lower() != row["phone"].strip().lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="We couldn't find a booking with those details."
            )

        appt = dict(row)

    # Compute live queue position and wait time
    q = get_queue_data(appt["doctor_id"], appt["date"])
    active = [p for p in q if p["status"] in ("in_consult", "arrived", "booked")]
    pos = 1
    eta = 0.0
    for idx, p in enumerate(active, 1):
        if p["id"] == appt["id"]:
            pos = idx
            eta = p.get("eta_min", p.get("wait_min", 0.0))
            break

    # Strictly return only their own booking data and high-level queue metrics
    return {
        "id": appt["id"],
        "doctor_id": appt["doctor_id"],
        "patient_name": appt["patient_name"],
        "doctor_name": appt["doctor_name"],
        "dept": appt["dept"],
        "date": appt["date"],
        "slot": appt["slot"],
        "urgency": appt["urgency"],
        "status": appt["status"],
        "eta_min": eta,
        "wait_min": eta,
        "position": pos,
        "patients_ahead": max(0, pos - 1),
        "total_in_queue": len(active) if active else 1,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Staff-Only Protected Endpoints (Require Bearer Token)
# ═══════════════════════════════════════════════════════════════════════════

# ── 6. Live Queue for Staff ──────────────────────────────────────────────

@app.get("/api/queue/{doctor_id}")
def get_queue(doctor_id: int, date: Optional[str] = None, staff=Depends(require_staff)):
    """Staff-only live queue endpoint. Returns full patient queue."""
    return get_queue_data(doctor_id, date)


# ── 7. Update Appointment Status ─────────────────────────────────────────

@app.patch("/api/appointments/{appt_id}/status")
async def update_status(appt_id: str, req: StatusUpdate, staff=Depends(require_staff)):
    """
    Staff-only endpoint to transition appointment status.
    Updates department running average consultation time via EMA on 'completed'.
    """
    valid = {"arrived", "in_consult", "completed", "no_show"}
    if req.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")

    with get_db() as db:
        appt = db.execute(
            """SELECT a.*, d.dept FROM appointments a
               JOIN doctors d ON a.doctor_id = d.id
               WHERE a.id = ?""",
            (appt_id,),
        ).fetchone()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")

        doctor_id = appt["doctor_id"]
        now_iso = datetime.now().isoformat()

        if req.status == "in_consult":
            db.execute(
                "UPDATE appointments SET status = ?, started_at = ? WHERE id = ?",
                (req.status, now_iso, appt_id),
            )
        elif req.status == "completed":
            db.execute(
                "UPDATE appointments SET status = ?, completed_at = ? WHERE id = ?",
                (req.status, now_iso, appt_id),
            )
            if appt["started_at"]:
                actual_min = (datetime.now() - datetime.fromisoformat(appt["started_at"])).total_seconds() / 60
                old_avg = get_dept_avg(db, appt["dept"])
                new_avg = round(0.7 * old_avg + 0.3 * actual_min, 1)
                db.execute(
                    "UPDATE dept_stats SET avg_min = ? WHERE dept = ?",
                    (new_avg, appt["dept"]),
                )
        else:
            db.execute(
                "UPDATE appointments SET status = ? WHERE id = ?",
                (req.status, appt_id),
            )

    await ws_manager.broadcast(doctor_id)

    with get_db() as db:
        updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,)).fetchone()
        return dict(updated)


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket Endpoint (Public Notification Channel)
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/{doctor_id}")
async def websocket_endpoint(ws: WebSocket, doctor_id: int):
    """
    Live connection for queue updates.
    Sends only {"type": "refresh"} signals. Staff data is fetched over authenticated HTTPS.
    """
    await ws_manager.connect(doctor_id, ws)
    try:
        while True:
            await ws.receive_text()
            await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(doctor_id, ws)
