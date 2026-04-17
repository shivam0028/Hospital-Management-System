import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import LottieModule from 'lottie-react'
import WelcomePage from './WelcomePage'
import ClientAccessPage from './ClientAccessPage'
import PublicPatientIntake from './PublicPatientIntake'
import SavedPatientsPanel from './SavedPatientsPanel'
import SavedAppointmentsPanel from './SavedAppointmentsPanel'
import DashboardStats from './DashboardStats'
import PaymentPage from './PaymentPage'
import ReceiptPage from './ReceiptPage'
import AppointmentDetailsPage from './AppointmentDetailsPage'
import dashboardOrb from './assets/dashboard-orb.json'
import './App.css'

const Lottie = LottieModule.default ?? LottieModule

const API_BASE = '/api'

const emptyPatientForm = {
  mobile: '',
  name: '',
  dob: '',
  history: '',
  medicines: '',
}

const emptyAppointmentForm = {
  name: '',
  doctor: '',
  phone: '',
  gender: 'Male',
  date: '',
  time: '',
}

const defaultPaymentForm = {
  cardName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
  amount: 500,
}

const pageMotion = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  exit: { opacity: 0, y: -14, transition: { duration: 0.22, ease: 'easeInOut' } },
}

const staggerMotion = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.06,
    },
  },
}

const itemMotion = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

const parseResponseBody = async (response) => {
  const rawBody = await response.text()

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return { error: rawBody }
  }
}

