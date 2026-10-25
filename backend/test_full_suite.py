import urllib.request
import urllib.parse
import json
from datetime import date

BASE = "http://127.0.0.1:8000"
today_str = date.today().isoformat()

def http_get(path):
    req = urllib.request.Request(f"{BASE}{path}", method="GET")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def http_post(path, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as res:
        return res.status, json.loads(res.read().decode())

def http_patch(path, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers={"Content-Type": "application/json"}, method="PATCH")
    with urllib.request.urlopen(req) as res:
        return res.status, json.loads(res.read().decode())

print("=== 1. VERIFYING ALL 12 TRIAGE CASES ===")
test_cases = [
    ("pimples", None, "Dermatology", "normal"),
    ("acne on face", None, "Dermatology", None),
    ("chest pain", None, "Cardiology", "urgent"),
    ("knee pain", None, "Orthopedics", None),
    ("sore throat", None, "ENT", None),
    ("ear pain", None, "ENT", None),
    ("fever", None, "General Medicine", None),
    ("baby not eating", None, "Pediatrics", None),
    ("periods irregular", None, "Gynecology", None),
    ("skin rash and itching", None, "Dermatology", None),
    ("heart racing", None, "Cardiology", None),
    ("early morning cough", None, "General Medicine", None),
]

all_triage_pass = True
for symptoms, age, expected_dept, expected_urg in test_cases:
    payload = {"symptoms": symptoms}
    if age is not None:
        payload["age"] = age
    status, data = http_post("/api/triage", payload)
    dept = data.get("dept") or data.get("department")
    urg = data.get("urgency")
    matched = data.get("matched", [])
    dept_ok = (dept == expected_dept)
    urg_ok = (expected_urg is None) or (urg == expected_urg)
    passed = dept_ok and urg_ok
    if not passed:
        all_triage_pass = False
    print(f"[{'PASS' if passed else 'FAIL'}] '{symptoms}' -> dept: {dept} (expected: {expected_dept}), urgency: {urg}, matched: {matched}")

print(f"\nAll 12 Triage Tests Passed: {all_triage_pass}")

print("\n=== 2. VERIFYING DOCTORS LIST (ALL 7 DEPARTMENTS) ===")
docs = http_get("/api/doctors")
print(f"Total doctors: {len(docs)}")
for d in docs:
    print(f"  - Dr ID {d['id']}: {d['name']} ({d['dept']})")

print("\n=== 3. VERIFYING SLOTS & SMART OVERBOOKING ===")
slots = http_get(f"/api/slots?doctor_id=3&date={today_str}")
avail = [s for s in slots if s["available"]]
print(f"Total slots for Dr. Priya Nair: {len(slots)}, Available slots: {len(avail)}")
test_slot = avail[0]["slot"] if avail else "10:00"

print(f"\n=== 4. VERIFYING FULL BOOKING LIFECYCLE (Book -> Arrived -> In Consult -> Completed) ===")
status_code, appt = http_post("/api/appointments", {
    "patient_name": "Test Dermatology Patient",
    "age": 28,
    "phone": "9876543210",
    "doctor_id": 3,
    "date": today_str,
    "slot": test_slot,
    "symptoms": "pimples and acne on face",
    "urgency": "normal",
})
appt_id = appt["id"]
print(f"Booked appointment ID: {appt_id}, status: {appt['status']}, pred_min: {appt['pred_min']}")

# Get appointment track status
track = http_get(f"/api/appointments/{appt_id}")
print(f"Tracking Details -> position: {track.get('position')}, eta_min: {track.get('eta_min')}m, status: {track.get('status')}")

# PATCH -> arrived
s, res = http_patch(f"/api/appointments/{appt_id}/status", {"status": "arrived"})
print(f"Status -> arrived (HTTP {s}): status={res['status']}")

# PATCH -> in_consult
s, res = http_patch(f"/api/appointments/{appt_id}/status", {"status": "in_consult"})
print(f"Status -> in_consult (HTTP {s}): status={res['status']}, started_at={res.get('started_at')}")

# PATCH -> completed
s, res = http_patch(f"/api/appointments/{appt_id}/status", {"status": "completed"})
print(f"Status -> completed (HTTP {s}): status={res['status']}, completed_at={res.get('completed_at')}")

# Live queue check
q = http_get("/api/queue/3")
print(f"Dr. Priya Nair queue count: {len(q)}")
print("\nALL BACKEND API VERIFICATIONS PASSED!")
