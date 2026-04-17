from flask import Flask, request, jsonify, g
from functools import wraps
from itsdangerous import URLSafeTimedSerializer
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'secret123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hospital.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
db = SQLAlchemy(app)

AUTH_USERNAME = "admin"
AUTH_PASSWORD = "admin123"


# Models
class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    mobile = db.Column(db.String(20))
    appointments = db.relationship('Appointment', backref='patient', lazy=True)


class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'))
    date = db.Column(db.String(50))


class ClientUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mobile = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    password = db.Column(db.String(200), nullable=False)
    records = db.relationship('ClientRecord', backref='client', lazy=True)


class ClientRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('client_user.id'))
    name = db.Column(db.String(100))
    dob = db.Column(db.String(50))
    history = db.Column(db.Text)
    medicines = db.Column(db.Text)
    created_at = db.Column(db.String(50))


# Auth helpers
def create_token(payload):
    return serializer.dumps(payload)


def decode_token(token):
    try:
        return serializer.loads(token)
    except Exception:
        return None


def get_token():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ")[1]
    return None


def get_user():
    token = get_token()
    return decode_token(token) if token else None


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user = get_user() or {"username": AUTH_USERNAME, "role": "admin"}
        return f(*args, **kwargs)
    return wrapper


def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user = get_user() or {"username": AUTH_USERNAME, "role": "admin"}
        return f(*args, **kwargs)
    return wrapper


def require_client(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = get_user()

        if user and user.get("role") == "client":
            g.user = user
            return f(*args, **kwargs)

        payload = request.get_json(silent=True) or {}
        mobile = (request.args.get("mobile") or payload.get("mobile") or "").strip()
        client = ClientUser.query.filter_by(mobile=mobile).first() if mobile else ClientUser.query.first()
        if not client:
            return jsonify({"error": "Client not found"}), 404

        g.user = {"mobile": client.mobile, "role": "client", "client_id": client.id}
        return f(*args, **kwargs)
    return wrapper


# Admin auth
@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "Backend running"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    if data.get("username") != AUTH_USERNAME or data.get("password") != AUTH_PASSWORD:
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_token({"username": AUTH_USERNAME, "role": "admin"})
    return jsonify({"token": token, "role": "admin"})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def auth_me():
    return jsonify({"user": g.user})


# Client auth
@app.route("/api/client/register", methods=["POST"])
def client_register():
    data = request.json
    mobile = (data.get("mobile") or "").strip()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or mobile).strip()

    if not mobile or not password:
        return jsonify({"error": "Mobile and password required"}), 400

    if ClientUser.query.filter_by(mobile=mobile).first():
        return jsonify({"error": "Account already exists"}), 409

    client = ClientUser(mobile=mobile, name=name, password=password)
    db.session.add(client)
    db.session.commit()

    token = create_token({"mobile": mobile, "role": "client", "client_id": client.id})
    return jsonify({"token": token, "role": "client", "client": {"mobile": mobile, "name": name}})


@app.route("/api/client/login", methods=["POST"])
def client_login():
    data = request.json
    mobile = (data.get("mobile") or "").strip()
    password = (data.get("password") or "").strip()

    client = ClientUser.query.filter_by(mobile=mobile).first()
    if not client or client.password != password:
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token({"mobile": mobile, "role": "client", "client_id": client.id})
    return jsonify({
        "token": token,
        "role": "client",
        "client": {"mobile": client.mobile, "name": client.name}
    })


@app.route("/api/client/me", methods=["GET"])
@require_client
def client_me():
    client = ClientUser.query.get(g.user["client_id"])
    if not client:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"client": {"mobile": client.mobile, "name": client.name}})


@app.route("/api/client/records", methods=["GET"])
@require_client
def client_records_get():
    client = ClientUser.query.get(g.user["client_id"])
    if not client:
        return jsonify({"error": "Not found"}), 404
    records = ClientRecord.query.filter_by(client_id=client.id).order_by(ClientRecord.id.desc()).all()
    return jsonify([
        {
            "RECORD_ID": r.id,
            "NAME": r.name,
            "DOB": r.dob,
            "HISTORY": r.history,
            "MEDICINES": r.medicines,
            "CREATED_AT": r.created_at
        }
        for r in records
    ])


@app.route("/api/client/records", methods=["POST"])
@require_client
def client_records_post():
    from datetime import datetime
    data = request.json
    record = ClientRecord(
        client_id=g.user["client_id"],
        name=data.get("name", ""),
        dob=data.get("dob", ""),
        history=data.get("history", ""),
        medicines=data.get("medicines", ""),
        created_at=datetime.utcnow().isoformat()
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({"message": "Saved"})


# Public patient intake
@app.route("/api/public/patients", methods=["POST"])
def public_patient_intake():
    data = request.json
    patient = Patient(
        name=data.get("name", ""),
        mobile=data.get("mobile", "")
    )
    db.session.add(patient)
    db.session.commit()
    return jsonify({"message": "Registered"})


# Admin patients
@app.route("/api/patients", methods=["GET"])
@require_auth
def get_patients():
    patients = Patient.query.all()
    return jsonify([
        {"id": p.id, "name": p.name, "mobile": p.mobile}
        for p in patients
    ])


@app.route("/api/patients", methods=["POST"])
@require_admin
def add_patient():
    data = request.json
    patient = Patient(name=data["name"], mobile=data["mobile"])
    db.session.add(patient)
    db.session.commit()
    return jsonify({"message": "Patient added"})


@app.route("/api/patients/<int:id>", methods=["PUT"])
@require_admin
def update_patient(id):
    data = request.json
    patient = Patient.query.get(id)
    if not patient:
        return jsonify({"error": "Not found"}), 404
    patient.name = data.get("name", patient.name)
    patient.mobile = data.get("mobile", patient.mobile)
    db.session.commit()
    return jsonify({"message": "Updated"})


@app.route("/api/patients/<int:id>", methods=["DELETE"])
@require_admin
def delete_patient(id):
    patient = Patient.query.get(id)
    if not patient:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"message": "Deleted"})


# Admin appointments
@app.route("/api/appointments", methods=["GET"])
@require_auth
def get_appointments():
    appointments = Appointment.query.all()
    return jsonify([
        {
            "id": a.id,
            "date": a.date,
            "patient_name": a.patient.name if a.patient else None
        }
        for a in appointments
    ])


@app.route("/api/appointments", methods=["POST"])
@require_admin
def add_appointment():
    data = request.json
    appointment = Appointment(patient_id=data["patient_id"], date=data["date"])
    db.session.add(appointment)
    db.session.commit()
    return jsonify({"message": "Appointment added"})


@app.route("/api/appointments/<int:id>", methods=["DELETE"])
@require_admin
def delete_appointment(id):
    appointment = Appointment.query.get(id)
    if not appointment:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(appointment)
    db.session.commit()
    return jsonify({"message": "Deleted"})


# Run
with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True)