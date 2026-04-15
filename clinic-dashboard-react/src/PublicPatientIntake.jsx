import { useState } from 'react'
import { motion } from 'framer-motion'
import './App.css'

const emptyForm = {
  mobile: '',
  name: '',
  dob: '',
  history: '',
  medicines: '',
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

export default function PublicPatientIntake({ onGoHome, onGoAdminDashboard }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submittedMobile, setSubmittedMobile] = useState('')

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { mobile, name, dob, history, medicines } = form

    if (!mobile || !name || !dob || !history || !medicines) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/public/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, name, dob, history, medicines }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSuccess(true)
      setSubmittedMobile(mobile)
      setForm(emptyForm)
    } catch (err) {
      setError(err.message || 'Unable to submit form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.main
        key="intake-success"
        className="shell shell-dashboard dashboard-box auth-shell"
        variants={pageMotion}
        initial="hidden"
        animate="show"
        exit="exit"
      >
        <section className="auth-panel">
          <p className="kicker kicker-accent">Registration Complete</p>
          <h1>Thank you for registering!</h1>
          <p className="lead">Your patient information has been successfully saved.</p>

          <div className="notice" style={{ marginTop: '1rem', background: '#f0f9ff', borderColor: '#b3d9ff', color: '#0c4a6e' }}>
            <strong>Mobile Number:</strong> {submittedMobile}
            <br />
            <small style={{ marginTop: '0.5rem', display: 'block' }}>You can use this number to view or manage your record.</small>
          </div>

          <div className="action-row" style={{ marginTop: '2rem', gap: '0.65rem' }}>
            <button type="button" onClick={() => { setSuccess(false); setForm(emptyForm); }} style={{ marginRight: 'auto' }}>
              Register Another Patient
            </button>
            <button type="button" className="secondary-button" onClick={onGoHome}>
              Back to Home
            </button>
          </div>
        </section>
      </motion.main>
    )
  }

  return (
    <motion.main
      key="patient-intake"
      className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
      variants={pageMotion}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={onGoHome}>
            Back to Home
          </button>
          <p className="kicker">Patient Registration</p>
          <h1>Patient Intake Form</h1>
          <p className="lead">Register your medical information without needing an account.</p>
        </div>

        <div className="top-summary">
          <div className="summary-card">
            <span>Step</span>
            <strong>1 of 1</strong>
          </div>
          <div className="summary-card">
            <span>Type</span>
            <strong>Public Form</strong>
          </div>
          <div className="summary-card">
            <span>Status</span>
            <strong>Open</strong>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel detail-panel-green">
          <div className="section-heading">
            <h2>Your Medical Details</h2>
            <span>Required Information</span>
          </div>

          <form className="record-form" onSubmit={handleSubmit}>
            <label>
              Mobile Number *
              <input
                type="text"
                placeholder="Enter your mobile number"
                value={form.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                required
              />
            </label>
            <label>
              Full Name *
              <input
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </label>

            <label>
              Date of Birth *
              <input
                type="date"
                value={form.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                required
              />
            </label>
            <label className="full-width">
              Medical History & Current Condition *
              <textarea
                rows="4"
                placeholder="Describe any chronic conditions, allergies, or past illnesses"
                value={form.history}
                onChange={(e) => handleInputChange('history', e.target.value)}
                required
              />
            </label>
            <label className="full-width">
              Current Medications *
              <textarea
                rows="3"
                placeholder="List all medications you're currently taking"
                value={form.medicines}
                onChange={(e) => handleInputChange('medicines', e.target.value)}
                required
              />
            </label>

            {error && <div className="notice notice-error">{error}</div>}

            <div className="action-row">
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
              <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}>
                Clear Form
              </button>
            </div>
          </form>
        </article>

        <aside className="detail-panel detail-panel-cream">
          <div className="section-heading">
            <h2>Information</h2>
            <span>Important</span>
          </div>

          <div style={{ display: 'grid', gap: '1rem', color: '#45556a', fontSize: '0.94rem', lineHeight: '1.6' }}>
            <div>
              <strong style={{ color: '#12344d' }}>✓ No Account Needed</strong>
              <p>Just fill in your details and submit. No registration or password required.</p>
            </div>

            <div>
              <strong style={{ color: '#12344d' }}>✓ Mobile Number</strong>
              <p>Use your mobile to view or manage your record later.</p>
            </div>

            <div>
              <strong style={{ color: '#12344d' }}>✓ Secure & Private</strong>
              <p>Your medical information is safely stored in our system.</p>
            </div>

            <div>
              <strong style={{ color: '#12344d' }}>✓ Staff Access</strong>
              <p>Hospital staff can only access records during your visit using your mobile number.</p>
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(200, 216, 232, 0.4)' }}>
            <p style={{ fontSize: '0.85rem', color: '#5d768a' }}>
              Already have an account? <br />
              <button
                type="button"
                className="jump-button"
                onClick={onGoAdminDashboard}
                style={{ marginTop: '0.6rem', fontSize: '0.9rem' }}
              >
                Go to Login
              </button>
            </p>
          </div>
        </aside>
      </section>
    </motion.main>
  )
}
