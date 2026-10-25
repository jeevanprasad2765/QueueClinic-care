from main import triage_text

tests = [
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

all_passed = True
for sym, age, exp_dept, exp_urg in tests:
    res = triage_text(sym, age)
    dept_ok = res["dept"] == exp_dept
    urg_ok = (exp_urg is None) or (res["urgency"] == exp_urg)
    passed = dept_ok and urg_ok
    if not passed:
        all_passed = False
    print(f"[{'PASS' if passed else 'FAIL'}] '{sym}' -> dept: {res['dept']} (exp: {exp_dept}), urgency: {res['urgency']}, matched: {res['matched']}")

print("All 12 tests passed:", all_passed)
