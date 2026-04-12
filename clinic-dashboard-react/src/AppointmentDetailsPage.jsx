import { useRef } from 'react'
import { motion } from 'framer-motion'

export default function AppointmentDetailsPage({ appointment, onBack }) {
  const printRef = useRef(null)

  if (!appointment) {
    return (
      <motion.main
        key="appointment-details-empty"
        className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <section className="page-topbar">
          <div>
            <p className="kicker">Appointment</p>
            <h1>No Appointment Selected</h1>
            <p className="lead">Select an upcoming appointment to view full details.</p>
            <button type="button" className="jump-button" onClick={onBack}>
              Back
            </button>
          </div>
        </section>
      </motion.main>
    )
  }

  const paymentMethod = appointment.PAYMENT_METHOD || appointment.payment_method || 'N/A'
  const paymentReference = appointment.PAYMENT_REFERENCE || appointment.payment_reference || 'N/A'
  const paymentAmount = Number(appointment.PAYMENT_AMOUNT ?? appointment.payment_amount ?? 0)
  const rawPaymentStatus = (appointment.PAYMENT_STATUS || appointment.payment_status || '').toString().trim().toUpperCase()
  const paymentStatus = rawPaymentStatus || (paymentReference !== 'N/A' || paymentAmount > 0 ? 'PAID' : 'UNPAID')

  const handlePrintDetails = () => {
    const printable = printRef.current
    if (!printable) {
      window.print()
      return
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Full Details</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 0 0 16px; color: #4b5563; }
            .row { margin: 6px 0; font-size: 14px; }
            .total { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-weight: 700; }
          </style>
        </head>
        <body>${printable.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <motion.main
      key="appointment-details"
      className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={onBack}>
            Back to Appointments
          </button>
          <p className="kicker">Appointment</p>
          <h1>Appointment Full Details</h1>
          <p className="lead">Patient, schedule, and payment information in one place.</p>
        </div>
      </section>

      <section className="detail-grid detail-grid-single">
        <article className="detail-panel detail-panel-cream">
          <div className="section-heading">
            <h2>{appointment.NAME || 'Unknown Patient'}</h2>
            <span>ID: {appointment.PATIENT_ID}</span>
          </div>

          <div ref={printRef}>
            <h1>City Care Hospital - Appointment Details</h1>
            <p>ID: {appointment.PATIENT_ID}</p>

            <div className="payment-summary-list">
              <div className="row"><strong>Patient:</strong> {appointment.NAME || '-'}</div>
              <div className="row"><strong>Doctor:</strong> {appointment.EMAIL || '-'}</div>
              <div className="row"><strong>Phone:</strong> {appointment.PHONE_NO || '-'}</div>
              <div className="row"><strong>Gender:</strong> {appointment.GENDER || '-'}</div>
              <div className="row"><strong>Date:</strong> {appointment.DOB || '-'}</div>
              <div className="row"><strong>Time:</strong> {appointment.STREAM || '-'}</div>
              <div className="row"><strong>Payment Status:</strong> {paymentStatus}</div>
              <div className="row"><strong>Payment Method:</strong> {paymentMethod}</div>
              <div className="row"><strong>Payment Reference:</strong> {paymentReference}</div>
              <div className="payment-fee total"><strong>Amount Paid:</strong> Rs {paymentAmount}</div>
            </div>
          </div>

          <div className="action-row">
            <button type="button" onClick={handlePrintDetails}>
              Print Receipt
            </button>
          </div>
        </article>
      </section>
    </motion.main>
  )
}
