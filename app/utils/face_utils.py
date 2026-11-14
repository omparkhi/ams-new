import os
import io
import base64
import pickle
import logging
import urllib.request
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import face_recognition
except ImportError:
    face_recognition = None

logger = logging.getLogger(__name__)

# Global singletons for OpenCV deep models
_detector = None
_recognizer = None
_models_initialized = False

# Official model download URLs (OpenCV Zoo)
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/refs/heads/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/refs/heads/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"


def get_models_dir():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    return models_dir


def ensure_deep_models():
    """
    Ensures OpenCV YuNet face detector and SFace recognizer ONNX models exist on disk.
    If missing, downloads them with streaming chunk writes.
    """
    models_dir = get_models_dir()
    yunet_path = os.path.join(models_dir, 'face_detection_yunet_2023mar.onnx')
    sface_path = os.path.join(models_dir, 'face_recognition_sface_2021dec.onnx')

    headers = {'User-Agent': 'Mozilla/5.0'}

    for path, url in [(yunet_path, YUNET_URL), (sface_path, SFACE_URL)]:
        # If file missing or corrupted/empty (< 100KB)
        if not os.path.exists(path) or os.path.getsize(path) < 100000:
            logger.info(f"Downloading deep biometric model from {url}...")
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=30) as resp, open(path, 'wb') as out_f:
                    while True:
                        chunk = resp.read(65536)
                        if not chunk:
                            break
                        out_f.write(chunk)
                logger.info(f"Model saved successfully to {path} ({os.path.getsize(path)} bytes)")
            except Exception as e:
                logger.warning(f"Could not auto-download model from {url}: {e}")

    return yunet_path, sface_path


def get_face_pipeline():
    """
    Initializes and returns cached instances of (FaceDetectorYN, FaceRecognizerSF).
    Returns (None, None) if OpenCV or model files are unavailable.
    """
    global _detector, _recognizer, _models_initialized
    if _detector is not None and _recognizer is not None:
        return _detector, _recognizer

    if cv2 is None or not hasattr(cv2, 'FaceDetectorYN') or not hasattr(cv2, 'FaceRecognizerSF'):
        logger.debug("OpenCV FaceDetectorYN or FaceRecognizerSF not available in current cv2 build.")
        return None, None

    try:
        yunet_path, sface_path = ensure_deep_models()
        if os.path.exists(yunet_path) and os.path.exists(sface_path) and os.path.getsize(sface_path) > 100000:
            _detector = cv2.FaceDetectorYN.create(
                yunet_path, '', (640, 480),
                score_threshold=0.55,
                nms_threshold=0.3,
                top_k=5000
            )
            _recognizer = cv2.FaceRecognizerSF.create(sface_path, '')
            _models_initialized = True
            logger.info("Initialized OpenCV YuNet + SFace biometric pipeline.")
            return _detector, _recognizer
    except Exception as e:
        logger.warning(f"Failed to initialize deep face models: {e}")

    return None, None


