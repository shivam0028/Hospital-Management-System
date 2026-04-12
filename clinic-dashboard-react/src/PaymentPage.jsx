import { motion } from 'framer-motion'

export default function PaymentPage({
  pendingAppointment,
  paymentForm,
  onChangePaymentForm,
  onPay,
  onCancel,
  processingPayment,
}) {
  if (!pendingAppointment) {
    return (
      <motion.main
        key="payment-empty"
        className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <section className="page-topbar">
          <div>
            <p className="kicker">Payment</p>
            <h1>No Pending Appointment</h1>
            <p className="lead">Start appointment booking first, then continue to payment.</p>
            <div className="jump-row jump-row-tight" aria-label="Quick navigation">
              <button type="button" className="jump-button" onClick={onCancel}>
                Back To Appointments
              </button>
            </div>
          </div>
        </section>
      </motion.main>
    )
  }

  return (
    <motion.main
      key="payment"
      className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <section className="page-topbar">
        <div>
          <button className="back-button" type="button" onClick={onCancel}>
            Back to Appointment Form
          </button>
          <p className="kicker">Payment</p>
          <h1>Pay Appointment Fee</h1>
          <p className="lead">Complete payment to confirm this appointment.</p>
        </div>
      </section>

      <section className="detail-grid payment-grid">
        <article className="detail-panel detail-panel-cream">
          <div className="section-heading">
            <h2>Appointment Summary</h2>
            <span>Review details</span>
          </div>
          <div className="payment-summary-list">
            <div><strong>Patient:</strong> {pendingAppointment.name}</div>
            <div><strong>Doctor:</strong> {pendingAppointment.doctor}</div>
            <div><strong>Phone:</strong> {pendingAppointment.phone}</div>
            <div><strong>Date:</strong> {pendingAppointment.date}</div>
            <div><strong>Time:</strong> {pendingAppointment.time}</div>
            <div className="payment-fee"><strong>Fee:</strong> Rs {paymentForm.amount}</div>
          </div>
        </article>

        <article className="detail-panel detail-panel-green">
          <div className="section-heading">
            <h2>Payment Details</h2>
            <span>Secure checkout</span>
          </div>

          <div className="record-form payment-form">
            <label>
              Card Holder Name
              <input
                type="text"
                placeholder="Enter card holder name"
                value={paymentForm.cardName}
                onChange={(event) => onChangePaymentForm('cardName', event.target.value)}
              />
            </label>

            <label>
              Card Number
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                value={paymentForm.cardNumber}
                onChange={(event) => onChangePaymentForm('cardNumber', event.target.value)}
              />
            </label>

            <label>
              Expiry Date
              <input
                type="month"
                value={paymentForm.expiry}
                onChange={(event) => onChangePaymentForm('expiry', event.target.value)}
              />
            </label>

            <label>
              CVV
              <input
                type="password"
                placeholder="123"
                maxLength={4}
                value={paymentForm.cvv}
                onChange={(event) => onChangePaymentForm('cvv', event.target.value)}
              />
            </label>
          </div>

          <div className="action-row">
            <button type="button" onClick={onPay} disabled={processingPayment}>
              {processingPayment ? 'Processing Payment...' : `Pay Rs ${paymentForm.amount}`}
            </button>
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </article>
      </section>
    </motion.main>
  )
}
