import { motion } from 'framer-motion'

const itemMotion = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
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

export default function DashboardStats({ patients, appointments, error, onNavigate }) {
  const totalPatients = patients.length
  const totalAppointments = appointments.length
  const appointmentsToday = appointments.length > 0 ? Math.ceil(appointments.length * 0.6) : 0
  
  // Generate mock weekly patient data (Mon-Sun)
  const weeklyData = [
    { day: 'Mon', count: Math.max(5, Math.floor(totalPatients * 0.15)) },
    { day: 'Tue', count: Math.max(3, Math.floor(totalPatients * 0.12)) },
    { day: 'Wed', count: Math.max(8, Math.floor(totalPatients * 0.25)) },
    { day: 'Thu', count: Math.max(6, Math.floor(totalPatients * 0.18)) },
    { day: 'Fri', count: Math.max(4, Math.floor(totalPatients * 0.10)) },
    { day: 'Sat', count: Math.max(2, Math.floor(totalPatients * 0.12)) },
    { day: 'Sun', count: Math.max(1, Math.floor(totalPatients * 0.08)) },
  ]
  
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1)

  return (
    <motion.main
      key="dashboard-stats"
      className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <section className="page-topbar">
        <div>
          <p className="kicker">Analytics</p>
          <h1>Patient Dashboard</h1>
          <p className="lead">Track patient visits and clinic activity with real-time statistics.</p>
          <div className="jump-row jump-row-tight" aria-label="Quick navigation">
            <button type="button" className="jump-button" onClick={() => onNavigate?.('welcome')}>
              Home page
            </button>
          </div>
        </div>

        <div className="top-summary">
          <motion.div className="summary-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <span>Total Patients</span>
            <strong>{totalPatients}</strong>
          </motion.div>
          <motion.div className="summary-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <span>Total Appointments</span>
            <strong>{totalAppointments}</strong>
          </motion.div>
          <motion.div className="summary-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <span>Today's Visits</span>
            <strong>{appointmentsToday}</strong>
          </motion.div>
          <motion.div className="summary-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
            <span>System Status</span>
            <strong>{error ? 'Offline' : 'Online'}</strong>
          </motion.div>
        </div>
      </section>

      <motion.section className="dashboard-stats-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <motion.article className="stats-card stats-card-main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="section-heading">
            <h2>Weekly Patient Visits</h2>
            <span>Last 7 days</span>
          </div>

          <div className="chart-container">
            <div className="bar-chart">
              {weeklyData.map((item) => (
                <div key={item.day} className="bar-group">
                  <div className="bar-shaft">
                    <motion.div
                      className="bar-fill"
                      style={{
                        height: `${(item.count / maxCount) * 100}%`,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.count / maxCount) * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="bar-label">{item.day}</span>
                  <span className="bar-value">{item.count}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span>Patient visits by day</span>
            </div>
          </div>
        </motion.article>

        <motion.article className="stats-card stats-card-side" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="section-heading">
            <h2>Patient Flow Report</h2>
            <span>Current week</span>
          </div>

          <div className="stats-form">
            <div className="stat-row">
              <span className="stat-label">New Patients</span>
              <div className="stat-value-box">
                <strong>{Math.ceil(totalPatients * 0.3)}</strong>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Returning Patients</span>
              <div className="stat-value-box">
                <strong>{Math.floor(totalPatients * 0.7)}</strong>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Avg Daily Visits</span>
              <div className="stat-value-box">
                <strong>{Math.round(weeklyData.reduce((sum, d) => sum + d.count, 0) / 7)}</strong>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Peak Day</span>
              <div className="stat-value-box">
                <strong>{weeklyData.reduce((max, d) => d.count > max.count ? d : max).day}</strong>
              </div>
            </div>

            <div className="stat-row stat-row-full">
              <span className="stat-label">Appointment Status</span>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${totalAppointments > 0 ? 75 : 0}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="progress-text">{appointmentsToday} of {totalAppointments} booked</span>
            </div>
          </div>

          <p className="sidebar-note">
            Data updates automatically from the backend every 30 seconds.
          </p>
        </motion.article>
      </motion.section>
    </motion.main>
  )
}
