from __future__ import annotations

import os
from functools import wraps
from datetime import datetime
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.exceptions import HTTPException
from pymongo import MongoClient

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'clinic-management-dev-secret')

cors_origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', '*').split(',') if origin.strip()]
CORS(app, resources={r'/api/*': {'origins': cors_origins}}, allow_headers=['Content-Type', 'Authorization'])


@app.errorhandler(HTTPException)
def handle_http_exception(exc: HTTPException):
    return jsonify({'error': exc.description or exc.name}), exc.code


@app.errorhandler(404)
def handle_not_found(exc):
    return (
        jsonify(
            {
                'error': 'The requested URL was not found on the server.',
                'valid_routes': ['/','/api','/api/health','/api/auth/login','/api/auth/me','/api/patients','/api/appointments'],
            }
        ),
        404,
    )


@app.errorhandler(Exception)
def handle_unexpected_exception(exc: Exception):
    return jsonify({'error': str(exc) or 'Internal server error'}), 500

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'clinic_management_system')
MONGO_PATIENTS_COLLECTION = os.getenv('MONGO_PATIENTS_COLLECTION', 'patients')
MONGO_APPOINTMENTS_COLLECTION = os.getenv('MONGO_APPOINTMENTS_COLLECTION', 'appointments')
MONGO_CLIENTS_COLLECTION = os.getenv('MONGO_CLIENTS_COLLECTION', 'clients')
MONGO_CLIENT_RECORDS_COLLECTION = os.getenv('MONGO_CLIENT_RECORDS_COLLECTION', 'client_records')
MONGO_SERVER_SELECTION_TIMEOUT_MS = int(os.getenv('MONGO_SERVER_SELECTION_TIMEOUT_MS', '1500'))
AUTH_USERNAME = os.getenv('AUTH_USERNAME', 'admin')
AUTH_PASSWORD = os.getenv('AUTH_PASSWORD', 'admin123')
AUTH_TOKEN_MAX_AGE_SECONDS = int(os.getenv('AUTH_TOKEN_MAX_AGE_SECONDS', str(60 * 60 * 12)))

mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS)
mongo_db = mongo_client[MONGO_DB_NAME]
patients_collection = mongo_db[MONGO_PATIENTS_COLLECTION]
appointments_collection = mongo_db[MONGO_APPOINTMENTS_COLLECTION]
clients_collection = mongo_db[MONGO_CLIENTS_COLLECTION]
client_records_collection = mongo_db[MONGO_CLIENT_RECORDS_COLLECTION]
auth_serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='clinic-dashboard-auth')

fallback_patients: dict[str, dict] = {}
fallback_appointments: dict[str, dict] = {}
fallback_clients: dict[str, dict] = {}
fallback_client_records: dict[str, dict] = {}


def create_auth_token(identity: str, role: str = 'staff') -> str:
    payload: dict[str, str] = {'role': role}
    if role == 'client':
        payload['mobile'] = identity
    else:
        payload['username'] = identity
    return auth_serializer.dumps(payload)


def get_bearer_token() -> str:
    authorization_header = request.headers.get('Authorization', '').strip()
    if authorization_header.lower().startswith('bearer '):
        return authorization_header[7:].strip()
    return ''


