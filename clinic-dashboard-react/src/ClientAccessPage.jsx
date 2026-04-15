import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import './App.css'

const CLIENT_TOKEN_STORAGE_KEY = 'clinic-dashboard-client-token'
const CLIENT_MOBILE_STORAGE_KEY = 'clinic-dashboard-client-mobile'

const authDefaults = {
  mobile: '',
  password: '',
  name: '',
}

const recordDefaults = {
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

const formatCreatedAt = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function ClientAccessPage({ onBackHome }) {
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(authDefaults)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [authError, setAuthError] = useState('')

  const [clientToken, setClientToken] = useState(() => window.localStorage.getItem(CLIENT_TOKEN_STORAGE_KEY) || '')
  const [clientMobile, setClientMobile] = useState(() => window.localStorage.getItem(CLIENT_MOBILE_STORAGE_KEY) || '')
  const [clientName, setClientName] = useState('')
  const [loadingClient, setLoadingClient] = useState(true)

  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordForm, setRecordForm] = useState(recordDefaults)

  const recordCountLabel = useMemo(() => `${records.length} saved forms`, [records.length])

  const setClientSession = (token, mobile, name = '') => {
    window.localStorage.setItem(CLIENT_TOKEN_STORAGE_KEY, token)
    window.localStorage.setItem(CLIENT_MOBILE_STORAGE_KEY, mobile)
    setClientToken(token)
    setClientMobile(mobile)
    setClientName(name || mobile)
  }

  const clearClientSession = () => {
    window.localStorage.removeItem(CLIENT_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(CLIENT_MOBILE_STORAGE_KEY)
    setClientToken('')
    setClientMobile('')
    setClientName('')
    setRecords([])
    setRecordForm(recordDefaults)
    setAuthError('')
    setRecordError('')
  }

  const apiFetch = (path, options = {}) => {
    const headers = new Headers(options.headers || {})
    if (clientToken) {
      headers.set('Authorization', `Bearer ${clientToken}`)
    }

    return fetch(`/api${path}`, {
      ...options,
      headers,
    })
  }

  const loadClientRecords = async () => {
    if (!clientToken) {
      setRecords([])
      return
    }

    setRecordsLoading(true)
    setRecordError('')

    try {
      const response = await apiFetch('/client/records')
      const data = await parseResponseBody(response)

      if (response.status === 401) {
        clearClientSession()
        return
      }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load saved records')
      }

      setRecords(data)
      if (data.length > 0) {
        const latest = data[0]
        setRecordForm({
          name: latest.NAME || '',
          dob: latest.DOB || '',
          history: latest.HISTORY || '',
          medicines: latest.MEDICINES || '',
        })
      }
    } catch (error) {
      setRecordError(error.message || 'Failed to load saved records')
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      if (!clientToken) {
        if (!cancelled) {
          setLoadingClient(false)
        }
        return
      }

      try {
        const response = await apiFetch('/client/me')
        const data = await parseResponseBody(response)

        if (response.status === 401 || !response.ok) {
          clearClientSession()
          return
        }

        if (!cancelled) {
          setClientName(data.client?.name || clientMobile)
          await loadClientRecords()
        }
      } catch {
        if (!cancelled) {
          clearClientSession()
        }
      } finally {
        if (!cancelled) {
          setLoadingClient(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const handleClientAuth = async () => {
    const mobile = authForm.mobile.trim()
    const password = authForm.password
    const name = authForm.name.trim()

    if (!mobile || !password || (authMode === 'register' && !name)) {
      setAuthError(authMode === 'register' ? 'Mobile, name and password are required.' : 'Mobile and password are required.')
      return
    }

    setAuthenticating(true)
    setAuthError('')

    try {
      const endpoint = authMode === 'register' ? '/client/register' : '/client/login'
      const body = authMode === 'register' ? { mobile, password, name } : { mobile, password }

      const response = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await parseResponseBody(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to continue')
      }

      const token = data.token || ''
      const client = data.client || {}
      setClientSession(token, client.mobile || mobile, client.name || name || mobile)
      setAuthForm(authDefaults)
      await loadClientRecords()
    } catch (error) {
      setAuthError(error.message || 'Unable to continue')
    } finally {
      setAuthenticating(false)
      setLoadingClient(false)
    }
  }

  const saveNewRecord = async () => {
    const payload = {
      name: recordForm.name.trim(),
      dob: recordForm.dob.trim(),
      history: recordForm.history.trim(),
      medicines: recordForm.medicines.trim(),
    }

    if (!payload.name || !payload.dob || !payload.history || !payload.medicines) {
      setRecordError('Please fill all fields before saving.')
      return
    }

    setSavingRecord(true)
    setRecordError('')

    try {
      const response = await apiFetch('/client/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await parseResponseBody(response)

      if (response.status === 401) {
        clearClientSession()
        return
      }
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save record')
      }

      await loadClientRecords()
    } catch (error) {
      setRecordError(error.message || 'Unable to save record')
    } finally {
      setSavingRecord(false)
    }
  }

  const useLatestRecordAsTemplate = () => {
    if (!records.length) {
      return
    }

    const latest = records[0]
    setRecordForm({
      name: latest.NAME || '',
      dob: latest.DOB || '',
      history: latest.HISTORY || '',
      medicines: latest.MEDICINES || '',
    })
  }

  if (loadingClient) {
    return (
      <motion.main key="client-loading" className="shell shell-dashboard dashboard-box auth-shell" variants={pageMotion} initial="hidden" animate="show" exit="exit">
        <section className="auth-panel">
          <p className="kicker kicker-accent">Client Portal</p>
          <h1>Checking your client session</h1>
          <div className="notice">Loading...</div>
        </section>
      </motion.main>
    )
  }

  if (!clientToken) {
    return (
      <motion.main key="client-auth" className="shell shell-dashboard dashboard-box auth-shell" variants={pageMotion} initial="hidden" animate="show" exit="exit">
        <section className="auth-panel">
          <p className="kicker kicker-accent">Client Portal</p>
          <h1>{authMode === 'register' ? 'Create patient account' : 'Patient login'}</h1>
          <p className="lead">Log in once and you can revisit your saved medical records anytime.</p>

          {authError ? <div className="notice notice-error">{authError}</div> : null}

          <div className="record-form auth-form">
            <label>
              Mobile number
              <input
                type="text"
                placeholder="Enter mobile number"
                value={authForm.mobile}
                onChange={(event) => setAuthForm({ ...authForm, mobile: event.target.value })}
              />
            </label>
            {authMode === 'register' ? (
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                />
              </label>
            ) : null}
            <label>
              Password
              <div className="password-input-row">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleClientAuth()
                    }
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowAuthPassword((prev) => !prev)}
                  aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                >
                  {showAuthPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          </div>

          <div className="action-row">
            <button type="button" onClick={() => void handleClientAuth()} disabled={authenticating}>
              {authenticating ? 'Please wait...' : authMode === 'register' ? 'Create Account' : 'Login'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setAuthMode(authMode === 'register' ? 'login' : 'register')
                setAuthError('')
              }}
            >
              {authMode === 'register' ? 'Already have account?' : 'Create new account'}
            </button>
            <button type="button" className="secondary-button" onClick={onBackHome}>
              Back to Home
            </button>
          </div>
        </section>
      </motion.main>
    )
  }

  return (
    <motion.main key="client-portal" className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like" variants={pageMotion} initial="hidden" animate="show" exit="exit">
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={onBackHome}>
            Back to Home
          </button>
          <p className="kicker">Client Portal</p>
          <h1>Welcome {clientName || clientMobile}</h1>
          <p className="lead">View your previous forms and submit a new one anytime.</p>
        </div>

        <div className="top-summary">
          <div className="summary-card">
            <span>Mobile</span>
            <strong>{clientMobile}</strong>
          </div>
          <div className="summary-card">
            <span>History</span>
            <strong>{recordCountLabel}</strong>
          </div>
          <div className="summary-card">
            <span>Session</span>
            <strong>Active</strong>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel detail-panel-green">
          <div className="section-heading">
            <h2>Fill New Form</h2>
            <span>Saved to your account</span>
          </div>

          <div className="record-form">
            <label>
              Name
              <input
                type="text"
                value={recordForm.name}
                onChange={(event) => setRecordForm({ ...recordForm, name: event.target.value })}
              />
            </label>
            <label>
              Date of birth
              <input
                type="date"
                value={recordForm.dob}
                onChange={(event) => setRecordForm({ ...recordForm, dob: event.target.value })}
              />
            </label>
            <label className="full-width">
              Medical history
              <textarea
                rows="4"
                value={recordForm.history}
                onChange={(event) => setRecordForm({ ...recordForm, history: event.target.value })}
              />
            </label>
            <label className="full-width">
              Medicines
              <textarea
                rows="3"
                value={recordForm.medicines}
                onChange={(event) => setRecordForm({ ...recordForm, medicines: event.target.value })}
              />
            </label>
          </div>

          {recordError ? <div className="notice notice-error">{recordError}</div> : null}

          <div className="action-row">
            <button type="button" onClick={saveNewRecord} disabled={savingRecord}>
              {savingRecord ? 'Saving...' : 'Save New Form'}
            </button>
            <button type="button" className="secondary-button" onClick={useLatestRecordAsTemplate} disabled={!records.length}>
              Use Last Record
            </button>
            <button type="button" className="secondary-button" onClick={() => setRecordForm(recordDefaults)}>
              Clear
            </button>
          </div>
        </article>

        <aside className="detail-panel detail-panel-cream">
          <div className="section-heading">
            <h2>Past Records</h2>
            <span>{recordCountLabel}</span>
          </div>

          {recordsLoading ? <div className="notice">Loading records...</div> : null}

          <div className="appointment-list">
            {records.length === 0 ? (
              <div className="empty-state">No saved forms yet. Fill your first form now.</div>
            ) : (
              records.map((record) => (
                <div key={record.RECORD_ID} className="appointment-item">
                  <div>
                    <strong>{record.NAME}</strong>
                    <p>DOB: {record.DOB}</p>
                    <p>{record.HISTORY}</p>
                    <p><strong>Medicines:</strong> {record.MEDICINES}</p>
                  </div>
                  <div className="appointment-meta">
                    <span>{formatCreatedAt(record.CREATED_AT)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={clearClientSession}>
              Logout
            </button>
          </div>
        </aside>
      </section>
    </motion.main>
  )
}
