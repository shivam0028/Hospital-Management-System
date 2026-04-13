from __future__ import annotations

import os
from datetime import datetime
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)


@app.errorhandler(HTTPException)
def handle_http_exception(exc: HTTPException):
    return jsonify({'error': exc.description or exc.name}), exc.code


@app.errorhandler(Exception)
def handle_unexpected_exception(exc: Exception):
    return jsonify({'error': str(exc) or 'Internal server error'}), 500

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'clinic_management_system')
MONGO_PATIENTS_COLLECTION = os.getenv('MONGO_PATIENTS_COLLECTION', 'patients')
MONGO_APPOINTMENTS_COLLECTION = os.getenv('MONGO_APPOINTMENTS_COLLECTION', 'appointments')
MONGO_SERVER_SELECTION_TIMEOUT_MS = int(os.getenv('MONGO_SERVER_SELECTION_TIMEOUT_MS', '1500'))

mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS)
mongo_db = mongo_client[MONGO_DB_NAME]
patients_collection = mongo_db[MONGO_PATIENTS_COLLECTION]
appointments_collection = mongo_db[MONGO_APPOINTMENTS_COLLECTION]

fallback_patients: dict[str, dict] = {}
fallback_appointments: dict[str, dict] = {}


def normalize_patient(doc: dict) -> dict:
    return {
        'MOBILE': doc.get('_id', ''),
        'NAME': doc.get('NAME', ''),
        'DOB': doc.get('DOB', ''),
        'HISTORY': doc.get('HISTORY', ''),
        'MEDICINES': doc.get('MEDICINES', ''),
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


def get_fallback_patients() -> list[dict]:
    return [normalize_patient(doc) for doc in sorted(fallback_patients.values(), key=lambda item: item.get('NAME', ''))]


def get_fallback_appointments() -> list[dict]:
    return [normalize_appointment(doc) for doc in reversed(list(fallback_appointments.values()))]


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.get('/api/patients')
def get_patients():
    try:
        rows = [normalize_patient(doc) for doc in patients_collection.find({}, {'_id': 1, 'NAME': 1, 'DOB': 1, 'HISTORY': 1, 'MEDICINES': 1}).sort('NAME', 1)]
        return jsonify(rows)
    except Exception:
        return jsonify(get_fallback_patients())


@app.post('/api/patients')
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
        }
        return jsonify({'message': 'Patient added successfully'}), 201


@app.put('/api/patients/<mobile>')
def update_patient(mobile: str):
    payload = request.get_json(force=True, silent=True) or {}
    name = str(payload.get('name', '')).strip()
    dob = str(payload.get('dob', '')).strip()
    history = str(payload.get('history', '')).strip()
    medicines = str(payload.get('medicines', '')).strip()

    if not all([name, dob, history, medicines]):
        return jsonify({'error': 'All patient fields are required'}), 400

    try:
        result = patients_collection.update_one(
            {'_id': mobile},
            {
                '$set': {
                    'NAME': name,
                    'DOB': dob,
                    'HISTORY': history,
                    'MEDICINES': medicines,
                    'updated_at': datetime.utcnow(),
                }
            },
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Patient not found'}), 404
        return jsonify({'message': 'Patient updated successfully'})
    except Exception:
        existing = fallback_patients.get(mobile)
        if not existing:
            return jsonify({'error': 'Patient not found'}), 404

        existing.update(
            {
                'NAME': name,
                'DOB': dob,
                'HISTORY': history,
                'MEDICINES': medicines,
                'updated_at': datetime.utcnow(),
            }
        )
        return jsonify({'message': 'Patient updated successfully'})


@app.delete('/api/patients/<mobile>')
def delete_patient(mobile: str):
    try:
        result = patients_collection.delete_one({'_id': mobile})
        if result.deleted_count == 0:
            return jsonify({'error': 'Patient not found'}), 404
        return jsonify({'message': 'Patient deleted successfully'})
    except Exception:
        deleted = fallback_patients.pop(mobile, None)
        if deleted is None:
            return jsonify({'error': 'Patient not found'}), 404
        return jsonify({'message': 'Patient deleted successfully'})


@app.get('/api/appointments')
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
        }
        return jsonify({'message': 'Appointment added successfully', 'PATIENT_ID': patient_id}), 201


@app.delete('/api/appointments/<patient_id>')
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
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(host='0.0.0.0', port=port)
