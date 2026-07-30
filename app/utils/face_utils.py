import os
import pickle
import logging
import face_recognition

logger = logging.getLogger(__name__)

# def load_encodings(company_id):
#     try:
#         company_id = company_id.replace(" ", "_")
#         base_dir = os.path.dirname(os.path.abspath(__file__))  # directory of face.py
#         encodings_dir = os.path.join(base_dir, '..', 'encodings')  # go up one folder, then into encodings

#         encodings_file = os.path.join(encodings_dir, f'face_encodings_{company_id}.pkl')
#         encodings_file = os.path.normpath(encodings_file)  # normalize path

#         # encodings_file = f'encodings/face_encodings_{company_id}.pkl'
#         if os.path.exists(encodings_file):
#             with open(encodings_file, 'rb') as f:
#                 encodings = pickle.load(f)
#             logger.debug(f"Loaded encodings for {company_id}: {len(encodings)} users")
#             return encodings
#         else:
#             logger.warning(f"No encoding file found for {company_id}")
#             return {}
#     except Exception as e:
#         logger.error(f"Error loading encodings for company {company_id}: {str(e)}")
#         return {}


import os
import pickle
import logging

logger = logging.getLogger(__name__)

def load_encodings(company_id):
    try:
        # Normalize the company_id to match the expected filenames (handle spaces and underscores)
        company_id_norm = company_id.replace(" ", "_")
        
        # Handle both versions: one with spaces and one with underscores
        base_dir = os.path.dirname(os.path.abspath(__file__))  # directory of face.py
        encodings_dir = os.path.join(base_dir, '..', 'encodings')  # go up one folder, then into encodings

        encodings_file_underscore = os.path.join(encodings_dir, f'face_encodings_{company_id_norm}.pkl')
        encodings_file_space = os.path.join(encodings_dir, f'face_encodings_{company_id}.pkl')

        encodings_file_underscore = os.path.normpath(encodings_file_underscore)  # normalize path
        encodings_file_space = os.path.normpath(encodings_file_space)  # normalize path

        # Check if either file exists
        if os.path.exists(encodings_file_underscore):
            encodings_file = encodings_file_underscore
        elif os.path.exists(encodings_file_space):
            encodings_file = encodings_file_space
        else:
            logger.warning(f"No encoding file found for {company_id}")
            return {}

        # Load the encodings from the found file
        with open(encodings_file, 'rb') as f:
            encodings = pickle.load(f)
        logger.debug(f"Loaded encodings for {company_id}: {len(encodings)} users")
        return encodings

    except Exception as e:
        logger.error(f"Error loading encodings for company {company_id}: {str(e)}")
        return {}

def parse_time_range(time_range):
    if '-' in time_range:
        in_time, out_time = time_range.split(' - ')
        return in_time.strip(), out_time.strip()
    return time_range.strip(), ''

def find_best_match(face_encoding, known_faces, tolerance=0.5, strict_threshold=0.45):
    matches = []
    for current_name, known_encodings in known_faces.items():
        distances = face_recognition.face_distance(known_encodings, face_encoding)
        for i, distance in enumerate(distances):
            if distance < tolerance:
                matches.append((current_name, distance))
    
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
        company_id = company_id.replace(" ", "_")
        base_dir = os.path.dirname(os.path.abspath(__file__))  # directory of face.py
        encodings_dir = os.path.join(base_dir, '..', 'encodings')  # go up one folder, then into encodings

        encodings_file = os.path.join(encodings_dir, f'face_encodings_{company_id}.pkl')
        encodings_file = os.path.normpath(encodings_file)  # normalize path

        with open(encodings_file, 'wb') as f:
            pickle.dump(data, f)
        logger.debug(f"Encodings saved for company {company_id}")
    except Exception as e:
        logger.error(f"Error saving encodings for company {company_id}: {str(e)}")
        raise
  