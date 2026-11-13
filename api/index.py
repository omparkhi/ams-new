import os
import sys

# Ensure project root is available on sys.path for module resolution
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Set VERCEL environment flag
os.environ['VERCEL'] = '1'

from app import create_app

# Expose WSGI application callable for Vercel Python runtime
app = create_app()

if __name__ == '__main__':
    app.run()
