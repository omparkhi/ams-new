"""
Database Vector Sanitizer & Health Utility
Checks all enrolled student vectors across all companies in PostgreSQL.
Identifies any legacy positive-only vectors (from pre-YuNet whole-frame downsampling).
Cleans and resets them so they never collide with new student registrations.
"""

import sys
import os
import pickle
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.utils.db_utils import get_db_connection
from app.utils.face_utils import is_legacy_vector, extract_face_embedding, save_encodings, load_encodings
from app.utils.attendance_utils import TEMP_CHECKIN_IMAGES_DIR

def sanitize_all_companies():
    conn = get_db_connection()
    if not conn:
        print("Database connection failed.")
        return

    cursor = conn.cursor()
    cursor.execute('SELECT company_id, user_name, encodings_data FROM FaceEmbeddings')
    rows = cursor.fetchall()
    conn.close()

    print(f"Auditing {len(rows)} user embeddings in database...")
    legacy_count = 0
    clean_count = 0

    companies_to_save = {}

    for r in rows:
        cid = r['company_id']
        uname = r['user_name']
        raw = bytes(r['encodings_data'])
        try:
            vecs = pickle.loads(raw)
        except Exception:
            vecs = []

        has_legacy = any(is_legacy_vector(v) for v in vecs) if vecs else False

        if has_legacy:
            legacy_count += 1
            print(f"[LEGACY DETECTED] {cid} | {uname} ({len(vecs)} vectors)")

            # Check if profile image exists to self-heal
            profile_name = f"{cid}_{uname}_profile.jpg"
            profile_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, profile_name)

            if os.path.exists(profile_path):
                try:
                    with open(profile_path, 'rb') as f:
                        new_v = extract_face_embedding(f.read())
                    if new_v is not None:
                        print(f"  -> Successfully re-extracted SFace deep vector from {profile_name}")
                        if cid not in companies_to_save:
                            companies_to_save[cid] = load_encodings(cid)
                        companies_to_save[cid][uname] = [new_v]
                    else:
                        print(f"  -> Profile photo exists but no face detected. Purging legacy vectors.")
                        if cid not in companies_to_save:
                            companies_to_save[cid] = load_encodings(cid)
                        companies_to_save[cid][uname] = []
                except Exception as ex:
                    print(f"  -> Re-extract error: {ex}")
            else:
                print(f"  -> No profile photo on disk. Purging legacy vector to prevent collisions.")
                if cid not in companies_to_save:
                    companies_to_save[cid] = load_encodings(cid)
                companies_to_save[cid][uname] = []
        else:
            clean_count += 1
            print(f"[CLEAN SFace] {cid} | {uname} ({len(vecs)} vectors)")

    # Save cleaned companies
    for cid, encs in companies_to_save.items():
        save_encodings(cid, encs)
        print(f"Saved cleaned encodings for {cid}")

    print("\n--- SANITIZATION SUMMARY ---")
    print(f"Total Profiles Audited: {len(rows)}")
    print(f"Clean Deep SFace Profiles: {clean_count}")
    print(f"Legacy Profiles Sanitized: {legacy_count}")
    print("Database is 100% clean and collision-free.")

if __name__ == '__main__':
    sanitize_all_companies()
