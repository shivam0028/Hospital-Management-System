import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import './WelcomePage.css'

const staggerMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
}

const itemMotion = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

const letterMotion = {
  hidden: { opacity: 0, y: 40, rotateX: -35 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

function MagneticButton({ children, onClick, className }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 20 })
  const springY = useSpring(y, { stiffness: 260, damping: 20 })

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((e.clientX - cx) * 0.38)
    y.set((e.clientY - cy) * 0.38)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  )
}

function TiltCard({ children, className, onClick }) {
  const ref = useRef(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springRX = useSpring(rotateX, { stiffness: 180, damping: 22 })
  const springRY = useSpring(rotateY, { stiffness: 180, damping: 22 })
  const isInteractive = typeof onClick === 'function'

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    rotateX.set((0.5 - py) * 18)
    rotateY.set((px - 0.5) * 22)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  const handleKeyDown = (event) => {
    if (!isInteractive) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRX,
        rotateY: springRY,
        transformStyle: 'preserve-3d',
        transformPerspective: 900,
      }}
      whileHover={{ scale: 1.025 }}
      transition={{ scale: { duration: 0.25 } }}
    >
      {children}
    </motion.div>
  )
}

function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let W = canvas.offsetWidth
    let H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H

    const STAR_COUNT = 110
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.3,
      speed: Math.random() * 0.25 + 0.05,
      opacity: Math.random() * 0.7 + 0.15,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      stars.forEach((s) => {
        s.opacity += s.twinkleSpeed * s.twinkleDir
        if (s.opacity >= 0.85 || s.opacity <= 0.08) s.twinkleDir *= -1
        s.y -= s.speed
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 210, 255, ${s.opacity})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="wc-particle-canvas" aria-hidden="true" />
}

function CursorGlow() {
  const glowRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (!glowRef.current) return
      glowRef.current.style.left = `${e.clientX}px`
      glowRef.current.style.top = `${e.clientY}px`
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return <div ref={glowRef} className="wc-cursor-glow" aria-hidden="true" />
}

function FloatingOrb({ className }) {
  return <div className={`wc-orb ${className}`} aria-hidden="true" />
}

const FEATURE_CARDS = [
  { icon: '🩺', title: 'Patient Records', desc: 'Manage full patient history & medication' },
  { icon: '📅', title: 'Appointments', desc: 'Book and track clinic visits easily' },
  { icon: '📊', title: 'Live Dashboard', desc: 'Stats and activity at a glance' },
]

const PUBLIC_FEATURE_CARDS = [
  { icon: '🔐', title: 'Patient Login', desc: 'Access your account and view all previous forms' },
  { icon: '📝', title: 'New Form Anytime', desc: 'Submit new health details whenever you need' },
  { icon: '🧾', title: 'History Tracking', desc: 'See all your past submissions in one place' },
]

export default function WelcomePage({ onEnterDashboard, onGoToPatients, onGoToSavedPatients, onGoToSavedAppointments, onGoToDashboardStats, onGoToClientAccess, onGoToAdminLogin, isPublic }) {
  const titleChars = isPublic ? 'Welcome'.split('') : 'Welcome to'.split('')

  return (
    <motion.main
      key="welcome"
      className="wc-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.22 } }}
      transition={{ duration: 0.5 }}
    >
      <CursorGlow />
      <ParticleField />

      <FloatingOrb className="wc-orb-one" />
      <FloatingOrb className="wc-orb-two" />
      <FloatingOrb className="wc-orb-three" />

      <div className="wc-bg-grid" aria-hidden="true" />

      <motion.section
        className="wc-layout"
        variants={staggerMotion}
        initial="hidden"
        animate="show"
      >
        <motion.div className="wc-copy" variants={itemMotion}>

          <motion.div className="wc-subtitle-top" variants={itemMotion}>
            <span className="wc-pill">🏥 Hospital Management System</span>
          </motion.div>

          <motion.div
            className="wc-title-wrap"
            variants={staggerMotion}
            initial="hidden"
            animate="show"
            style={{ perspective: 700 }}
          >
            <h1 className="wc-title-small">
              {titleChars.map((ch, i) => (
                <motion.span key={i} variants={letterMotion} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
                  {ch}
                </motion.span>
              ))}
            </h1>
          </motion.div>

          <motion.div variants={itemMotion} className="wc-hospital-name-wrap">
            <TiltCard className="wc-hospital-name-card">
              <span className="wc-hospital-shimmer" aria-hidden="true" />
              <span className="wc-hospital-text">City Care Hospital</span>
            </TiltCard>
          </motion.div>

          <motion.p className="wc-lead" variants={itemMotion}>
            {isPublic ? 'Patients can log in, view past records, and submit new forms without retyping everything.' : 'Streamlined care for patients, doctors, and staff — all in one place.'}
          </motion.p>

          <motion.div className="wc-btn-row" variants={itemMotion}>
            {isPublic ? (
              <>
                <MagneticButton className="wc-btn wc-btn-primary" onClick={onGoToAdminLogin}>
                  <span>Login</span>
                  <span className="wc-btn-arrow">→</span>
                </MagneticButton>
                <MagneticButton className="wc-btn wc-btn-secondary" onClick={onGoToAdminLogin}>
                  <span>Sign Up</span>
                </MagneticButton>
              </>
            ) : (
              <>
                <MagneticButton className="wc-btn wc-btn-primary" onClick={onEnterDashboard}>
                  <span>Enter Dashboard</span>
                  <span className="wc-btn-arrow">→</span>
                </MagneticButton>
                <MagneticButton className="wc-btn wc-btn-secondary" onClick={onGoToPatients}>
                  <span>View Patients</span>
                </MagneticButton>
              </>
            )}
          </motion.div>

          <motion.div className="wc-cards-row" variants={staggerMotion} initial="hidden" animate="show">
            {(isPublic ? PUBLIC_FEATURE_CARDS : FEATURE_CARDS).map((card) => {
              let cardOnClick = undefined
              if (!isPublic) {
                if (card.title === 'Patient Records') cardOnClick = onGoToSavedPatients
                if (card.title === 'Appointments') cardOnClick = onGoToSavedAppointments
                if (card.title === 'Live Dashboard') cardOnClick = onGoToDashboardStats
              }
              
              return (
                <TiltCard
                  key={card.title}
                  className={`wc-feature-card ${cardOnClick ? 'wc-feature-card-action' : ''}`}
                  onClick={cardOnClick}
                >
                  <motion.div variants={itemMotion}>
                    <span className="wc-card-icon">{card.icon}</span>
                    <h3 className="wc-card-title">{card.title}</h3>
                    <p className="wc-card-desc">{card.desc}</p>
                  </motion.div>
                </TiltCard>
              )
            })}
          </motion.div>

        </motion.div>
      </motion.section>

      <motion.div
        className="wc-3d-cube-container"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      >
        <div className="wc-cube">
          {['front', 'back', 'left', 'right', 'top', 'bottom'].map((face) => (
            <div key={face} className={`wc-face wc-face-${face}`} />
          ))}
        </div>
      </motion.div>
    </motion.main>
  )
}