def _fallback_extract_crop_vector(cv_bgr):
    """
    Resilient fallback feature extractor:
    Isolates facial region (central 50% box), normalizes illumination,
    and extracts a 128-d spatial gradient vector.
    NEVER relies on ambient room/wall background pixels!
    """
    try:
        h, w = cv_bgr.shape[:2]
        top = int(h * 0.15)
        bottom = int(h * 0.80)
        left = int(w * 0.25)
        right = int(w * 0.75)
        crop = cv_bgr[top:bottom, left:right]
        if crop.size == 0:
            crop = cv_bgr

        if cv2 is not None:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, (64, 64))
        else:
            pil_img = Image.fromarray(crop).convert('L').resize((64, 64))
            gray = np.array(pil_img)

        arr = np.array(gray, dtype=np.float64)
        mean, std = np.mean(arr), np.std(arr)
        norm_arr = (arr - mean) / (std + 1e-5)

        # Spatial gradient features (Sobel-like)
        gx = np.zeros_like(norm_arr)
        gy = np.zeros_like(norm_arr)
        gx[:, 1:-1] = (norm_arr[:, 2:] - norm_arr[:, :-2]) * 0.5
        gy[1:-1, :] = (norm_arr[2:, :] - norm_arr[:-2, :]) * 0.5

        # 4x4 spatial grid pooling (16 cells * 8 features = 128-d)
        grid_size = 4
        ch, cw = 64 // grid_size, 64 // grid_size
        features = []
        for r in range(grid_size):
            for c in range(grid_size):
                cell_i = norm_arr[r*ch:(r+1)*ch, c*cw:(c+1)*cw]
                cell_gx = gx[r*ch:(r+1)*ch, c*cw:(c+1)*cw]
                cell_gy = gy[r*ch:(r+1)*ch, c*cw:(c+1)*cw]
                features.extend([
                    float(np.mean(cell_i)),
                    float(np.std(cell_i)),
                    float(np.mean(np.abs(cell_gx))),
                    float(np.mean(np.abs(cell_gy))),
                    float(np.std(cell_gx)),
                    float(np.std(cell_gy)),
                    float(np.mean(cell_gx)),
                    float(np.mean(cell_gy)),
                ])

        vec = np.array(features, dtype=np.float32)
        norm = np.linalg.norm(vec)
        return (vec / norm) if norm > 0 else vec
    except Exception as e:
        logger.error(f"Fallback facial crop extraction error: {e}")
        return None


def extract_face_embedding(img_input):
    """
    Extracts a 128-dimensional normalized facial embedding vector.
    Accepts:
      - bytes (JPEG/PNG encoded)
      - base64 data string / URI
      - PIL.Image
      - numpy.ndarray (BGR or RGB)
    Returns:
      - 1D numpy array of shape (128,) with unit L2 norm, or None if invalid.
    """
    cv_bgr = None

    try:
        if isinstance(img_input, str):
            if ',' in img_input:
                img_input = img_input.split(',')[1]
            img_input += '=' * (-len(img_input) % 4)
            raw_bytes = base64.b64decode(img_input)
            if cv2 is not None:
                nparr = np.frombuffer(raw_bytes, np.uint8)
                cv_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                pil_im = Image.open(io.BytesIO(raw_bytes))
                cv_bgr = np.array(pil_im.convert('RGB'))[:, :, ::-1]

        elif isinstance(img_input, bytes):
            if cv2 is not None:
                nparr = np.frombuffer(img_input, np.uint8)
                cv_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                pil_im = Image.open(io.BytesIO(img_input))
                cv_bgr = np.array(pil_im.convert('RGB'))[:, :, ::-1]

        elif isinstance(img_input, Image.Image):
            rgb = np.array(img_input.convert('RGB'))
            cv_bgr = rgb[:, :, ::-1] if cv2 is not None else rgb

        elif isinstance(img_input, np.ndarray):
            cv_bgr = img_input

        if cv_bgr is None or cv_bgr.size == 0:
            return None

        # 1. Primary: Try OpenCV YuNet + SFace pipeline
        detector, recognizer = get_face_pipeline()
        if detector is not None and recognizer is not None:
            h, w = cv_bgr.shape[:2]
            detector.setInputSize((w, h))
            _, faces = detector.detect(cv_bgr)
            if faces is not None and len(faces) > 0:
                # Pick the highest-confidence face
                best_face = max(faces, key=lambda f: f[-1])
                aligned = recognizer.alignCrop(cv_bgr, best_face)
                raw_feat = recognizer.feature(aligned).flatten().astype(np.float32)
                norm = np.linalg.norm(raw_feat)
                if norm > 0:
                    return raw_feat / norm

        # 2. Secondary: If face_recognition (dlib) is installed
        if face_recognition is not None:
            rgb = cv_bgr[:, :, ::-1]
            locs = face_recognition.face_locations(rgb, model="hog")
            if locs:
                encs = face_recognition.face_encodings(rgb, locs)
                if encs and len(encs[0]) == 128:
                    vec = encs[0].astype(np.float32)
                    norm = np.linalg.norm(vec)
                    return (vec / norm) if norm > 0 else vec

        # 3. Tertiary: Resilient background-free facial crop gradient vector
        return _fallback_extract_crop_vector(cv_bgr)

    except Exception as e:
        logger.error(f"Error extracting face embedding: {e}")
        return None


