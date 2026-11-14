import os
import sys
import requests
import base64

sys.path.insert(0, '.')
from app.api.auth import generate_token

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    # Generate admin token for Stark_Industry_01 directly
    token = generate_token({
        'company_id': 'Stark_Industry_01',
        'company_name': 'Stark Industry',
        'username': 'Tony',
        'role': 'company_admin'
    })
    headers = {'Authorization': f'Bearer {token}'}

    def get_b64(path):
        with open(path, 'rb') as f:
            return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('utf-8')

    b64_om = get_b64('temp_checkin_images/Stark_Industry_01_Om Parkhi_14-11-2026.jpg')
    b64_mad = get_b64('temp_checkin_images/Stark_Industry_01_Madhuri Parkhi_14-11-2026.jpg')

    print('\n======================================================')
    print('TEST 1: Kiosk Attendance Scan - Om Parkhi')
    print('======================================================')
    res1 = requests.post(f'{BASE_URL}/api/kiosk/scan', headers=headers, json={'image': b64_om})
    data1 = res1.json()
    print(f"Status Code: {res1.status_code}")
    print(f"Status: {data1.get('status')}")
    print(f"Matched Name: {data1.get('name')}")
    print(f"Message: {data1.get('message')}")
    assert data1.get('name') == 'Om Parkhi', f"Expected Om Parkhi but got {data1.get('name')}"

    print('\n======================================================')
    print('TEST 2: Kiosk Attendance Scan - Madhuri Parkhi')
    print('======================================================')
    res2 = requests.post(f'{BASE_URL}/api/kiosk/scan', headers=headers, json={'image': b64_mad})
    data2 = res2.json()
    print(f"Status Code: {res2.status_code}")
    print(f"Status: {data2.get('status')}")
    print(f"Matched Name: {data2.get('name')}")
    print(f"Message: {data2.get('message')}")
    assert data2.get('name') == 'Madhuri Parkhi', f"Expected Madhuri Parkhi but got {data2.get('name')}"

    print('\n======================================================')
    print('TEST 3: Duplicate Enrollment Detection (Om enrolling as Rahul)')
    print('======================================================')
    res3 = requests.post(f'{BASE_URL}/api/students/enroll', headers=headers, json={
        'name': 'Rahul Duplicate',
        'images': [b64_om, b64_om, b64_om]
    })
    data3 = res3.json()
    print(f"Status Code: {res3.status_code}")
    print(f"Response: {data3}")
    assert res3.status_code == 400, f"Expected 400 duplicate error, got {res3.status_code}"
    assert 'Biometric validation failed' in data3.get('error', ''), "Expected biometric validation error"
    assert 'Om Parkhi' in data3.get('error', ''), "Expected duplicate error to identify Om Parkhi"

    print('\n======================================================')
    print('TEST 4: Unknown Face Scan (Black image / Unknown face)')
    print('======================================================')
    # Generate blank/black dummy image
    import numpy as np
    from PIL import Image
    import io
    dummy = Image.fromarray(np.zeros((480, 640, 3), dtype=np.uint8))
    buf = io.BytesIO()
    dummy.save(buf, format='JPEG')
    b64_unknown = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')

    res4 = requests.post(f'{BASE_URL}/api/kiosk/scan', headers=headers, json={'image': b64_unknown})
    data4 = res4.json()
    print(f"Status Code: {res4.status_code}")
    print(f"Status: {data4.get('status')}")
    print(f"Name: {data4.get('name')}")
    print(f"Message: {data4.get('message')}")
    assert data4.get('status') == 'unknown', f"Expected unknown status, got {data4.get('status')}"
    assert data4.get('name') == 'Unknown', f"Expected Unknown name, got {data4.get('name')}"

    print('\n======================================================')
    print('ALL BIOMETRIC REGRESSION TESTS PASSED 100%!')
    print('======================================================\n')
    return True

if __name__ == '__main__':
    run_tests()
