import { useRef } from 'react'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReceiptPage({ receipt, onGoHome, onGoSavedAppointments }) {
  const printRef = useRef(null)

  if (!receipt) {
    return (
      <motion.main
        key="receipt-empty"
        className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <section className="page-topbar">
          <div>
            <p className="kicker">Receipt</p>
            <h1>No Receipt Available</h1>
            <p className="lead">Complete a payment first to generate a receipt.</p>
            <div className="jump-row jump-row-tight" aria-label="Quick navigation">
              <button type="button" className="jump-button" onClick={onGoSavedAppointments}>
                Go To Saved Appointments
              </button>
            </div>
          </div>
        </section>
      </motion.main>
    )
  }

  const maskedCard = receipt.cardLast4 ? `**** **** **** ${receipt.cardLast4}` : 'Card'

  const handlePrintReceipt = () => {
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
          <title>Appointment Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #111827;
              background: #ffffff;
            }
            .receipt-title {
              margin: 0 0 8px;
              font-size: 24px;
            }
            .receipt-subtitle {
              margin: 0 0 18px;
              color: #4b5563;
            }
            .line-item {
              margin: 6px 0;
              font-size: 14px;
            }
            .total {
              margin-top: 16px;
              padding-top: 10px;
              border-top: 1px dashed #9ca3af;
              display: flex;
              justify-content: space-between;
              font-weight: 700;
              font-size: 18px;
            }
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

  const handleDownloadPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('City Care Hospital', 14, 18)
    doc.setFontSize(12)
    doc.text('Appointment Payment Receipt', 14, 26)

    doc.setFontSize(10)
    doc.text(`Receipt No: ${receipt.receiptNumber}`, 14, 34)
    doc.text(`Generated: ${receipt.paidAt}`, 14, 40)

    autoTable(doc, {
      startY: 48,
      head: [['Field', 'Value']],
      body: [
        ['Appointment ID', receipt.appointmentId],
        ['Patient Name', receipt.name],
        ['Doctor', receipt.doctor],
        ['Phone', receipt.phone],
        ['Appointment Date', receipt.date],
        ['Appointment Time', receipt.time],
        ['Payment Method', receipt.paymentMethod],
        ['Card', maskedCard],
        ['Payment Reference', receipt.paymentReference],
        ['Paid At', receipt.paidAt],
        ['Amount Paid', `Rs ${receipt.amount}`],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [28, 85, 192],
      },
      theme: 'grid',
    })

    const safeName = (receipt.name || 'patient').replace(/[^a-zA-Z0-9]+/g, '_')
    doc.save(`receipt_${safeName}_${receipt.receiptNumber}.pdf`)
  }

  return (
    <motion.main
      key="receipt"
      className="shell shell-dashboard dashboard-box page-layout detail-uniform patient-overview-size overview-like"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <section className="page-topbar">
        <div>
          <p className="kicker">Payment Receipt</p>
          <h1>Appointment Bill</h1>
          <p className="lead">Payment completed successfully. Keep this receipt for reference.</p>
        </div>
      </section>

      <section className="detail-grid receipt-grid">
        <article className="detail-panel detail-panel-cream receipt-card">
          <div className="section-heading">
            <h2>City Care Hospital</h2>
            <span>Receipt No: {receipt.receiptNumber}</span>
          </div>

          <div ref={printRef}>
            <h2 className="receipt-title">City Care Hospital - Appointment Receipt</h2>
            <p className="receipt-subtitle">Receipt No: {receipt.receiptNumber}</p>

            <div className="receipt-line-items">
              <div className="line-item"><strong>Appointment ID:</strong> {receipt.appointmentId}</div>
              <div className="line-item"><strong>Patient Name:</strong> {receipt.name}</div>
              <div className="line-item"><strong>Doctor:</strong> {receipt.doctor}</div>
              <div className="line-item"><strong>Phone:</strong> {receipt.phone}</div>
              <div className="line-item"><strong>Appointment Date:</strong> {receipt.date}</div>
              <div className="line-item"><strong>Appointment Time:</strong> {receipt.time}</div>
              <div className="line-item"><strong>Payment Method:</strong> {receipt.paymentMethod}</div>
              <div className="line-item"><strong>Card:</strong> {maskedCard}</div>
              <div className="line-item"><strong>Payment Ref:</strong> {receipt.paymentReference}</div>
              <div className="line-item"><strong>Paid At:</strong> {receipt.paidAt}</div>
            </div>

            <div className="receipt-total-row total">
              <span>Total Paid</span>
              <strong>Rs {receipt.amount}</strong>
            </div>
          </div>

          <div className="action-row">
            <button type="button" onClick={handlePrintReceipt}>
              Print Receipt
            </button>
            {/* <button type="button" onClick={handleDownloadPdf}>
              Download PDF
            </button> */}
            <button type="button" className="secondary-button" onClick={onGoSavedAppointments}>
              Saved Appointments
            </button>
            <button type="button" className="secondary-button" onClick={onGoHome}>
              Home
            </button>
          </div>
        </article>
      </section>
    </motion.main>
  )
}
