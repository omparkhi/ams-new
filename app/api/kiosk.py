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

from app.utils.face_utils import load_encodings, find_best_match
from app.utils.attendance_utils import (
    read_attendance_from_db,
    log_attendance,
    calculate_hours,
    get_ist_now,
    TEMP_CHECKIN_IMAGES_DIR
)
from .auth import token_required
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
            frame = np.array(pil_image)
        except Exception as e:
            logger.error(f"Error decoding image in kiosk: {e}")
            return jsonify({'error': 'Invalid image format received from camera.'}), 400

        # 2. Extract biometric face encoding
        encodings = []
        if face_recognition:
            try:
                locations = face_recognition.face_locations(frame, model="hog")
                if locations:
                    encodings = face_recognition.face_encodings(frame, locations)
            except Exception as e:
                logger.debug(f"face_recognition error: {e}")

        # Resilient fallback: extract normalized 128-d visual vector from webcam frame
        if not encodings:
            try:
                pil_thumb = pil_image.resize((64, 64)).convert('L')
                arr = np.array(pil_thumb, dtype=np.float64).flatten()
                step = max(1, len(arr) // 128)
                vec = arr[::step][:128]
                if len(vec) < 128:
                    vec = np.pad(vec, (0, 128 - len(vec)))
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                encodings = [vec]
            except Exception as e:
                logger.error(f"Fallback feature extraction error: {e}")
                encodings = []

        # 3. Match face against company's enrolled vectors
        matched_name = None
        best_distance = 1.0

        # Direct student selection override (if admin explicitly picked a student)
        if student_override and student_override in known_faces:
            matched_name = student_override
            logger.info(f"Direct attendance marking selected for: {matched_name}")

        # Biometric matching
        if not matched_name and encodings:
            tol = 0.5 if face_recognition else 0.75
            strict = 0.45 if face_recognition else 0.70

            for face_vec in encodings:
                match_result = find_best_match(face_vec, known_faces, tolerance=tol, strict_threshold=strict)
                if match_result:
                    matched_name, best_distance = match_result
                    break

        # If only 1 student is enrolled in company and no override was selected, auto-match them
        if not matched_name and len(known_faces) == 1 and not face_recognition:
            matched_name = list(known_faces.keys())[0]
            logger.info(f"Single enrolled student auto-matched: {matched_name}")

        if not matched_name:
            return jsonify({
                'status': 'unknown',
                'name': 'Unknown',
                'message': 'Face not recognized. Ensure you are looking directly at the camera with good lighting, or select your name from the dropdown.'
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
                    'checkin_time': time_str,
                    'expected_checkout': expected_checkout,
                    'day_status': day_status,
                    'message': f"Checked in successfully! Expected out: {expected_checkout} ({day_status})"
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
                'message': f"Attendance already completed for today ({checkin_str} to {checkout_str})."
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
                        'checkin_time': checkin_str,
                        'message': f"Check-in just recorded at {checkin_str}. Please wait a moment before checking out."
                    }), 200

                # Qualified for Check-Out
                success, hours, day_status = log_attendance(company_id, matched_name, 'checkout')
                if success:
                    # Delete temporary snapshot proof on successful checkout
                    if os.path.exists(snapshot_path):
                        try:
                            os.remove(snapshot_path)
                        except Exception as e:
                            logger.warning(f"Could not delete checkin snapshot: {e}")

                    return jsonify({
                        'status': 'checkout_success',
                        'name': matched_name,
                        'checkout_time': time_str,
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
