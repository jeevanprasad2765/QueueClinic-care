import urllib.request, json
from datetime import date
today = date.today().isoformat()

r = urllib.request.urlopen('http://localhost:8000/api/doctors')
docs = json.loads(r.read())
print('Checking slots for', today)
for doc in docs:
    r2 = urllib.request.urlopen(f'http://localhost:8000/api/slots?doctor_id={doc["id"]}&date={today}')
    slots = json.loads(r2.read())
    avail = [s['slot'] for s in slots if s['available']]
    print(f'  id={doc["id"]} {doc["name"]} ({doc["dept"]}): {len(avail)} available -> {avail[:3]}')
