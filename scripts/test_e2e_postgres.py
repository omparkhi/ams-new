import sys
import os
import json
import base64
import numpy as np

sys.path.insert(0, os.path.abspath('.'))

from app import create_app
from app.api.auth import generate_token
from app.utils.db_utils import get_db_connection

app = create_app()

def run_tests():
    with app.app_context():
        test_company = 'E2E_CORP_01'
        test_username = 'e2eadmin'
        
        # Ensure clean state in DB for test_company
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('DELETE FROM Companies WHERE "Company ID" = %s', (test_company,))
        c.execute('DELETE FROM Users WHERE "Company ID" = %s', (test_company,))
        c.execute('DELETE FROM Leaves WHERE "Company ID" = %s', (test_company,))
        c.execute('DELETE FROM AttendanceRecords WHERE company_id = %s', (test_company,))
        c.execute('DELETE FROM FaceEmbeddings WHERE company_id = %s', (test_company,))
        
        c.execute('''
            INSERT INTO Companies ("Company ID", "Company Name", "Username", "Password", "Email", "Check In Time", "Check Out Time", "Required Hours")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (test_company, 'E2E Corp', test_username, 'hashed_pw', 'e2e@example.com', '09:00:00', '18:00:00', '8.0'))
        conn.commit()
        conn.close()

        token = generate_token({
            'company_id': test_company,
            'username': test_username,
            'company_name': 'E2E Corp'
        })
        auth_headers = {'Authorization': f'Bearer {token}'}

        with app.test_client() as client:
            print("1. Enrolling student 'Aarav Patel'...")
            # Generate dummy 128-d vectors encoded as base64 images (mock enrollment fallback)
            # The backend enroll_student function falls back to synthetic vector generation if face_recognition fails or dummy images are sent
            enroll_res = client.post(
                '/api/students/enroll',
                headers=auth_headers,
                json={
                    'name': 'Aarav Patel',
                    'images': ['data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='] * 20
                }
            )
            print("Enroll Status:", enroll_res.status_code, enroll_res.get_json())
            assert enroll_res.status_code in (200, 201), f"Enroll failed: {enroll_res.get_json()}"

            print("\n2. Fetching student list...")
            students_res = client.get('/api/students', headers=auth_headers)
            print("Students Status:", students_res.status_code, students_res.get_json())
            data = students_res.get_json()
            assert any(s['name'] == 'Aarav Patel' for s in data['students']), "Student not found in list!"

            print("\n3. Testing Check-In via /api/kiosk/scan...")
            mark_res = client.post(
                '/api/kiosk/scan',
                headers=auth_headers,
                json={
                    'image': 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'student_name': 'Aarav Patel'
                }
            )
            print("Check-In Status:", mark_res.status_code, mark_res.get_json())
            assert mark_res.status_code == 200, f"Check-in failed: {mark_res.get_json()}"

            print("\n4. Verifying Dashboard Roster after Check-In...")
            today_res = client.get('/api/attendance/today', headers=auth_headers)
            print("Today Status:", today_res.status_code, today_res.get_json())
            today_data = today_res.get_json()
            patel_record = next((r for r in today_data['roster'] if r['name'] == 'Aarav Patel'), None)
            assert patel_record is not None, "Aarav Patel record not in roster!"
            assert patel_record['status'] == 'Present', "Status is not Present!"
            assert patel_record['allow_checkout'] is True, "Allow checkout should be True!"

            print("\n5. Testing Force Check-Out via /api/attendance/force-checkout...")
            checkout_res = client.post(
                '/api/attendance/force-checkout',
                headers=auth_headers,
                json={
                    'student_name': 'Aarav Patel'
                }
            )
            print("Check-Out Status:", checkout_res.status_code, checkout_res.get_json())
            assert checkout_res.status_code == 200, f"Check-out failed: {checkout_res.get_json()}"

            print("\n6. Verifying Dashboard Roster after Check-Out...")
            today_res2 = client.get('/api/attendance/today', headers=auth_headers)
            today_data2 = today_res2.get_json()
            patel_record2 = next((r for r in today_data2['roster'] if r['name'] == 'Aarav Patel'), None)
            print("Roster after checkout:", patel_record2)
            assert patel_record2['checkout'] != '', "Checkout time was not saved!"
            assert patel_record2['allow_checkout'] is False, "Allow checkout should be False!"

            print("\n7. Testing Student Deletion...")
            del_res = client.delete(f'/api/students/Aarav%20Patel', headers=auth_headers)
            print("Delete Status:", del_res.status_code, del_res.get_json())
            assert del_res.status_code == 200, f"Delete failed: {del_res.get_json()}"

            print("\n8. Verifying Student List after Deletion...")
            students_res2 = client.get('/api/students', headers=auth_headers)
            assert not any(s['name'] == 'Aarav Patel' for s in students_res2.get_json()['students']), "Student still in list!"

            print("\n===============================")
            print("ALL 8 END-TO-END TESTS PASSED!!")
            print("===============================")

if __name__ == '__main__':
    run_tests()
