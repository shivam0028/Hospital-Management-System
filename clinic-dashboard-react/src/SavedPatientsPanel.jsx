export default function SavedPatientsPanel({ patients, onDeletePatient }) {
  return (
    <aside className="detail-panel detail-panel-cream">
      <div className="section-heading">
        <h2>Saved Patients</h2>
        <span>{patients.length} rows</span>
      </div>

      <div className="data-table">
        <div className="table-head">
          <span>Mobile</span>
          <span>Name</span>
          <span>Birth date</span>
          <span>Owner</span>
          <span>Actions</span>
        </div>
        <div className="table-body">
          {patients.length === 0 ? (
            <div className="empty-state">No patient records found.</div>
          ) : (
            patients.map((patient) => (
              <div key={patient.MOBILE} className="table-row">
                <span>{patient.MOBILE}</span>
                <span>{patient.NAME}</span>
                <span>{patient.DOB}</span>
                <span>{patient.CREATED_BY || 'Unknown'}</span>
                <span className="row-actions">
                  <button type="button" disabled title="Saved records cannot be edited.">
                    Locked
                  </button>
                  {localStorage.getItem('role') === 'admin' && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => onDeletePatient(patient.MOBILE)}
                    >
                      Delete
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="sidebar-note">Saved records come from backend and are locked for edit after save.</p>
    </aside>
  )
}
