import urllib.request
import urllib.parse
import json

BASE = "http://127.0.0.1:8000"

def request(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode())
        except Exception:
            err_data = {"detail": str(e)}
        return e.code, err_data

print("=== TEST 1: GET /api/queue/1 without token -> expect 401 ===")
status_code, res = request("/api/queue/1")
print(f"Status: {status_code}, Detail: {res.get('detail')}")
assert status_code == 401, f"Expected 401, got {status_code}"

print("\n=== TEST 2: Login with wrong password -> expect 401 ===")
status_code, res = request("/api/auth/login", method="POST", data={"username": "admin", "password": "WrongPassword"})
print(f"Status: {status_code}, Detail: {res.get('detail')}")
assert status_code == 401, f"Expected 401, got {status_code}"
assert res.get("detail") == "Invalid username or password"

print("\n=== TEST 3: Login with correct password -> expect 200 with JWT and staff name ===")
status_code, res = request("/api/auth/login", method="POST", data={"username": "admin", "password": "Clinic@123"})
print(f"Status: {status_code}, Name: {res.get('name')}, Role: {res.get('role')}, Token prefix: {res.get('access_token')[:20]}...")
assert status_code == 200, f"Expected 200, got {status_code}"
assert "access_token" in res
admin_token = res["access_token"]

print("\n=== TEST 4: GET /api/auth/me with Bearer token -> expect 200 ===")
status_code, res = request("/api/auth/me", token=admin_token)
print(f"Status: {status_code}, User: {res}")
assert status_code == 200, f"Expected 200, got {status_code}"
assert res.get("username") == "admin"

print("\n=== TEST 5: GET /api/queue/1 with Bearer token -> expect 200 ===")
status_code, res = request("/api/queue/1", token=admin_token)
print(f"Status: {status_code}, Patients in queue: {len(res)}")
assert status_code == 200, f"Expected 200, got {status_code}"

print("\n=== TEST 6: Book appointment -> expect random token ID (e.g. QC-7F3K9) ===")
from datetime import date
today_str = date.today().isoformat()
_, slots_list = request(f"/api/slots?doctor_id=1&date={today_str}")
avail_slot = next((s["slot"] for s in slots_list if s["available"]), "15:00")

status_code, appt = request("/api/appointments", method="POST", data={
    "patient_name": "Privacy Patient",
    "age": 30,
    "phone": "9988776655",
    "doctor_id": 1,
    "date": today_str,
    "slot": avail_slot,
    "symptoms": "headache and fever",
    "urgency": "normal"
})
print(f"Status: {status_code}, Booking ID: {appt.get('id')}")
assert status_code == 201
booking_id = appt["id"]
assert booking_id.startswith("QC-"), f"Expected ID starting with QC-, got {booking_id}"

print("\n=== TEST 7: GET /api/appointments/<id> with wrong phone -> expect 404 with generic message ===")
status_code, res = request(f"/api/appointments/{booking_id}?phone=1111111111")
print(f"Status: {status_code}, Detail: {res.get('detail')}")
assert status_code in (404, 403), f"Expected 404 or 403, got {status_code}"
assert "patient_name" not in res

print("\n=== TEST 8: GET /api/appointments/<id> with correct phone -> expect 200 and only patient's own data ===")
status_code, res = request(f"/api/appointments/{booking_id}?phone=9988776655")
print(f"Status: {status_code}, Data keys: {list(res.keys())}")
print(f"Patient Name: {res.get('patient_name')}, Position: {res.get('position')}, ETA: {res.get('eta_min')}m, Patients Ahead: {res.get('patients_ahead')}")
assert status_code == 200
assert res.get("patient_name") == "Privacy Patient"
assert "phone" not in res, "Phone should not be leaked in public response"
assert "symptoms" not in res, "Symptoms should not be leaked in public response"

print("\n=== TEST 9: PATCH /api/appointments/<id>/status without token -> expect 401 ===")
status_code, res = request(f"/api/appointments/{booking_id}/status", method="PATCH", data={"status": "arrived"})
print(f"Status: {status_code}, Detail: {res.get('detail')}")
assert status_code == 401

print("\n=== TEST 10: PATCH /api/appointments/<id>/status with token -> expect 200 ===")
status_code, res = request(f"/api/appointments/{booking_id}/status", method="PATCH", data={"status": "arrived"}, token=admin_token)
print(f"Status: {status_code}, Updated Status: {res.get('status')}")
assert status_code == 200
assert res.get("status") == "arrived"

print("\n=== TEST 11: Rate limiting -> 5 failed attempts locks user ===")
# Try with user "rate_test_user"
for i in range(1, 6):
    s, r = request("/api/auth/login", method="POST", data={"username": "rate_test_user", "password": "wrong"})
    print(f"Attempt {i}: HTTP {s}")
# 6th attempt should return 429
s, r = request("/api/auth/login", method="POST", data={"username": "rate_test_user", "password": "wrong"})
print(f"Attempt 6: HTTP {s}, Detail: {r.get('detail')}")
assert s == 429, f"Expected 429, got {s}"

print("\nALL BACKEND AUTH & PRIVACY TESTS PASSED!")
