import os
import sys
import json
import base64
import urllib.request
from PIL import Image
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.utils.db_utils import get_db_connection
from app.utils.attendance_utils import TEMP_CHECKIN_IMAGES_DIR

BASE = "http://127.0.0.1:5000/api"

def make_req(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def create_sample_face_b64(brightness=120):
    img = Image.new('RGB', (100, 100), color=(brightness, brightness, brightness))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def test_workflow():
    print("=== Step 1: Login as Admin for test6 ===")
    # Look up test6 credentials
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT "Username", "Kiosk PIN" FROM Companies WHERE "Company ID" = %s', ('test6_01',))
    row = cur.fetchone()
    conn.close()

    status, login_res = make_req(f"{BASE}/kiosk/verify-pin", method="POST", data={"slug": "test6", "pin": row['Kiosk PIN']})
    print(f"Kiosk login status: {status}")
    token = login_res['token']

    # Step 2: Look at Om Parkhi's existing checkin snapshot in test6_01
    status, today_res = make_req(f"{BASE}/attendance/today", token=token)
    print(f"Today attendance roster length: {len(today_res.get('roster', []))}")
    for r in today_res.get('roster', []):
        print(f"Student: {r['name']}, has_snapshot: {r.get('has_snapshot')}, snapshot_url: {r.get('snapshot_url')}")

    # Step 3: Test Duplicate Face Detection
    # If Om Parkhi is enrolled, load their encodings
    from app.utils.face_utils import load_encodings
    encs = load_encodings('test6_01')
    if 'Om Parkhi' in encs:
        print("\n=== Step 3: Attempt to enroll 'DuplicateUser' using Om Parkhi's face encodings ===")
        # We will mock a frame that produces the exact vector or near vector
        # Or test enrollment endpoint
        # Let's inspect if duplicate check triggers
        # Generate 20 frames
        sample_frames = [create_sample_face_b64() for _ in range(20)]
        # Temporarily test duplicate rejection
        # If we send empty/generic frames, let's see response
        status, enroll_res = make_req(f"{BASE}/students/enroll", method="POST", token=token, data={
            "name": "DuplicateUser",
            "images": sample_frames
        })
        print(f"Enroll response status: {status}, response: {enroll_res}")

    print("\nWorkflow test finished.")

if __name__ == "__main__":
    test_workflow()
