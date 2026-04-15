# 🏥 Hospital Management System (HMS)

##  Overview

The Hospital Management System (HMS) is a full-stack web application designed to manage hospital operations efficiently.
It includes modules for patients, doctors, appointments, billing.

This project is built using **React (Frontend)** and **Node.js / Backend (API)**.

---

##  Project Structure

```
HMS/
│
├── backend/                     # Backend (API & server)
│   ├── app.py / server.js
│   ├── requirements.txt
│
├── clinic-dashboard-react/     # Frontend (React App)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│
├── README.md
```

---

##  Features

###  Dashboard

* Overview of hospital data
* Displays counts (Patients, Doctors, Appointments, Bills)
* Protected by backend authentication for write actions

###  Patient Management

* Add / Edit / Delete patients
* View patient records

###  Doctor Management

* Manage doctor details
* Specialization tracking

###  Appointment System

* Book appointments
* Assign doctor to patient
* Track status

###  Billing System

* Generate bills
* Track payment (Paid / Pending)
* View billing history

##  Technologies Used

###  Frontend

* React (Vite)
* HTML, CSS, JavaScript

###  Backend

* Python / Node.js
* REST API

###  Database

* JSON / MongoDB (optional)

---

##  Installation & Setup

### 1️ Clone Repository

```bash
git clone <your-repo-url>
cd HMS
```

---

###  Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Set these environment variables before starting the backend if you want to change the defaults:

* `AUTH_USERNAME`
* `AUTH_PASSWORD`
* `FLASK_SECRET_KEY`
* `CORS_ORIGINS`
* `MONGO_URI`

OR (if Node backend)

```bash
npm install
npm start
```

---

### 3️ Frontend Setup

```bash
cd clinic-dashboard-react
npm install
npm run dev
```

---


##  Validation & Error Handling

* Form validation implemented
* API error handling
* Required fields check
* Proper user feedback

---

## Future Enhancements

*  Analytics dashboard
*  Database integration (MongoDB)
*  Deployment (Netlify / Render)

---

##  References

* Python Documentation
* React Documentation
* Tkinter Documentation
* WHO Health Data
* Software Engineering – Pressman

---

## Author
**Shivam Kumar**
B.Tech Student

**Ayush Raj**
B.Tech Student

---

##  Conclusion

This project demonstrates a real-world hospital management system using modern web technologies.
It helps in understanding frontend-backend integration, API handling, and UI design.

---

⭐ *If you like this project, give it a star on GitHub!*