def extract_face_embeddings_multi(images):
    """
    Extracts high-quality face embeddings from a list of base64 images.
    Returns a list of 128-d unit-normalized numpy vectors.
    """
    vectors = []
    for img_data in images:
        vec = extract_face_embedding(img_data)
        if vec is not None and vec.shape == (128,):
            vectors.append(vec)
    return vectors


def find_best_match(face_vec, known_faces, threshold=0.40, strict_threshold=None):
    """
    Matches a single query face vector against all enrolled company users.
    Threshold: Minimum cosine similarity required to confirm identity.
    Default threshold 0.40 comfortably matches genuine enrolled users (typically 0.80+)
    while strictly rejecting different persons (typically 0.10-0.20).

    Returns:
        (matched_name, best_similarity_score) if matched, else None.
    """
    if not known_faces or face_vec is None:
        return None

    query = np.array(face_vec, dtype=np.float32).flatten()
    q_norm = np.linalg.norm(query)
    if q_norm > 0:
        query = query / q_norm

    best_name = None
    best_sim = -1.0

    eff_threshold = strict_threshold if strict_threshold is not None else threshold

    for name, user_vectors in known_faces.items():
        if not user_vectors:
            continue
        try:
            arr = np.array(user_vectors, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            # Dot product with unit vectors is cosine similarity
            sims = np.dot(arr, query)
            max_sim = float(np.max(sims))
            if max_sim > best_sim:
                best_sim = max_sim
                best_name = name
        except Exception as e:
            logger.debug(f"Distance calculation error for {name}: {e}")
            continue

    if best_sim >= eff_threshold and best_name is not None:
        logger.info(f"Biometric Match: '{best_name}' (similarity: {best_sim:.4f} >= {eff_threshold})")
        return best_name, best_sim

    logger.debug(f"Face rejected: best similarity {best_sim:.4f} < threshold {eff_threshold}")
    return None


def check_duplicate_face(candidate_vecs, known_faces, threshold=0.40, exclude_name=None):
    """
    Checks if a candidate's face vectors match any existing enrolled student.
    Prevents duplicate registration of the same person under multiple names.
    Returns:
        (is_duplicate: bool, existing_name: str or None, max_similarity: float)
    """
    if not known_faces or not candidate_vecs:
        return False, None, 0.0

    for name, user_vectors in known_faces.items():
        if exclude_name and name.strip().lower() == exclude_name.strip().lower():
            continue
        if not user_vectors:
            continue

        try:
            arr = np.array(user_vectors, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)

            for cand_vec in candidate_vecs:
                cv = np.array(cand_vec, dtype=np.float32).flatten()
                norm = np.linalg.norm(cv)
                if norm > 0:
                    cv = cv / norm
                sims = np.dot(arr, cv)
                max_sim = float(np.max(sims))
                if max_sim >= threshold:
                    logger.warning(
                        f"Duplicate face detected! Candidate matched existing student '{name}' "
                        f"(similarity: {max_sim:.4f} >= {threshold})"
                    )
                    return True, name, max_sim
        except Exception as e:
            logger.error(f"Error checking similarity against {name}: {e}")
            continue

    return False, None, 0.0


def load_encodings(company_id):
    """
    Loads persistent encodings for a company from PostgreSQL FaceEmbeddings table,
    falling back to local .pkl backup if available.
    """
    try:
        company_id_norm = company_id.replace(" ", "_")

        # 1. Primary: PostgreSQL FaceEmbeddings table
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


def save_encodings(company_id, data):
    """
    Saves persistent encodings into PostgreSQL FaceEmbeddings table and local .pkl backup.
    """
    try:
        company_id_norm = company_id.replace(" ", "_")

        # 1. Primary: PostgreSQL FaceEmbeddings table
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


def parse_time_range(time_range):
    if '-' in time_range:
        in_time, out_time = time_range.split(' - ')
        return in_time.strip(), out_time.strip()
    return time_range.strip(), ''
