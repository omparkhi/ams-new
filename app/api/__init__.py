from flask import Blueprint

api_bp = Blueprint('api', __name__)

from . import auth
from . import students
from . import kiosk
from . import attendance
from . import company
from . import payroll

