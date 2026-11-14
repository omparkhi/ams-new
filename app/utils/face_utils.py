import os
import pickle
import logging
import numpy as np

try:
    import face_recognition
except ImportError:
    face_recognition = None

logger = logging.getLogger(__name__)

def load_encodings(company_id):
    try:
        company_id_norm = company_id.replace(" ", "_")

        # 1. Primary: Load persistent encodings directly from PostgreSQL FaceEmbeddings table
        try:
            from app.utils.db_utils import get_db_connection
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT user_name, encodings_data FROM FaceEmbeddings WHERE company_id = %s OR company_id = %s",
                        (company_id_norm, company_id)
                    )
                    rows = cursor.fetchall()
                    if rows:
                        encodings = {}
                        for r in rows:
                            raw_bytes = bytes(r['encodings_data'])
                            encodings[r['user_name']] = pickle.loads(raw_bytes)
                        logger.debug(f"Loaded {len(encodings)} user encodings from PostgreSQL for company {company_id}")
                        return encodings
                finally:
                    conn.close()
        except Exception as db_err:
            logger.warning(f"Could not query FaceEmbeddings from PostgreSQL: {db_err}")

        # 2. Secondary fallback: Check local .pkl file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        encodings_dir = os.path.join(base_dir, '..', 'encodings')
        if os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
            tmp_enc = '/tmp/encodings'
            os.makedirs(tmp_enc, exist_ok=True)
            if os.path.exists(os.path.join(tmp_enc, f'face_encodings_{company_id_norm}.pkl')):
                encodings_dir = tmp_enc

        encodings_file_underscore = os.path.normpath(os.path.join(encodings_dir, f'face_encodings_{company_id_norm}.pkl'))
        encodings_file_space = os.path.normpath(os.path.join(encodings_dir, f'face_encodings_{company_id}.pkl'))

        encodings_file = None
        if os.path.exists(encodings_file_underscore):
            encodings_file = encodings_file_underscore
        elif os.path.exists(encodings_file_space):
            encodings_file = encodings_file_space

        if encodings_file:
            with open(encodings_file, 'rb') as f:
                encodings = pickle.load(f)
            logger.debug(f"Loaded encodings from .pkl for {company_id}: {len(encodings)} users")
            return encodings

        logger.warning(f"No face encodings found for {company_id}")
        return {}

    except Exception as e:
        logger.error(f"Error loading encodings for company {company_id}: {str(e)}")
        return {}

def parse_time_range(time_range):
    if '-' in time_range:
        in_time, out_time = time_range.split(' - ')
        return in_time.strip(), out_time.strip()
    return time_range.strip(), ''

def find_best_match(face_encoding, known_faces, tolerance=0.5, strict_threshold=0.45):
    if not known_faces:
        return None
    matches = []
    face_vec = np.array(face_encoding)
    for current_name, known_encodings in known_faces.items():
        if not known_encodings:
            continue
        try:
            if face_recognition:
                distances = face_recognition.face_distance(known_encodings, face_encoding)
            else:
                # Direct numpy euclidean distance: identical to face_recognition.face_distance
                known_arr = np.array(known_encodings)
                distances = np.linalg.norm(known_arr - face_vec, axis=1)
            for distance in distances:
                if distance < tolerance:
                    matches.append((current_name, float(distance)))
        except Exception as e:
            logger.debug(f"Distance calculation error for {current_name}: {e}")
            continue

    if matches:
        best_match = min(matches, key=lambda x: x[1])
        name, distance = best_match
        if distance < strict_threshold:
            logger.debug(f"Found match: {name} with distance {distance}")
            return name, distance
        else:
            logger.debug(f"Best match {name} rejected: distance {distance} >= {strict_threshold}")

    logger.debug("No valid match found for face.")
    return None

def save_encodings(company_id, data):
    try:
        company_id_norm = company_id.replace(" ", "_")

        # 1. Primary: Save persistent encodings directly to PostgreSQL FaceEmbeddings table
        try:
            import psycopg2
            from app.utils.db_utils import get_db_connection
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    for uname, enc_list in data.items():
                        raw_bytes = pickle.dumps(enc_list)
                        cursor.execute("""
                            INSERT INTO FaceEmbeddings (company_id, user_name, encodings_data)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (company_id, user_name) DO UPDATE SET
                                encodings_data = EXCLUDED.encodings_data,
                                updated_at = CURRENT_TIMESTAMP;
                        """, (company_id_norm, uname, psycopg2.Binary(raw_bytes)))
                    conn.commit()
                    logger.info(f"Saved {len(data)} user encodings to PostgreSQL for {company_id}")
                finally:
                    conn.close()
        except Exception as db_err:
            logger.warning(f"Could not save encodings to PostgreSQL for {company_id}: {db_err}")

        # 2. Secondary local backup: Save to .pkl file if directory available
        base_dir = os.path.dirname(os.path.abspath(__file__))
        encodings_dir = os.path.join(base_dir, '..', 'encodings')
        if os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
            encodings_dir = '/tmp/encodings'
        os.makedirs(encodings_dir, exist_ok=True)

        encodings_file = os.path.normpath(os.path.join(encodings_dir, f'face_encodings_{company_id_norm}.pkl'))
        with open(encodings_file, 'wb') as f:
            pickle.dump(data, f)
        logger.debug(f"Encodings backup saved for company {company_id}")
    except Exception as e:
        logger.error(f"Error saving encodings for company {company_id}: {str(e)}")
        raise
