import urllib.request
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

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

def run_tests():
    print("=== TEST 1: Public Org Info Endpoint ===")
    status, res = make_req(f"{BASE}/kiosk/org/test6")
    print(f"Status: {status}, Result: {res}")
    assert status == 200, f"Expected 200, got {status}"
    assert res.get("slug") == "test6", "Slug mismatch"

    print("\n=== TEST 2: Verify Wrong PIN ===")
    status, res = make_req(f"{BASE}/kiosk/verify-pin", method="POST", data={"slug": "test6", "pin": "000000"})
    print(f"Status: {status}, Result: {res}")
    assert status == 401, f"Expected 401, got {status}"

    print("\n=== TEST 3: Direct DB PIN Lookup & Verify PIN ===")
    from app.utils.db_utils import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT "Slug", "Kiosk PIN" FROM Companies WHERE "Slug" = %s', ('test6',))
    row = cur.fetchone()
    conn.close()
    
    pin = row['Kiosk PIN']
    print(f"Retrieved stored PIN for test6: {pin}")

    # Verify PIN to get scoped kiosk token
    status, pin_res = make_req(f"{BASE}/kiosk/verify-pin", method="POST", data={"slug": "test6", "pin": pin})
    print(f"Verify PIN Status: {status}")
    assert status == 200, f"Expected 200, got {status}"
    kiosk_token = pin_res.get("token")
    print(f"Scoped Kiosk Token received: {kiosk_token[:20]}...")

    print("\n=== TEST 4: Security Verification - Kiosk Scoped Token Blocked from Payroll ===")
    status, payroll_res = make_req(f"{BASE}/payroll/members", token=kiosk_token)
    print(f"Payroll Access Status with Kiosk Token: {status}, Result: {payroll_res}")
    assert status == 403, f"Expected 403 Forbidden for payroll, got {status}"
    print("Confidential payroll access strictly blocked for kiosk token!")

    print("\n=== TEST 5: Kiosk Token Permitted for Kiosk Operations ===")
    status, att_res = make_req(f"{BASE}/attendance/today", token=kiosk_token)
    print(f"Today Attendance Access with Kiosk Token: {status}, Total count: {att_res.get('total')}")
    assert status == 200, f"Expected 200, got {status}"

    print("\nALL E2E KIOSK SECURITY & ISOLATION TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
