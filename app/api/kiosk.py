import os
import io
import base64
import logging
from datetime import datetime, timedelta, date
from PIL import Image
import numpy as np
from flask import request, jsonify

try:
    import face_recognition
except ImportError:
    face_recognition = None

from app.utils.face_utils import load_encodings, find_best_match, extract_face_embedding
from app.utils.db_utils import get_db_connection
from app.utils.attendance_utils import (
    read_attendance_from_db,
    log_attendance,
    calculate_hours,
    get_ist_now,
    format_time_ist,
    TEMP_CHECKIN_IMAGES_DIR
)
from .auth import token_required, generate_token
from . import api_bp

logger = logging.getLogger(__name__)


@api_bp.route('/kiosk/scan', methods=['POST'])
@token_required
def kiosk_scan(current_user):
    """
    Live Attendance Kiosk Recognition.
    Processes a webcam frame, matches against enrolled 128-d vectors,
    enforces IST shift timing and 6-hour minimum checkout rule.
    Supports both native Dlib biometric recognition and visual feature fallback.
    """
    try:
        company_id = current_user.get('company_id')
        data = request.get_json(silent=True) or {}
        image_data = data.get('image', '')
        student_override = (data.get('student_name') or data.get('name') or '').strip()

        if not image_data or not isinstance(image_data, str):
            return jsonify({'error': 'Camera image data string is required.'}), 400

        known_faces = load_encodings(company_id)
        if not known_faces:
            return jsonify({
                'status': 'no_students',
                'message': 'No students enrolled yet. Please add students first in the Records tab.'
            }), 400

        # 1. Decode base64 frame
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_data += '=' * (-len(image_data) % 4)
            image_bytes = base64.b64decode(image_data)
            pil_image = Image.open(io.BytesIO(image_bytes))
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
        except Exception as e:
            logger.error(f"Error decoding image in kiosk: {e}")
            return jsonify({'error': 'Invalid image format received from camera.'}), 400

        # 2. Extract deep biometric face encoding
        face_vec = extract_face_embedding(image_bytes)

        # 3. Match face against company's enrolled vectors
        matched_name = None
        best_similarity = 0.0

        # Direct student selection override (if admin explicitly picked a student)
        if student_override and student_override in known_faces:
            matched_name = student_override
            logger.info(f"Direct attendance marking selected for: {matched_name}")

        # Biometric matching
        if not matched_name and face_vec is not None:
            match_result = find_best_match(face_vec, known_faces, threshold=0.40)
            if match_result:
                matched_name, best_similarity = match_result

        # Strict validation: If face is unrecognized or does not match company students, reject
        if not matched_name:
            return jsonify({
                'status': 'unknown',
                'name': 'Unknown',
                'message': 'Face not recognized. If you are new, please enroll first using the "New Member Register" tab above, or look directly at the camera with clear lighting.'
            }), 200

        # 4. Process Attendance Check-In / Check-Out
        now = get_ist_now()
        today = now.strftime('%d/%m/%Y')
        time_str = now.strftime('%H:%M:%S')

        attendance = read_attendance_from_db(company_id)
        today_records = [r for r in attendance if r[0] == matched_name and r[1] == today]

        os.makedirs(TEMP_CHECKIN_IMAGES_DIR, exist_ok=True)
        snapshot_filename = f"{company_id}_{matched_name}_{today.replace('/', '-')}.jpg"
        snapshot_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, snapshot_filename)

        # Case A: First scan of the day -> Check-In
        if not today_records or (not today_records[-1][2] and not today_records[-1][3]):
            success, expected_checkout, day_status = log_attendance(company_id, matched_name, 'checkin')
            if success:
                try:
                    pil_image.save(snapshot_path)
                except Exception as e:
                    logger.warning(f"Could not save check-in snapshot: {e}")

                return jsonify({
                    'status': 'checkin_success',
                    'name': matched_name,
                    'checkin_time': format_time_ist(time_str),
                    'expected_checkout': format_time_ist(expected_checkout),
                    'day_status': day_status,
                    'message': f"Checked in successfully! Expected out: {format_time_ist(expected_checkout)} ({day_status})"
                }), 200
            else:
                return jsonify({'status': 'error', 'message': 'Failed to record check-in.'}), 500

        # Case B: Already has records today
        last_record = today_records[-1]
        checkin_str = last_record[2]
        checkout_str = last_record[3]

        if checkout_str:
            return jsonify({
                'status': 'already_completed',
                'name': matched_name,
                'message': f"Attendance already completed for today ({format_time_ist(checkin_str)} to {format_time_ist(checkout_str)})."
            }), 200

        if checkin_str and not checkout_str:
            try:
                checkin_dt = datetime.strptime(checkin_str, '%H:%M:%S').time()
                now_naive = now.replace(tzinfo=None) if hasattr(now, 'tzinfo') and now.tzinfo is not None else now
                checkin_full = datetime.combine(now_naive.date(), checkin_dt)
                time_worked = now_naive - checkin_full

                # Prevent immediate accidental duplicate scan within 3 seconds
                if time_worked.total_seconds() < 3:
                    return jsonify({
                        'status': 'checkout_blocked',
                        'name': matched_name,
                        'checkin_time': format_time_ist(checkin_str),
                        'message': f"Check-in just recorded at {format_time_ist(checkin_str)}. Please wait a moment before checking out."
                    }), 200

                # Qualified for Check-Out
                success, hours, day_status = log_attendance(company_id, matched_name, 'checkout')
                if success:
                    # Preserve check-in snapshot proof for supervisor review, and optionally save checkout snapshot
                    try:
                        checkout_filename = f"{company_id}_{matched_name}_{today.replace('/', '-')}_out.jpg"
                        pil_image.save(os.path.join(TEMP_CHECKIN_IMAGES_DIR, checkout_filename))
                    except Exception as e:
                        logger.warning(f"Could not save checkout snapshot: {e}")

                    return jsonify({
                        'status': 'checkout_success',
                        'name': matched_name,
                        'checkout_time': format_time_ist(time_str),
                        'hours_worked': hours,
                        'day_status': day_status,
                        'message': f"Checked out successfully! Total worked: {hours} hours ({day_status})."
                    }), 200
                else:
                    return jsonify({'status': 'error', 'message': 'Failed to record check-out.'}), 500

            except Exception as ex:
                logger.error(f"Error checking worked duration: {ex}")
                return jsonify({'status': 'error', 'message': f'Error computing checkout: {str(ex)}'}), 500

        return jsonify({'status': 'unknown_state', 'message': 'Unexpected attendance state.'}), 200

    except Exception as e:
        logger.exception(f"Unexpected error in kiosk_scan: {e}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@api_bp.route('/kiosk/org/<slug>', methods=['GET'])
def get_kiosk_org_info(slug):
    """
    Public endpoint to fetch basic organization info for the kiosk portal.
    """
    clean_slug = slug.strip().lower()
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT "Company ID", "Company Name", "Slug", "Check In Time", "Check Out Time", "Required Hours" '
            'FROM Companies WHERE LOWER("Slug") = LOWER(?) OR LOWER("Company ID") = LOWER(?) LIMIT 1',
            (clean_slug, clean_slug)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': f'Organization "{slug}" not found. Please verify the URL.'}), 404

        return jsonify({
            'success': True,
            'company_id': row['Company ID'],
            'company_name': row['Company Name'],
            'slug': row['Slug'] or clean_slug,
            'check_in_time': format_time_ist(row['Check In Time'] or '09:00:00', include_seconds=False),
            'check_out_time': format_time_ist(row['Check Out Time'] or '18:00:00', include_seconds=False),
            'required_hours': row['Required Hours'] or '8.0',
            'requires_pin': True
        }), 200
    finally:
        conn.close()


@api_bp.route('/kiosk/verify-pin', methods=['POST'])
def verify_kiosk_pin():
    """
    Verifies the 6-digit Kiosk PIN for an organization and returns a scoped kiosk token.
    """
    data = request.get_json(silent=True) or {}
    slug = (data.get('slug') or '').strip().lower()
    pin = (data.get('pin') or '').strip()

    if not slug or not pin:
        return jsonify({'error': 'Organization slug and PIN are required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT "Company ID", "Company Name", "Slug", "Kiosk PIN" '
            'FROM Companies WHERE LOWER("Slug") = LOWER(?) OR LOWER("Company ID") = LOWER(?) LIMIT 1',
            (slug, slug)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': f'Organization "{slug}" not found.'}), 404

        stored_pin = (row['Kiosk PIN'] or '').strip()
        if not stored_pin or stored_pin != pin:
            return jsonify({'error': 'Incorrect Kiosk PIN. Please ask your administrator for the access code.'}), 401

        # Generate scoped token with role: 'kiosk' valid for 30 days
        kiosk_token = generate_token({
            'company_id': row['Company ID'],
            'company_name': row['Company Name'],
            'slug': row['Slug'] or slug,
            'role': 'kiosk'
        }, expires_in_days=30)

        return jsonify({
            'success': True,
            'token': kiosk_token,
            'company_id': row['Company ID'],
            'company_name': row['Company Name'],
            'slug': row['Slug'] or slug
        }), 200
    finally:
        conn.close()


@api_bp.route('/company/kiosk-settings', methods=['GET'])
@token_required
def get_kiosk_settings(current_user):
    """
    Returns Kiosk URL slug and active PIN for the authenticated company admin.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "Slug", "Kiosk PIN", "Company Name" FROM Companies WHERE "Company ID" = ?', (company_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Company not found.'}), 404

        slug = row['Slug'] or company_id.replace(' ', '_').lower()
        pin = row['Kiosk PIN'] or '123456'

        return jsonify({
            'success': True,
            'slug': slug,
            'kiosk_pin': pin,
            'company_name': row['Company Name'],
            'kiosk_url': f"/kiosk/{slug}"
        }), 200
    finally:
        conn.close()


@api_bp.route('/company/kiosk-settings', methods=['POST'])
@token_required
def update_kiosk_settings(current_user):
    """
    Update slug or regenerate/set Kiosk PIN for company admin.
    """
    company_id = current_user.get('company_id')
    data = request.get_json(silent=True) or {}
    new_pin = data.get('kiosk_pin', '').strip()
    new_slug = data.get('slug', '').strip().lower()
    regenerate = data.get('regenerate', False)

    import random, re

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database unavailable.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "Slug", "Kiosk PIN" FROM Companies WHERE "Company ID" = ?', (company_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Company not found.'}), 404

        current_slug = row['Slug']
        current_pin = row['Kiosk PIN']

        if regenerate:
            new_pin = str(random.randint(100000, 999999))
        elif not new_pin:
            new_pin = current_pin

        if new_slug and new_slug != current_slug:
            clean_slug = re.sub(r'[^a-z0-9]+', '-', new_slug).strip('-')
            cursor.execute('SELECT 1 FROM Companies WHERE "Slug" = ? AND "Company ID" != ?', (clean_slug, company_id))
            if cursor.fetchone():
                return jsonify({'error': f'Slug "{clean_slug}" is already taken by another organization.'}), 409
            current_slug = clean_slug

        cursor.execute('UPDATE Companies SET "Slug" = ?, "Kiosk PIN" = ? WHERE "Company ID" = ?',
                       (current_slug, new_pin, company_id))
        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Kiosk settings updated successfully!',
            'slug': current_slug,
            'kiosk_pin': new_pin,
            'kiosk_url': f"/kiosk/{current_slug}"
        }), 200
    finally:
        conn.close()
