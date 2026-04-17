export default function SavedAppointmentsPanel({ appointments, onDeleteAppointment, onViewAppointment }) {
  return (
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
              onClick={() => onViewAppointment(item, 'savedAppointments')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onViewAppointment(item, 'savedAppointments')
                }
                
              }}
            >
              <div>
                <strong>{item.NAME}</strong>
                <p>{item.EMAIL} • {item.GENDER}</p>
              </div>
              <div className="appointment-meta">
                <span>{item.DOB}</span>
                <button
                  type="button"
                  className="danger-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteAppointment(item.PATIENT_ID)
                  }}
                >
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
  )
}
