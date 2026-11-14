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
                score_threshold=0.50,
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


def is_legacy_vector(vec):
    """
    Detects old whole-frame downsampled hash vectors that lack zero-centered distribution.
    Legacy vectors have all positive values (mean > 0.05, std < 0.045).
    SFace deep embeddings have zero-mean distribution (mean ~ 0.0, std ~ 0.088).
    """
    try:
        arr = np.array(vec, dtype=np.float32)
        if arr.shape != (128,):
            return True
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        return bool(mean_val > 0.05 and std_val < 0.045)
    except Exception:
        return True


def extract_face_embedding(img_input):
    """
    Extracts a 128-dimensional normalized facial embedding vector using deep AI models.
    Accepts:
      - bytes (JPEG/PNG encoded)
      - base64 data string / URI
      - PIL.Image
      - numpy.ndarray (BGR or RGB)
    Returns:
      - 1D numpy array of shape (128,) with unit L2 norm, or None if no face is detected.
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

        # 1. Primary: OpenCV YuNet Face Detection + SFace Feature Extraction
        detector, recognizer = get_face_pipeline()
        if detector is not None and recognizer is not None:
            h, w = cv_bgr.shape[:2]
            detector.setInputSize((w, h))

            # First pass: standard confidence threshold
            _, faces = detector.detect(cv_bgr)

            # Adaptive second pass: lower threshold if face was missed (handles mobile front-camera lighting)
            if (faces is None or len(faces) == 0) and hasattr(detector, 'setScoreThreshold'):
                try:
                    detector.setScoreThreshold(0.32)
                    _, faces = detector.detect(cv_bgr)
                    detector.setScoreThreshold(0.50) # reset
                except Exception:
                    pass

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

        # Strictly return None if no face was genuinely detected.
        # NEVER invent artificial statistical vectors that cause false collisions!
        return None

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
    Matches a query face vector against enrolled company users.
    Threshold: Minimum cosine similarity required to confirm identity.
    Ignores legacy corrupted vectors to prevent false mismatches.
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
            # Filter out any legacy corrupt vectors
            valid_vecs = [v for v in user_vectors if not is_legacy_vector(v)]
            if not valid_vecs:
                continue

            arr = np.array(valid_vecs, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)

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


def check_duplicate_face(candidate_vecs, known_faces, threshold=0.50, exclude_name=None):
    """
    Consensus-Based Duplicate Face Validation.
    Prevents duplicate registration of the same person under multiple names.
    Uses multi-frame median consensus to eliminate single-pair outlier false alarms.
    Returns:
        (is_duplicate: bool, existing_name: str or None, consensus_similarity: float)
    """
    if not known_faces or not candidate_vecs:
        return False, None, 0.0

    valid_candidates = []
    for cv in candidate_vecs:
        if cv is not None and not is_legacy_vector(cv):
            cv_arr = np.array(cv, dtype=np.float32).flatten()
            norm = np.linalg.norm(cv_arr)
            if norm > 0:
                valid_candidates.append(cv_arr / norm)

    if not valid_candidates:
        return False, None, 0.0

    for name, user_vectors in known_faces.items():
        if exclude_name and name.strip().lower() == exclude_name.strip().lower():
            continue
        if not user_vectors:
            continue

        try:
            # Filter out any old legacy vectors
            valid_user_vecs = [v for v in user_vectors if not is_legacy_vector(v)]
            if not valid_user_vecs:
                continue

            arr = np.array(valid_user_vecs, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)

            # For each candidate frame, calculate maximum similarity against enrolled vectors
            cand_max_sims = []
            for cv in valid_candidates:
                sims = np.dot(arr, cv)
                cand_max_sims.append(float(np.max(sims)))

            cand_max_sims = np.array(cand_max_sims)
            median_sim = float(np.median(cand_max_sims))
            high_match_ratio = float(np.mean(cand_max_sims >= 0.48))

            # Consensus Duplicate Condition:
            # Genuine duplicate (same person): median_sim is 0.80 - 0.95, high_match_ratio > 0.80.
            # Distinct person: median_sim is 0.10 - 0.20, high_match_ratio = 0.
            if median_sim >= 0.50 or (high_match_ratio >= 0.35 and median_sim >= 0.44):
                logger.warning(
                    f"Duplicate face detected! Candidate matched existing student '{name}' "
                    f"(median similarity: {median_sim:.4f}, high match ratio: {high_match_ratio:.2%})"
                )
                return True, name, median_sim
        except Exception as e:
            logger.error(f"Error checking similarity against {name}: {e}")
            continue

    return False, None, 0.0


def load_encodings(company_id):
    """
    Loads persistent encodings for a company from PostgreSQL FaceEmbeddings table,
    falling back to local .pkl backup if available.
    Automatically self-heals legacy fallback vectors if profile portrait snapshot exists.
    """
    try:
        company_id_norm = company_id.replace(" ", "_")
        from app.utils.attendance_utils import TEMP_CHECKIN_IMAGES_DIR

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
                        needs_save = False

                        for r in rows:
                            uname = r['user_name']
                            raw_bytes = bytes(r['encodings_data'])
                            vecs = pickle.loads(raw_bytes)

                            # Check for legacy vectors
                            has_legacy = any(is_legacy_vector(v) for v in vecs) if vecs else False
                            if has_legacy:
                                profile_path = os.path.join(TEMP_CHECKIN_IMAGES_DIR, f"{company_id}_{uname}_profile.jpg")
                                if os.path.exists(profile_path):
                                    try:
                                        with open(profile_path, 'rb') as pf:
                                            new_v = extract_face_embedding(pf.read())
                                        if new_v is not None:
                                            vecs = [new_v]
                                            needs_save = True
                                            logger.info(f"Self-healed legacy vector for {uname} from profile portrait.")
                                    except Exception as ex:
                                        logger.debug(f"Self-heal error for {uname}: {ex}")

                            encodings[uname] = vecs

                        if needs_save:
                            try:
                                save_encodings(company_id, encodings)
                            except Exception:
                                pass

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