function App() {
  const [view, setView] = useState('welcome')
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patientForm, setPatientForm] = useState(emptyPatientForm)
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm)
  const [pendingAppointment, setPendingAppointment] = useState(null)
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm)
  const [receiptData, setReceiptData] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [savingPatient, setSavingPatient] = useState(false)
  const [savingAppointment, setSavingAppointment] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const dashboardVisualRef = useRef(null)
  const orbOneRef = useRef(null)
  const orbTwoRef = useRef(null)

  const apiFetch = (path, options = {}) => {
    const headers = new Headers(options.headers || {})
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  }

  const navigateToView = (nextView) => {
    setView(nextView)
    window.scrollTo(0, 0)
  }

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [patientResponse, appointmentResponse] = await Promise.all([
        apiFetch('/patients'),
        apiFetch('/appointments'),
      ])

      const patientData = await parseResponseBody(patientResponse)
      const appointmentData = await parseResponseBody(appointmentResponse)

      if (!patientResponse.ok) {
        throw new Error(patientData.error || 'Failed to load patients')
      }
      if (!appointmentResponse.ok) {
        throw new Error(appointmentData.error || 'Failed to load appointments')
      }

      const normalizedPatients = Array.isArray(patientData)
        ? patientData.map((patient) => ({
            ...patient,
            PATIENT_ID: patient.PATIENT_ID ?? patient.id,
            MOBILE: patient.MOBILE ?? patient.mobile ?? '',
            NAME: patient.NAME ?? patient.name ?? '',
            DOB: patient.DOB ?? patient.dob ?? '',
            CREATED_BY: patient.CREATED_BY ?? patient.created_by ?? 'Admin',
          }))
        : []

      const normalizedAppointments = Array.isArray(appointmentData)
        ? appointmentData.map((appointment) => ({
            ...appointment,
            PATIENT_ID: appointment.PATIENT_ID ?? appointment.id,
            NAME: appointment.NAME ?? appointment.patient_name ?? 'Unknown',
            DOB: appointment.DOB ?? appointment.date ?? '',
            STREAM: appointment.STREAM ?? appointment.date ?? '',
            EMAIL: appointment.EMAIL ?? '-',
            GENDER: appointment.GENDER ?? '-',
          }))
        : []

      setPatients(normalizedPatients)
      setAppointments(normalizedAppointments)
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to connect to the database API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const patientHighlights = useMemo(
    () => [
      { label: 'Patients', value: String(patients.length) },
      { label: 'Visits', value: String(appointments.length) },
      { label: 'Status', value: error ? 'Offline' : 'Online' },
    ],
    [patients.length, appointments.length, error],
  )

  const recentAppointments = appointments.slice(0, 3).map((item) => ({
    time: item.STREAM || '-',
    name: item.NAME || '-',
    doctor: item.EMAIL || '-',
  }))

  useEffect(() => {
    if (view !== 'dashboard' || prefersReducedMotion) {
      return undefined
    }

    const context = gsap.context(() => {
      gsap.to(dashboardVisualRef.current, {
        y: -10,
        rotate: -2,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to(orbOneRef.current, {
        x: 18,
        y: 14,
        scale: 1.08,
        duration: 6.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to(orbTwoRef.current, {
        x: -16,
        y: -12,
        scale: 0.94,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, dashboardVisualRef)

    return () => context.revert()
  }, [view, prefersReducedMotion])

  const resetPatientForm = () => {
    setPatientForm(emptyPatientForm)
  }

  const resetAppointmentForm = () => {
    setAppointmentForm(emptyAppointmentForm)
  }

  const resetPaymentForm = () => {
    setPaymentForm(defaultPaymentForm)
  }

  const savePatient = async () => {
    const payload = {
      mobile: patientForm.mobile.trim(),
      name: patientForm.name.trim(),
      dob: patientForm.dob.trim(),
      history: patientForm.history.trim(),
      medicines: patientForm.medicines.trim(),
    }

    if (!payload.mobile || !payload.name || !payload.dob || !payload.history || !payload.medicines) {
      setError('Please fill all patient fields before saving.')
      return
    }

    setSavingPatient(true)
    setError('')

    try {
      const response = await apiFetch(
        '/patients',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await parseResponseBody(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save patient record')
      }
      await loadData()
      resetPatientForm()
      setView('patients')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save patient record')
    } finally {
      setSavingPatient(false)
    }
  }

  const deletePatient = async (mobileOrId) => {
    const targetPatient = patients.find(
      (patient) =>
        patient.PATIENT_ID === mobileOrId ||
        patient.id === mobileOrId ||
        patient.MOBILE === mobileOrId ||
        patient.mobile === mobileOrId,
    )
    const patientId = targetPatient?.PATIENT_ID ?? targetPatient?.id ?? (typeof mobileOrId === 'number' ? mobileOrId : null)

    if (!patientId) {
      setError('Unable to locate patient ID for delete action.')
      return
    }

    const confirmed = window.confirm(`Delete patient ${targetPatient?.NAME || targetPatient?.name || mobileOrId}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await apiFetch(
        `/patients/${patientId}`,
        {
          method: 'DELETE',
        },
      )
      const data = await parseResponseBody(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete patient record')
      }
      await loadData()
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete patient record')
    }
  }

  const saveAppointment = async () => {
    const payload = {
      name: appointmentForm.name.trim(),
      doctor: appointmentForm.doctor.trim(),
      phone: appointmentForm.phone.trim(),
      gender: appointmentForm.gender.trim(),
      date: appointmentForm.date.trim(),
      time: appointmentForm.time.trim(),
    }

    if (!payload.name || !payload.doctor || !payload.phone || !payload.gender || !payload.date || !payload.time) {
      setError('Please fill all appointment fields before booking.')
      return
    }

    setPendingAppointment(payload)
    setError('')
    setView('payment')
  }

  const updatePaymentForm = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }))
  }

  const completePaymentAndSaveAppointment = async () => {
    if (!pendingAppointment) {
      setError('No pending appointment found. Please fill the appointment form first.')
      setView('appointments')
      return
    }

    const cardName = paymentForm.cardName.trim()
    const cardNumber = paymentForm.cardNumber.replace(/\s+/g, '').trim()
    const expiry = paymentForm.expiry.trim()
    const cvv = paymentForm.cvv.trim()

    if (!cardName || cardNumber.length < 12 || !expiry || cvv.length < 3) {
      setError('Please enter valid payment details before continuing.')
      return
    }

    setSavingAppointment(true)
    setError('')

    try {
      const matchedPatient = patients.find((patient) => {
        const patientName = (patient.NAME || patient.name || '').trim().toLowerCase()
        const patientMobile = (patient.MOBILE || patient.mobile || '').trim()
        return (
          patientName === pendingAppointment.name.trim().toLowerCase() ||
          patientMobile === pendingAppointment.phone.trim()
        )
      })

      if (!matchedPatient) {
        throw new Error('Patient not found. Save patient details first, then book appointment.')
      }

      const patientId = matchedPatient.PATIENT_ID ?? matchedPatient.id
      if (!patientId) {
        throw new Error('Patient record is missing an ID.')
      }

      const paymentMeta = {
        ...pendingAppointment,
        payment_status: 'PAID',
        payment_amount: paymentForm.amount,
        payment_method: 'CARD',
        payment_reference: `PAY-${Date.now()}`,
      }

      const payload = {
        patient_id: patientId,
        date: `${pendingAppointment.date} ${pendingAppointment.time}`,
      }

      const response = await apiFetch(
        '/appointments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await parseResponseBody(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save appointment')
      }

      const now = new Date()
      setReceiptData({
        receiptNumber: `RCPT-${now.getTime()}`,
        appointmentId: data.id || 'N/A',
        name: paymentMeta.name,
        doctor: paymentMeta.doctor,
        phone: paymentMeta.phone,
        date: paymentMeta.date,
        time: paymentMeta.time,
        amount: paymentMeta.payment_amount,
        paymentMethod: paymentMeta.payment_method,
        paymentReference: paymentMeta.payment_reference,
        cardLast4: cardNumber.slice(-4),
        paidAt: now.toLocaleString(),
      })

      await loadData()
      resetAppointmentForm()
      setPendingAppointment(null)
      resetPaymentForm()
      setView('receipt')
    } catch (saveError) {
      setError(saveError.message || 'Unable to complete payment and save appointment')
    } finally {
      setSavingAppointment(false)
    }
  }

  const deleteAppointment = async (id) => {
    const confirmed = window.confirm(`Delete appointment ${id}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await apiFetch(
        `/appointments/${id}`,
        {
          method: 'DELETE',
        },
      )
      const data = await parseResponseBody(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to delete appointment')
      }
      await loadData()
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete appointment')
    }
  }

  const openAppointmentDetails = (appointment, returnView = 'savedAppointments') => {
    setSelectedAppointment({ ...appointment, RETURN_VIEW: returnView })
    setView('appointmentDetails')
  }

  const renderDashboard = () => (
    <motion.main
      key="dashboard"
      className="shell shell-dashboard dashboard-box"
      variants={pageMotion}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <motion.header className="hero hero-grid overview-glass" variants={staggerMotion} initial="hidden" animate="show">
        <motion.div className="hero-copy" variants={itemMotion}>
          <p className="kicker kicker-accent">City Care</p>
          <h1>Clinic Overview</h1>
          <p className="lead">A quick look at today&apos;s patients and appointments.</p>
          <div className="jump-row" aria-label="Quick navigation">
            {/* <button type="button" className="jump-button jump-button-active" onClick={() => navigateToView('dashboard')}>
              Overview
            </button> */}
            <button type="button" className="jump-button" onClick={() => navigateToView('welcome')}>
              Home
            </button>
            <button type="button" className="jump-button" onClick={() => navigateToView('savedPatients')}>
              Saved Patients
            </button>
            <button type="button" className="jump-button" onClick={() => navigateToView('savedAppointments')}>
              Saved Appointments
            </button>
          </div>
        </motion.div>

        <motion.div className="hero-visual" variants={itemMotion} ref={dashboardVisualRef}>
          <div className="visual-orb visual-orb-one" ref={orbOneRef} aria-hidden="true"></div>
          <div className="visual-orb visual-orb-two" ref={orbTwoRef} aria-hidden="true"></div>
          <Lottie animationData={dashboardOrb} loop autoplay className="hero-lottie" />
          <motion.div className="hero-visual-caption" variants={staggerMotion} initial="hidden" animate="show">
            <motion.div className="hero-stat-chip" variants={itemMotion}>
              <span>Patients</span>
              <strong>{patients.length}</strong>
            </motion.div>
            <motion.div className="hero-stat-chip" variants={itemMotion}>
              <span>Appointments</span>
              <strong>{appointments.length}</strong>
            </motion.div>
            <motion.div className="hero-stat-chip hero-stat-chip-wide" variants={itemMotion}>
              <span>System</span>
              <strong>{error ? 'Check connection' : 'Online'}</strong>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.header>

      {error ? <motion.div variants={itemMotion} className="notice notice-error">{error}</motion.div> : null}
      {loading ? <motion.div variants={itemMotion} className="notice">Loading data...</motion.div> : null}

      <motion.section className="grid" variants={staggerMotion} initial="hidden" animate="show">
        <motion.article className="panel panel-blue panel-equal" variants={itemMotion} whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}>
          <span className="panel-badge">Patients</span>
          <h2>Patient List</h2>
          <p>View, update, or add patient details.</p>
          <button type="button" onClick={() => setView('patients')}>
            Go to Patients
          </button>
        </motion.article>

        <motion.article className="panel panel-green panel-equal" variants={itemMotion} whileHover={{ y: -8, rotateX: 2, rotateY: 2 }}>
          <span className="panel-badge">Visits</span>
          <h2>Appointment List</h2>
          <p>Check bookings and add new appointments.</p>
          <button type="button" onClick={() => setView('appointments')}>
            Go to Appointments
          </button>
        </motion.article>
      </motion.section>

      <motion.section className="stats" variants={staggerMotion} initial="hidden" animate="show">
        {patientHighlights.map((item) => (
          <motion.div key={item.label} variants={itemMotion} whileHover={{ y: -6 }}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </motion.div>
        ))}
      </motion.section>

      <motion.section className="recent-panel" variants={itemMotion} initial="hidden" animate="show">
        <div className="section-heading">
          <h2>Recent Activity</h2>
          <span>Latest 3</span>
        </div>
        <div className="recent-list">
          {recentAppointments.length === 0 ? (
            <div className="empty-state">No appointments yet.</div>
          ) : (
            recentAppointments.map((item) => (
              <motion.div key={`${item.name}-${item.time}`} className="recent-card" whileHover={{ y: -4 }}>
                <strong>{item.name}</strong>
                <p>{item.doctor}</p>
                <span>{item.time}</span>
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </motion.main>
  )

  const renderPatients = () => (
    <motion.main key="patients" className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like" variants={pageMotion} initial="hidden" animate="show" exit="exit">
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={() => navigateToView('dashboard')}>
            Back to Overview
          </button>
          <div className="jump-row jump-row-tight" aria-label="Quick navigation">
            <button type="button" className="jump-button jump-button-active" onClick={() => navigateToView('patients')}>
              Patients
            </button>
            {/* <button type="button" className="jump-button" onClick={() => navigateToView('appointments')}>
              Appointments
            </button> */}
          </div>
          <p className="kicker">Patients</p>
          <h1>Patient Details</h1>
          <p className="lead">Add, edit, or remove patient information.</p>
        </div>

        <div className="top-summary">
          {patientHighlights.map((item) => (
            <div key={item.label} className="summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel detail-panel-green">
          <div className="section-heading">
            <h2>Patient Intake Form</h2>
            <span>Saved records are locked for editing</span>
          </div>

          <div className="record-form">
              <label>
              Name
              <input
                type="text"
                placeholder="Enter patient name"
                value={patientForm.name}
                onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })}
              />
            </label>
            <label>
              Mobile number
              <input
                type="text"
                placeholder="Enter patient mobile"
                value={patientForm.mobile}
                onChange={(event) => setPatientForm({ ...patientForm, mobile: event.target.value })}
              />
            </label>

            <label>
              Date of birth
              <input
                type="date"
                value={patientForm.dob}
                onChange={(event) => setPatientForm({ ...patientForm, dob: event.target.value })}
              />
            </label>
            <label className="full-width">
              Describe medical history and current condition
              <textarea
                rows="4"
                value={patientForm.history}
                onChange={(event) => setPatientForm({ ...patientForm, history: event.target.value })}
              />
            </label>
            <label className="full-width">
              Medication
              <textarea
                rows="3"
                value={patientForm.medicines}
                onChange={(event) => setPatientForm({ ...patientForm, medicines: event.target.value })}
              />
            </label>
          </div>

          <div className="action-row">
            <button type="button" onClick={savePatient} disabled={savingPatient}>
              {savingPatient ? 'Saving...' : 'Save Record'}
            </button>
            <button type="button" className="secondary-button" onClick={resetPatientForm}>
              Clear Form
            </button>
          </div>
        </article>

        <SavedPatientsPanel patients={patients} onDeletePatient={deletePatient} />
      </section>
    </motion.main>
  )

  const renderSavedPatients = () => (
    <motion.main key="saved-patients" className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like" variants={pageMotion} initial="hidden" animate="show" exit="exit">
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={() => navigateToView('dashboard')}>
            Back to Overview
          </button>
          <div className="jump-row jump-row-tight" aria-label="Quick navigation">
            {/* <button type="button" className="jump-button jump-button-active" onClick={() => navigateToView('savedPatients')}>
              Saved Patients
            </button> */}
            {/* <button type="button" className="jump-button" onClick={() => navigateToView('patients')}>
              Patient Form
            </button>
            <button type="button" className="jump-button" onClick={() => navigateToView('appointments')}>
              Appointments
            </button> */}
            <button type="button" className="jump-button" onClick={() => navigateToView('welcome')}>
              Home page
            </button>
          </div>
          <p className="kicker">Home Page</p>
          <h1>Saved Patient Records</h1>
          <p className="lead">View and manage records saved in the backend.</p>
        </div>

        <div className="top-summary">
          {patientHighlights.map((item) => (
            <div key={item.label} className="summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-grid detail-grid-single">
        <SavedPatientsPanel patients={patients} onDeletePatient={deletePatient} />
      </section>
    </motion.main>
  )

  const renderSavedAppointments = () => (
    <motion.main key="saved-appointments" className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like" variants={pageMotion} initial="hidden" animate="show" exit="exit">
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={() => navigateToView('dashboard')}>
            Back to Overview
          </button>
          <div className="jump-row jump-row-tight" aria-label="Quick navigation">
            {/* <button type="button" className="jump-button jump-button-active" onClick={() => navigateToView('savedAppointments')}>
              Saved Appointments
            </button> */}
            {/* <button type="button" className="jump-button" onClick={() => navigateToView('appointments')}>
              Book Appointment
            </button>
            <button type="button" className="jump-button" onClick={() => navigateToView('patients')}>
              Patients
            </button> */}
            <button type="button" className="jump-button" onClick={() => navigateToView('welcome')}>
              Home page
            </button>
          </div>
          <p className="kicker">Home page</p>
          <h1>Saved Appointment Records</h1>
          <p className="lead">View and manage all booked appointments.</p>
        </div>

        <div className="top-summary">
          <div className="summary-card">
            <span>Today</span>
            <strong>12 Apr 2026</strong>
          </div>
          <div className="summary-card">
            <span>Booked</span>
            <strong>{appointments.length}</strong>
          </div>
          <div className="summary-card">
            <span>Status</span>
            <strong>{error ? 'Check backend' : 'Online'}</strong>
          </div>
        </div>
      </section>

      <section className="detail-grid detail-grid-single">
        <SavedAppointmentsPanel
          appointments={appointments}
          onDeleteAppointment={deleteAppointment}
          onViewAppointment={openAppointmentDetails}
        />
      </section>
    </motion.main>
  )

  const renderAppointments = () => (
    <motion.main key="appointments" className="shell shell-dashboard dashboard-box page-layout detail-uniform overview-like" variants={pageMotion} initial="hidden" animate="show" exit="exit">
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={() => navigateToView('dashboard')}>
            Back to Overview
          </button>
          <div className="jump-row jump-row-tight" aria-label="Quick navigation">
            {/* <button type="button" className="jump-button" onClick={() => navigateToView('patients')}>
              Patients
            </button> */}
            <button type="button" className="jump-button jump-button-active" onClick={() => navigateToView('appointments')}>
              Appointments
            </button>
          </div>
          <p className="kicker">Appointments</p>
          <h1>Appointment Details</h1>
          <p className="lead">Book new visits and review upcoming ones.</p>
        </div>

        <div className="top-summary">
          <div className="summary-card">
            <span>Today</span>
            <strong>12 Apr 2026</strong>
          </div>
          <div className="summary-card">
            <span>Booked</span>
            <strong>{appointments.length}</strong>
          </div>
          <div className="summary-card">
            <span>Status</span>
            <strong>{error ? 'Check backend' : 'Online'}</strong>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel detail-panel-green">
          <div className="section-heading">
            <h2>New Appointment</h2>
            <span>Quick form</span>
          </div>

          <div className="record-form appointment-form">
            <label>
              Patient name
              <input
                type="text"
                placeholder="Enter name"
                value={appointmentForm.name}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, name: event.target.value })}
              />
            </label>
            <label>
              Doctor
              <select value={appointmentForm.doctor} onChange={(event) => setAppointmentForm({ ...appointmentForm, doctor: event.target.value })}>
              <option value="">Select doctor</option>
              <option value="Dr. Shivam">Dr. Shivam Gupta</option>
              <option value="Dr. Akshra singh">Dr. Akshra Singh</option>
              <option value="Dr. Ayush">Dr. Ayush Raj</option>
              <option value="Dr. Dev Verma">Dr. Dev Verma</option>
              </select>
            </label>
            <label>
              Phone
              <input
                type="text"
                placeholder="Phone number"
                value={appointmentForm.phone}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, phone: event.target.value })}
              />
            </label>
            <label>
              Gender
              <select
                value={appointmentForm.gender}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, gender: event.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                value={appointmentForm.date}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, date: event.target.value })}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                step="300"
                value={appointmentForm.time}
                onChange={(event) => setAppointmentForm({ ...appointmentForm, time: event.target.value })}
              />
            </label>
          </div>

          <div className="action-row">
            <button type="button" onClick={saveAppointment} disabled={savingAppointment}>
              {savingAppointment ? 'Saving...' : 'Save Appointment'}
            </button>
            <button type="button" className="secondary-button" onClick={resetAppointmentForm}>
              Clear Form
            </button>
          </div>
        </article>

        <aside className="detail-panel detail-panel-cream">
          <div className="section-heading">
            <h2>Upcoming Appointments</h2>
            <span>{appointments.length} records</span>
          </div>

          <div className="appointment-list">
            {appointments.length === 0 ? (
              <div className="empty-state">No appointment records found.</div>
            ) : (
              appointments.map((item) => (
                <div
                  key={item.PATIENT_ID}
                  className="appointment-item appointment-item-clickable"
                  onClick={() => openAppointmentDetails(item, 'appointments')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openAppointmentDetails(item, 'appointments')
                    }
                  }}
                >
                  <div>
                    <strong>{item.NAME}</strong>
                    <p>{item.EMAIL} • {item.GENDER}</p>
                  </div>
                  <div className="appointment-meta">
                    <span>{item.DOB}</span>
                    <button type="button" className="danger-button" onClick={() => deleteAppointment(item.PATIENT_ID)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="snapshot-list appointment-snapshot">
            <div>
              <p>Next slot</p>
              <strong>{appointments[0]?.STREAM || 'Nothing booked yet'}</strong>
            </div>
          </div>
        </aside>
      </section>
    </motion.main>
  )

  const renderDashboardStats = () => (
    <DashboardStats
      patients={patients}
      appointments={appointments}
      error={error}
      onNavigate={navigateToView}
    />
  )

  const renderPayment = () => (
    <PaymentPage
      pendingAppointment={pendingAppointment}
      paymentForm={paymentForm}
      onChangePaymentForm={updatePaymentForm}
      onPay={completePaymentAndSaveAppointment}
      onCancel={() => navigateToView('appointments')}
      processingPayment={savingAppointment}
      
    />
  )

  const renderReceipt = () => (
    <ReceiptPage
      receipt={receiptData}
      onGoHome={() => navigateToView('welcome')}
      onGoSavedAppointments={() => navigateToView('savedAppointments')}
    />
  )

  const renderAppointmentDetails = () => (
    <AppointmentDetailsPage
      appointment={selectedAppointment}
      onBack={() => navigateToView(selectedAppointment?.RETURN_VIEW || 'savedAppointments')}
    />
  )

  const renderWelcome = () => (
    <WelcomePage
      onEnterDashboard={() => navigateToView('dashboard')}
      onGoToPatients={() => navigateToView('patients')}
      onGoToSavedPatients={() => navigateToView('savedPatients')}
      onGoToSavedAppointments={() => navigateToView('savedAppointments')}
      onGoToDashboardStats={() => navigateToView('dashboardStats')}
    />
  )

  const renderPublicIntake = () => (
    <PublicPatientIntake
      onGoHome={() => navigateToView('welcome')}
      onGoAdminDashboard={() => navigateToView('welcome')}
    />
  )

  const renderClientAccess = () => (
    <ClientAccessPage
      onBackHome={() => navigateToView('welcome')}
    />
  )

  const viewMap = {
    welcome: renderWelcome,
    dashboard: renderDashboard,
    patients: renderPatients,
    savedPatients: renderSavedPatients,
    appointments: renderAppointments,
    savedAppointments: renderSavedAppointments,
    dashboardStats: renderDashboardStats,
    payment: renderPayment,
    receipt: renderReceipt,
    appointmentDetails: renderAppointmentDetails,
    publicIntake: renderPublicIntake,
    clientAccess: renderClientAccess,
  }

  const renderer = viewMap[view] || renderWelcome

  return (
    <AnimatePresence mode="wait" initial={false}>
      {renderer()}
    </AnimatePresence>
  )
}

export default App
