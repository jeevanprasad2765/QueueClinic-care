# 🏥 QueueCare — Smart Clinic Appointment System

A hackathon MVP that replaces fixed slots and paper queues with **ML-powered overbooking**, **live wait-time estimates**, and a **real-time clinic dashboard**.

## Problem

Clinics run on fixed slots and paper queues. Patients wait without knowing how long, and no-shows leave doctors idle while other patients wait.

## Key Features

| Feature | Description |
|---|---|
| **Patient Booking** | Enter name, age, phone, symptoms. Auto-triage suggests department & urgency. Pick doctor, date, and 30-min slot. Get a token ticket. |
| **Smart Overbooking** (USP) | Gradient-boosting model predicts no-show probability. If a slot's no-show risk ≥ 50%, it accepts one extra booking. |
| **Live Queue & Wait Time** | Real-time queue position, patients ahead, and estimated wait. Urgent patients sort first. Not-yet-arrived patients weighted by show-up probability. |
| **Duration Prediction** | Per-department average consult time, scaled for age ≥ 60 and urgent cases. Updated with exponential moving average (70/30) on each completed consult. |
| **Clinic Dashboard** | Staff picks a doctor → sees today's queue with urgency, predicted duration, no-show risk, and action buttons. WebSocket pushes instant updates. |

## Tech Stack

- **Frontend**: React (Vite) — no UI library, just CSS
- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **ML**: scikit-learn GradientBoostingClassifier

## Quick Start (Two Commands)

### Prerequisites
- Python 3.10+ with pip
- Node.js 18+ with npm

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```

**Or on Windows, just double-click:**
1. `start-backend.bat`
2. `start-frontend.bat`

Then open **http://localhost:5173** in your browser.

## Project Structure

```
queuecare/
├── backend/
│   ├── main.py           # FastAPI app — all endpoints & WebSocket
│   ├── ml.py             # No-show prediction model (scikit-learn)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── index.html        # HTML with Google Fonts
│   └── src/
│       ├── App.jsx       # Main app with tab navigation
│       ├── App.css       # Complete stylesheet
│       ├── api.js        # API helper functions
│       ├── components/
│       │   ├── BookTab.jsx    # Multi-step booking flow
│       │   ├── TrackTab.jsx   # Patient tracking page
│       │   ├── ClinicTab.jsx  # Staff dashboard
│       │   └── TokenCard.jsx  # Ticket-style token card
│       └── hooks/
│           └── useWebSocket.js # WebSocket + polling fallback
├── start-backend.bat     # One-click backend launcher
├── start-frontend.bat    # One-click frontend launcher
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/triage` | Analyse symptoms → suggest department & urgency |
| `GET` | `/api/doctors` | List doctors (optionally filter by `?dept=`) |
| `GET` | `/api/slots?doctor_id=&date=` | Available slots with overbooking logic |
| `POST` | `/api/appointments` | Book an appointment |
| `GET` | `/api/appointments/{id}` | Get appointment details |
| `GET` | `/api/queue/{doctor_id}` | Live queue with wait times |
| `PATCH` | `/api/appointments/{id}/status` | Update status (arrived/in_consult/completed/no_show) |
| `WS` | `/ws/{doctor_id}` | WebSocket for live queue refresh signals |

## ML Model

The no-show model uses 5 features:

1. **lead_days** — days between booking and appointment
2. **age** — patient age
3. **prior_no_shows** — past no-shows for this phone number
4. **hour** — appointment hour
5. **reminder_sent** — whether a reminder was sent

It trains on synthetic data on first run. See `ml.py` for instructions on swapping in the [Kaggle Medical Appointment No Shows dataset](https://www.kaggle.com/datasets/joniarroba/noshowappointments).

## Design

- **Palette**: Ink `#12313A`, Background `#F3F7F6`, Teal `#1F7A72`, Amber `#D98E04`, Red `#C2412D`
- **Fonts**: Bricolage Grotesque (headings), Atkinson Hyperlegible (body — accessibility-focused)
- **Standout**: Ticket-style token card with notched edges

## Team

Built for Hackathon 2026 🚀
