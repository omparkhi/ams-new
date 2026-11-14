import os
import io
import base64
import logging
import sqlite3
import datetime
import numpy as np
from PIL import Image
from flask import request, jsonify

try:
    import face_recognition
except ImportError:
    face_recognition = None

from app.utils.db_utils import get_db_connection
from app.utils.face_utils import (
    load_encodings,
    save_encodings,
    extract_face_embedding,
    check_duplicate_face
)
from .auth import token_required
from . import api_bp

logger = logging.getLogger(__name__)


@api_bp.route('/students', methods=['GET'])
@token_required
def list_students(current_user):
    """
    List all students enrolled in the current company tenant.
    """
    company_id = current_user.get('company_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database error.'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('SELECT "User Name" FROM Users WHERE "Company ID" = ? ORDER BY "User Name" ASC', (company_id,))
        users = [row['User Name'] for row in cursor.fetchall()]

        encodings = load_encodings(company_id)
        from app.utils.attendance_utils import TEMP_CHECKIN_IMAGES_DIR
        import urllib.parse
        students = []
        for name in users:
            profile_name = f"{company_id}_{name}_profile.jpg"
            has_profile = os.path.exists(os.path.join(TEMP_CHECKIN_IMAGES_DIR, profile_name))
            students.append({
                'name': name,
                'has_biometrics': name in encodings,
                'vector_count': len(encodings.get(name, [])),
                'avatar_url': f"/api/attendance/snapshot/{urllib.parse.quote(profile_name)}" if has_profile else None
            })

        return jsonify({'students': students, 'total': len(students)}), 200
    except Exception as e:
        logger.error(f"Error fetching students: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@api_bp.route('/students/enroll', methods=['POST'])
@token_required
def enroll_student(current_user):
    """
    Biometric Student Enrollment.
    Receives student name and array of 20 webcam frames (Base64 JPEG).
    Extracts 128-d face embeddings and registers student into tenant DB and biometric store.
    """
    try:
        company_id = current_user.get('company_id')
        table_name = company_id.replace(" ", "_")
        data = request.get_json(silent=True) or {}

        name = data.get('name', '').strip()
        images = data.get('images', [])

        if not name:
            return jsonify({'error': 'Student Name is required.'}), 400

        if not images or not isinstance(images, list):
            return jsonify({'error': 'An array of captured camera images is required.'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection unavailable.'}), 500

        # Check for existing student in Users table
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM Users WHERE "Company ID" = ? AND "User Name" = ?', (company_id, name))
            if cursor.fetchone():
                return jsonify({'error': f'Student "{name}" is already registered in your company.'}), 400
        finally:
            conn.close()

        # Load existing encodings for this company
        encodings = load_encodings(company_id)
        if name in encodings:
            # Check if user is already in Users table
            conn_chk = get_db_connection()
            user_already_registered = False
            if conn_chk:
                try:
                    c = conn_chk.cursor()
                    c.execute('SELECT 1 FROM Users WHERE "Company ID" = ? AND "User Name" = ?', (company_id, name))
                    user_already_registered = c.fetchone() is not None
                finally:
                    conn_chk.close()
            if user_already_registered:
                return jsonify({'error': f'Student "{name}" is already registered in your company biometrics.'}), 400
            # If in encodings but NOT in Users table (prior partial enrollment attempt), allow completing enrollment!

        # Extract 128-dimensional normalized biometric face embeddings
        known_face_encodings = []
        for img_data in images:
            try:
                vec = extract_face_embedding(img_data)
                if vec is not None and len(vec) == 128:
                    known_face_encodings.append(vec)
            except Exception as ex:
                logger.debug(f"Frame processing error: {ex}")
                continue

        # Strict Quality Guard: Must have at least 2 clean face vectors
        if len(known_face_encodings) < 2:
            return jsonify({
                'error': f'Face not clearly detected ({len(known_face_encodings)} detected). Please hold your device at eye level so your entire face (eyes, nose, and mouth) is visible inside the square with good lighting.'
            }), 400

        # Strict Biometric Duplicate Face Check (Multi-Frame Consensus):
        # Prevent any student from enrolling under multiple names with the same face.
        if encodings:
            is_dup, dup_name, dup_score = check_duplicate_face(
                known_face_encodings,
                encodings,
                threshold=0.50,
                exclude_name=name
            )
            if is_dup:
                logger.warning(
                    f"Duplicate face detected! Candidate '{name}' matched existing student '{dup_name}' (consensus similarity: {dup_score:.4f} >= 0.50)"
                )
                return jsonify({
                    'error': f'Biometric validation failed: This face is already enrolled under "{dup_name}". A student cannot be registered multiple times under different names.'
                }), 400

        # 1. Insert student into Users table, company table, and default Leaves in PostgreSQL
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                # Ensure company table exists
                cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" (Name TEXT)')

                # Insert into Users table
                cursor.execute(
                    'INSERT INTO Users ("Company ID", "User Name") VALUES (?, ?) ON CONFLICT ("Company ID", "User Name") DO NOTHING',
                    (company_id, name)
                )

                # Insert into company-specific table
                cursor.execute(f'INSERT INTO "{table_name}" (Name) VALUES (?)', (name,))

                # Initialize default leave balance for current month
                now = datetime.datetime.now()
                year_month = now.strftime('%Y-%m')
                cursor.execute('''
                    INSERT INTO Leaves ("Company ID", "User Name", "Year-Month", "Leaves Allowed", "Leaves Taken", "Leaves Carried")
                    VALUES (?, ?, ?, '2', '0', '0')
                    ON CONFLICT ("Company ID", "User Name", "Year-Month") DO NOTHING
                ''', (company_id, name, year_month))

                conn.commit()
            except Exception as err:
                logger.error(f"DB insert error during enrollment: {err}")
                conn.rollback()
                return jsonify({'error': f'Database error: {str(err)}'}), 500
            finally:
                conn.close()

        # 2. Save embeddings into tenant's persistent PostgreSQL FaceEmbeddings table
        encodings[name] = known_face_encodings
        try:
            save_encodings(company_id, encodings)
        except Exception as e:
            logger.error(f"Failed to save biometric encodings: {e}")
            return jsonify({'error': f'Failed to save biometric encodings: {str(e)}'}), 500

        # 3. Save student reference portrait snapshot image
        try:
            from app.utils.attendance_utils import TEMP_CHECKIN_IMAGES_DIR
            os.makedirs(TEMP_CHECKIN_IMAGES_DIR, exist_ok=True)
            profile_filename = f"{company_id}_{name}_profile.jpg"
            profile_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, profile_filename)

            first_img_data = images[0]
            if ',' in first_img_data:
                first_img_data = first_img_data.split(',')[1]
            first_img_data += '=' * (-len(first_img_data) % 4)
            profile_bytes = base64.b64decode(first_img_data)
            with open(profile_path, "wb") as pf:
                pf.write(profile_bytes)
            logger.info(f"Persisted profile snapshot for {name} to {profile_filename}")
        except Exception as e:
            logger.warning(f"Could not persist student profile avatar image: {e}")

        return jsonify({
            'success': True,
            'message': f'Student "{name}" enrolled successfully with {len(known_face_encodings)} biometric vectors.',
            'student': {
                'name': name,
                'vectors_captured': len(known_face_encodings)
            }
        }), 201

    except Exception as e:
        logger.exception(f"Unexpected error in enroll_student: {e}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@api_bp.route('/students/<name>', methods=['DELETE'])
@token_required
def delete_student(current_user, name):
    """
    Deletes a student from the database AND purges their face vector from the biometric model.
    Fixes the orphan biometric bug!
    """
    company_id = current_user.get('company_id')
    table_name = company_id.replace(" ", "_")

    # 1. Delete from database across Users, company table, Leaves, AttendanceRecords, SalaryStructures, and FaceEmbeddings
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM Users WHERE "Company ID" = ? AND "User Name" = ?', (company_id, name))
            cursor.execute(f'DELETE FROM "{table_name}" WHERE Name = ?', (name,))
            cursor.execute('DELETE FROM Leaves WHERE "Company ID" = ? AND "User Name" = ?', (company_id, name))
            cursor.execute('DELETE FROM AttendanceRecords WHERE company_id = ? AND user_name = ?', (company_id, name))
            cursor.execute('DELETE FROM SalaryStructures WHERE company_id = ? AND user_name = ?', (company_id, name))
            cursor.execute('DELETE FROM FaceEmbeddings WHERE company_id = ? AND user_name = ?', (company_id, name))
            conn.commit()
        except Exception as e:
            conn.rollback()
            return jsonify({'error': f'Failed to delete student from database: {str(e)}'}), 500
        finally:
            conn.close()

    # 2. Purge face encodings from local cache
    try:
        encodings = load_encodings(company_id)
        if name in encodings:
            del encodings[name]
            save_encodings(company_id, encodings)
            logger.info(f"Purged biometric encodings for student {name} in {company_id}")
    except Exception as e:
        logger.warning(f"Failed to purge encodings for {name}: {e}")

    return jsonify({'success': True, 'message': f'Student "{name}" removed successfully.'}), 200