def get_authenticated_payload() -> dict | None:
    token = get_bearer_token()
    if not token:
        return None

    try:
        payload = auth_serializer.loads(token, max_age=AUTH_TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None

    role = str(payload.get('role', 'staff')).strip() or 'staff'
    username = str(payload.get('username', '')).strip()
    mobile = str(payload.get('mobile', '')).strip()

    if role == 'client' and mobile:
        return {'role': 'client', 'mobile': mobile}
    if username:
        return {'role': 'staff', 'username': username}
    return None


def get_authenticated_username() -> str | None:
    payload = get_authenticated_payload()
    if not payload or payload.get('role') != 'staff':
        return None
    return str(payload.get('username', '')).strip() or None


def get_authenticated_client_mobile() -> str | None:
    payload = get_authenticated_payload()
    if not payload or payload.get('role') != 'client':
        return None
    return str(payload.get('mobile', '')).strip() or None


def require_auth(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        username = get_authenticated_username()
        if not username:
            return jsonify({'error': 'Authentication required'}), 401

        g.current_user = username
        return view_function(*args, **kwargs)

    return wrapped_view


def require_client_auth(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        mobile = get_authenticated_client_mobile()
        if not mobile:
            return jsonify({'error': 'Client authentication required'}), 401

        g.current_client_mobile = mobile
        return view_function(*args, **kwargs)

    return wrapped_view


def normalize_patient(doc: dict, current_user: str | None = None) -> dict:
    created_by = str(doc.get('created_by', '')).strip()
    can_delete = bool(current_user and created_by and current_user == created_by)

    return {
        'MOBILE': doc.get('_id', ''),
        'NAME': doc.get('NAME', ''),
        'DOB': doc.get('DOB', ''),
        'HISTORY': doc.get('HISTORY', ''),
        'MEDICINES': doc.get('MEDICINES', ''),
        'CREATED_BY': created_by,
        'CAN_DELETE': can_delete,
        'CAN_EDIT': False,
        'IS_LOCKED': True,
    }


def normalize_appointment(doc: dict) -> dict:
    payment_status = str(doc.get('PAYMENT_STATUS') or doc.get('payment_status') or '').strip().upper()
    payment_method = str(doc.get('PAYMENT_METHOD') or doc.get('payment_method') or '').strip()
    payment_reference = str(doc.get('PAYMENT_REFERENCE') or doc.get('payment_reference') or '').strip()
    payment_amount = doc.get('PAYMENT_AMOUNT', doc.get('payment_amount', 0))

    if not payment_status:
        payment_status = 'PAID' if payment_reference or float(payment_amount or 0) > 0 else 'UNPAID'

    return {
        'PATIENT_ID': str(doc.get('_id', '')),
        'NAME': doc.get('NAME', ''),
        'EMAIL': doc.get('EMAIL', ''),
        'PHONE_NO': doc.get('PHONE_NO', ''),
        'GENDER': doc.get('GENDER', ''),
        'DOB': doc.get('DOB', ''),
        'STREAM': doc.get('STREAM', ''),
        'PAYMENT_STATUS': payment_status,
        'PAYMENT_METHOD': payment_method,
        'PAYMENT_REFERENCE': payment_reference,
        'PAYMENT_AMOUNT': payment_amount,
    }


def normalize_client_record(doc: dict) -> dict:
    created_at = doc.get('created_at')
    if isinstance(created_at, datetime):
        created_at_value = created_at.isoformat()
    else:
        created_at_value = str(created_at or '')

    return {
        'RECORD_ID': str(doc.get('_id', '')),
        'MOBILE': str(doc.get('MOBILE', '')).strip(),
        'NAME': str(doc.get('NAME', '')).strip(),
        'DOB': str(doc.get('DOB', '')).strip(),
        'HISTORY': str(doc.get('HISTORY', '')).strip(),
        'MEDICINES': str(doc.get('MEDICINES', '')).strip(),
        'CREATED_AT': created_at_value,
    }


def get_fallback_patients(current_user: str | None = None) -> list[dict]:
    return [normalize_patient(doc, current_user) for doc in sorted(fallback_patients.values(), key=lambda item: item.get('NAME', ''))]


def get_fallback_appointments() -> list[dict]:
    return [normalize_appointment(doc) for doc in reversed(list(fallback_appointments.values()))]


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.get('/')
def index():
    return jsonify(
        {
            'message': 'Clinic Management API is running',
            'endpoints': ['/api/health', '/api/auth/login', '/api/auth/me', '/api/patients', '/api/appointments'],
        }
    )


@app.get('/api')
def api_root():
    return jsonify({'message': 'Use /api/health or the authenticated resource endpoints'})


@app.post('/api/auth/login')
def login():
    payload = request.get_json(force=True, silent=True) or {}
    username = str(payload.get('username', '')).strip()
    password = str(payload.get('password', '')).strip()

    if username != AUTH_USERNAME or password != AUTH_PASSWORD:
        return jsonify({'error': 'Invalid username or password'}), 401

    token = create_auth_token(username)
    return jsonify({'token': token, 'user': {'username': username}})


@app.get('/api/auth/me')
@require_auth
def auth_me():
    return jsonify({'user': {'username': g.current_user}})


@app.post('/api/client/register')
def client_register():
    payload = request.get_json(force=True, silent=True) or {}
    mobile = str(payload.get('mobile', '')).strip()
    password = str(payload.get('password', '')).strip()
    display_name = str(payload.get('name', '')).strip() or mobile

    if not mobile or not password:
        return jsonify({'error': 'Mobile and password are required'}), 400
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    password_hash = generate_password_hash(password)

    try:
        existing = clients_collection.find_one({'_id': mobile}, {'_id': 1})
        if existing:
            return jsonify({'error': 'Client account already exists'}), 409

        clients_collection.insert_one(
            {
                '_id': mobile,
                'NAME': display_name,
                'PASSWORD_HASH': password_hash,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
        )
    except Exception:
        if mobile in fallback_clients:
            return jsonify({'error': 'Client account already exists'}), 409

        fallback_clients[mobile] = {
            '_id': mobile,
            'NAME': display_name,
            'PASSWORD_HASH': password_hash,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }

    token = create_auth_token(mobile, role='client')
    return jsonify({'token': token, 'client': {'mobile': mobile, 'name': display_name}}), 201


@app.post('/api/client/login')
def client_login():
    payload = request.get_json(force=True, silent=True) or {}
    mobile = str(payload.get('mobile', '')).strip()
    password = str(payload.get('password', '')).strip()

    if not mobile or not password:
        return jsonify({'error': 'Mobile and password are required'}), 400

    account = None
    try:
        account = clients_collection.find_one({'_id': mobile})
    except Exception:
        account = fallback_clients.get(mobile)

    if not account:
        return jsonify({'error': 'Client account not found. Please register first.'}), 404

    stored_hash = str(account.get('PASSWORD_HASH', '')).strip()
    if not stored_hash or not check_password_hash(stored_hash, password):
        return jsonify({'error': 'Invalid mobile or password'}), 401

    token = create_auth_token(mobile, role='client')
    return jsonify({'token': token, 'client': {'mobile': mobile, 'name': account.get('NAME', mobile)}})


@app.get('/api/client/me')
@require_client_auth
def client_me():
    mobile = g.current_client_mobile
    account = None

    try:
        account = clients_collection.find_one({'_id': mobile})
    except Exception:
        account = fallback_clients.get(mobile)

    name = str((account or {}).get('NAME', '')).strip() or mobile
    return jsonify({'client': {'mobile': mobile, 'name': name}})


@app.get('/api/client/records')
@require_client_auth
def client_get_records():
    mobile = g.current_client_mobile

    try:
        rows = [
            normalize_client_record(doc)
            for doc in client_records_collection.find({'MOBILE': mobile}).sort('created_at', -1)
        ]
        return jsonify(rows)
    except Exception:
        rows = [
            normalize_client_record(doc)
            for doc in fallback_client_records.values()
            if str(doc.get('MOBILE', '')).strip() == mobile
        ]
        rows.sort(key=lambda item: item.get('CREATED_AT', ''), reverse=True)
        return jsonify(rows)


@app.post('/api/client/records')
@require_client_auth
def client_add_record():
    mobile = g.current_client_mobile
    payload = request.get_json(force=True, silent=True) or {}
    name = str(payload.get('name', '')).strip()
    dob = str(payload.get('dob', '')).strip()
    history = str(payload.get('history', '')).strip()
    medicines = str(payload.get('medicines', '')).strip()

    if not all([name, dob, history, medicines]):
        return jsonify({'error': 'All record fields are required'}), 400

    record_doc = {
        'MOBILE': mobile,
        'NAME': name,
        'DOB': dob,
        'HISTORY': history,
        'MEDICINES': medicines,
        'created_at': datetime.utcnow(),
    }

    try:
        result = client_records_collection.insert_one(record_doc)
        record_doc['_id'] = result.inserted_id

        # Keep staff patient list in sync with the latest client record.
        patients_collection.update_one(
            {'_id': mobile},
            {
                '$set': {
                    'NAME': name,
                    'DOB': dob,
                    'HISTORY': history,
                    'MEDICINES': medicines,
                    'updated_at': datetime.utcnow(),
                    'updated_by': f'client:{mobile}',
                    'created_by': f'client:{mobile}',
                },
                '$setOnInsert': {
                    'created_at': datetime.utcnow(),
                },
            },
            upsert=True,
        )
    except Exception:
        record_id = str(uuid4())
        record_doc['_id'] = record_id
        fallback_client_records[record_id] = record_doc

        fallback_patients[mobile] = {
            '_id': mobile,
            'NAME': name,
            'DOB': dob,
            'HISTORY': history,
            'MEDICINES': medicines,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': f'client:{mobile}',
            'updated_by': f'client:{mobile}',
        }

    return jsonify({'message': 'Record saved successfully', 'record': normalize_client_record(record_doc)}), 201


@app.get('/api/patients')
@require_auth
def get_patients():
    try:
        rows = [
            normalize_patient(doc, g.current_user)
            for doc in patients_collection.find({}, {'_id': 1, 'NAME': 1, 'DOB': 1, 'HISTORY': 1, 'MEDICINES': 1, 'created_by': 1}).sort('NAME', 1)
        ]
        return jsonify(rows)
    except Exception:
        return jsonify(get_fallback_patients(g.current_user))


@app.post('/api/patients')
@require_auth
def add_patient():
    payload = request.get_json(force=True, silent=True) or {}
    mobile = str(payload.get('mobile', '')).strip()
    name = str(payload.get('name', '')).strip()
    dob = str(payload.get('dob', '')).strip()
    history = str(payload.get('history', '')).strip()
    medicines = str(payload.get('medicines', '')).strip()

    if not all([mobile, name, dob, history, medicines]):
        return jsonify({'error': 'All patient fields are required'}), 400

    try:
        existing = patients_collection.find_one({'_id': mobile})
        if existing:
            return jsonify({'error': 'Patient already exists'}), 409

        patients_collection.insert_one(
            {
                '_id': mobile,
                'NAME': name,
                'DOB': dob,
                'HISTORY': history,
                'MEDICINES': medicines,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'created_by': g.current_user,
                'updated_by': g.current_user,
            }
        )
        return jsonify({'message': 'Patient added successfully'}), 201
    except Exception:
        if mobile in fallback_patients:
            return jsonify({'error': 'Patient already exists'}), 409

        fallback_patients[mobile] = {
            '_id': mobile,
            'NAME': name,
            'DOB': dob,
            'HISTORY': history,
            'MEDICINES': medicines,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': g.current_user,
            'updated_by': g.current_user,
        }
        return jsonify({'message': 'Patient added successfully'}), 201


@app.put('/api/patients/<mobile>')
@require_auth
def update_patient(mobile: str):
    try:
        existing = patients_collection.find_one({'_id': mobile}, {'created_by': 1})
        if not existing:
            return jsonify({'error': 'Patient not found'}), 404

        created_by = str(existing.get('created_by', '')).strip()
        if created_by and created_by != g.current_user:
            return jsonify({'error': 'You can only edit your own patient records'}), 403

        return jsonify({'error': 'Saved patient records are locked and cannot be edited'}), 423
    except Exception:
        existing = fallback_patients.get(mobile)
        if not existing:
            return jsonify({'error': 'Patient not found'}), 404

        created_by = str(existing.get('created_by', '')).strip()
        if created_by and created_by != g.current_user:
            return jsonify({'error': 'You can only edit your own patient records'}), 403

        return jsonify({'error': 'Saved patient records are locked and cannot be edited'}), 423


@app.delete('/api/patients/<mobile>')
@require_auth
def delete_patient(mobile: str):
    try:
        existing = patients_collection.find_one({'_id': mobile}, {'created_by': 1})
        if not existing:
            return jsonify({'error': 'Patient not found'}), 404

        created_by = str(existing.get('created_by', '')).strip()
        if created_by and created_by != g.current_user:
            return jsonify({'error': 'You can only delete your own patient records'}), 403

        result = patients_collection.delete_one({'_id': mobile})
        if result.deleted_count == 0:
            return jsonify({'error': 'Patient not found'}), 404
        return jsonify({'message': 'Patient deleted successfully'})
    except Exception:
        deleted = fallback_patients.pop(mobile, None)
        if deleted is None:
            return jsonify({'error': 'Patient not found'}), 404

        created_by = str(deleted.get('created_by', '')).strip()
        if created_by and created_by != g.current_user:
            fallback_patients[mobile] = deleted
            return jsonify({'error': 'You can only delete your own patient records'}), 403

        return jsonify({'message': 'Patient deleted successfully'})


@app.get('/api/appointments')
@require_auth
def get_appointments():
    try:
        rows = [
            normalize_appointment(doc)
            for doc in appointments_collection.find(
                {},
                {
                    'NAME': 1,
                    'EMAIL': 1,
                    'PHONE_NO': 1,
                    'GENDER': 1,
                    'DOB': 1,
                    'STREAM': 1,
                    'PAYMENT_STATUS': 1,
                    'PAYMENT_METHOD': 1,
                    'PAYMENT_REFERENCE': 1,
                    'PAYMENT_AMOUNT': 1,
                },
            ).sort('_id', -1)
        ]
        return jsonify(rows)
    except Exception:
        return jsonify(get_fallback_appointments())


@app.post('/api/appointments')
@require_auth
def add_appointment():
    payload = request.get_json(force=True, silent=True) or {}
    name = str(payload.get('name', '')).strip()
    doctor = str(payload.get('doctor', '')).strip()
    phone = str(payload.get('phone', '')).strip()
    gender = str(payload.get('gender', '')).strip()
    date = str(payload.get('date', '')).strip()
    time = str(payload.get('time', '')).strip()
    payment_status = str(payload.get('payment_status', 'UNPAID')).strip() or 'UNPAID'
    payment_method = str(payload.get('payment_method', '')).strip()
    payment_reference = str(payload.get('payment_reference', '')).strip()
    payment_amount = payload.get('payment_amount', 0)

    if not all([name, doctor, phone, gender, date, time]):
        return jsonify({'error': 'All appointment fields are required'}), 400

    try:
        result = appointments_collection.insert_one(
            {
                'NAME': name,
                'EMAIL': doctor,
                'PHONE_NO': phone,
                'GENDER': gender,
                'DOB': date,
                'STREAM': time,
                'PAYMENT_STATUS': payment_status,
                'PAYMENT_METHOD': payment_method,
                'PAYMENT_REFERENCE': payment_reference,
                'PAYMENT_AMOUNT': payment_amount,
                'created_at': datetime.utcnow(),
                'created_by': g.current_user,
            }
        )
        return jsonify({'message': 'Appointment added successfully', 'PATIENT_ID': str(result.inserted_id)}), 201
    except Exception:
        patient_id = str(uuid4())
        fallback_appointments[patient_id] = {
            '_id': patient_id,
            'NAME': name,
            'EMAIL': doctor,
            'PHONE_NO': phone,
            'GENDER': gender,
            'DOB': date,
            'STREAM': time,
            'PAYMENT_STATUS': payment_status,
            'PAYMENT_METHOD': payment_method,
            'PAYMENT_REFERENCE': payment_reference,
            'PAYMENT_AMOUNT': payment_amount,
            'created_at': datetime.utcnow(),
            'created_by': g.current_user,
        }
        return jsonify({'message': 'Appointment added successfully', 'PATIENT_ID': patient_id}), 201


@app.delete('/api/appointments/<patient_id>')
@require_auth
def delete_appointment(patient_id: str):
    try:
        try:
            object_id = ObjectId(patient_id)
        except InvalidId:
            deleted = fallback_appointments.pop(patient_id, None)
            if deleted is None:
                return jsonify({'error': 'Invalid appointment ID'}), 400
            return jsonify({'message': 'Appointment deleted successfully'})

        result = appointments_collection.delete_one({'_id': object_id})
        if result.deleted_count == 0:
            return jsonify({'error': 'Appointment not found'}), 404
        return jsonify({'message': 'Appointment deleted successfully'})
    except Exception:
        deleted = fallback_appointments.pop(patient_id, None)
        if deleted is None:
            return jsonify({'error': 'Appointment not found'}), 404
        return jsonify({'message': 'Appointment deleted successfully'})


@app.post('/api/public/patients')
def public_add_patient():
    """Public endpoint - no authentication required for patient intake form"""
    payload = request.get_json(force=True, silent=True) or {}
    mobile = str(payload.get('mobile', '')).strip()
    name = str(payload.get('name', '')).strip()
    dob = str(payload.get('dob', '')).strip()
    history = str(payload.get('history', '')).strip()
    medicines = str(payload.get('medicines', '')).strip()

    if not all([mobile, name, dob, history, medicines]):
        return jsonify({'error': 'All patient fields are required'}), 400

    try:
        existing = patients_collection.find_one({'_id': mobile})
        if existing:
            return jsonify({'error': 'A patient record with this mobile number already exists'}), 409

        patients_collection.insert_one(
            {
                '_id': mobile,
                'NAME': name,
                'DOB': dob,
                'HISTORY': history,
                'MEDICINES': medicines,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'created_by': 'public_patient',
            }
        )
        return jsonify({'message': 'Patient registered successfully'}), 201
    except Exception:
        if mobile in fallback_patients:
            return jsonify({'error': 'A patient record with this mobile number already exists'}), 409

        fallback_patients[mobile] = {
            '_id': mobile,
            'NAME': name,
            'DOB': dob,
            'HISTORY': history,
            'MEDICINES': medicines,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': 'public_patient',
        }
        return jsonify({'message': 'Patient registered successfully'}), 201


@app.get('/api/public/patients/<mobile>')
def public_get_patient(mobile: str):
    """Public endpoint - patient can view their own record with just their mobile"""
    try:
        doc = patients_collection.find_one({'_id': mobile})
        if not doc:
            return jsonify({'error': 'Patient record not found'}), 404

        return jsonify(normalize_patient(doc, 'public_patient'))
    except Exception:
        patient = fallback_patients.get(mobile)
        if not patient:
            return jsonify({'error': 'Patient record not found'}), 404

        return jsonify(normalize_patient(patient, 'public_patient'))


@app.delete('/api/public/patients/<mobile>')
def public_delete_patient(mobile: str):
    """Public endpoint - patient can delete their own record"""
    try:
        result = patients_collection.delete_one({'_id': mobile})
        if result.deleted_count == 0:
            return jsonify({'error': 'Patient record not found'}), 404
        return jsonify({'message': 'Patient record deleted successfully'})
    except Exception:
        deleted = fallback_patients.pop(mobile, None)
        if deleted is None:
            return jsonify({'error': 'Patient record not found'}), 404
        return jsonify({'message': 'Patient record deleted successfully'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port)
