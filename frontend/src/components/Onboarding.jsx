import { useState, useEffect, useRef } from 'react'

// ─── Phase definitions ────────────────────────────────────────────────────────

const PHASES = [
  {
    tab:      'path',
    selector: '[data-active-node="true"]',
    radius:   40,
    title:    'Your active task',
    body:     'This is your task for right now. Tap the glowing circle to start a focused timer and earn stars as you work.',
    btn:      'Got it →',
  },
  {
    tab:      'planner',
    selector: '[data-planner-columns="true"]',
    radius:   12,
    title:    'Your week at a glance',
    body:     'Drag tasks between days to reschedule your week. Changes sync instantly to your Path.',
    btn:      'Got it →',
  },
  {
    tab:      'goals',
    selector: '[data-new-goal-btn="true"]',
    radius:   20,
    title:    'Long-term goals',
    body:     'Create goals here — each one grows as a branch on your tree as you complete sub-tasks.',
    btn:      'Got it →',
  },
  {
    tab:      'mirror',
    selector: '[data-memory-section="true"]',
    radius:   12,
    title:    'Your memory log',
    body:     'Journal entries and quick logs appear here, grouped by day.',
    btn:      'Next →',
  },
  {
    tab:      'mirror',
    selector: '[data-memory-btn="true"]',
    radius:   20,
    title:    'Log a memory anytime',
    body:     'Tap the pen icon to journal your day or quickly log what you\'re doing.',
    btn:      'Got it →',
  },
  {
    tab:      'ai',
    selector: '[data-ai-input="true"]',
    radius:   20,
    title:    'Your private AI',
    body:     'Your local AI knows your tasks and goals. Ask it anything — it runs on your machine, completely private.',
    btn:      'Got it →',
  },
  {
    tab:      'you',
    selector: '[data-activities-section="true"]',
    radius:   12,
    title:    'Your rewards',
    body:     'Edit your break activities — these are your rewards when you complete a section.',
    btn:      'Done — let\'s go! →',
  },
]

// ─── useSpotlightRect — polls DOM for element, returns its rect ───────────────

function useSpotlightRect(selector) {
  const [rect, setRect] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    setRect(null)
    if (!selector) return

    let attempts = 0

    function tryFind() {
      try {
        const el = document.querySelector(selector)
        if (el) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch (_) {}
          timerRef.current = setTimeout(() => {
            try {
              const r = el.getBoundingClientRect()
              setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
            } catch (_) {}
          }, 320)
          return
        }
      } catch (_) {}

      if (++attempts < 40) {
        timerRef.current = setTimeout(tryFind, 100)
      }
    }

    tryFind()

    return () => { clearTimeout(timerRef.current) }
  }, [selector])

  return rect
}

// ─── Spotlight overlay — four rects masking around the hole ──────────────────

function SpotlightOverlay({ rect }) {
  const pad  = 12
  const dark = 'rgba(0,0,0,0.55)'

  if (!rect) {
    return <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: dark, pointerEvents: 'none' }} />
  }

  const x = Math.max(0, rect.left - pad)
  const y = Math.max(0, rect.top  - pad)
  const w = rect.width  + pad * 2
  const h = rect.height + pad * 2

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
      {/* Four masking rectangles — none overlaps the target */}
      <div style={{ position: 'absolute', top: 0,   left: 0,   right: 0, height: y,          background: dark }} />
      <div style={{ position: 'absolute', top: y,   left: 0,   width: x, height: h,           background: dark }} />
      <div style={{ position: 'absolute', top: y,   left: x+w, right: 0, height: h,           background: dark }} />
      <div style={{ position: 'absolute', top: y+h, left: 0,   right: 0, bottom: 0,           background: dark }} />

      {/* Pulsing gold glow ring */}
      <div style={{
        position: 'absolute',
        top: y, left: x, width: w, height: h,
        border: '2px solid #c8b87a',
        borderRadius: 10,
        boxShadow: '0 0 0 4px rgba(200,184,122,0.25), 0 0 20px rgba(200,184,122,0.15)',
        animation: 'obGlow 2s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes obGlow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(200,184,122,0.25), 0 0 20px rgba(200,184,122,0.15); }
          50%       { box-shadow: 0 0 0 6px rgba(200,184,122,0.40), 0 0 32px rgba(200,184,122,0.28); }
        }
      `}</style>
    </div>
  )
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────

function TooltipCard({ rect, phase, phaseIdx, total, onNext, onSkip }) {
  const pad  = 12
  const gap  = 16
  const tipH = 210
  const viewH = window.innerHeight

  // Position below if element is in the top half; above if in the bottom half
  const inBottomHalf = rect && (rect.top + rect.height / 2) > viewH / 2
  const arrowDown    = !inBottomHalf // arrow points down toward element when tooltip is above it

  let top
  if (rect) {
    if (inBottomHalf) {
      // tooltip above
      top = rect.top - pad - gap - tipH
    } else {
      // tooltip below
      top = rect.top + rect.height + pad + gap
    }
  } else {
    top = viewH / 2 - tipH / 2
  }
  top = Math.max(16, Math.min(top, viewH - tipH - 16))

  // Arrow vertical position relative to tooltip
  const arrowStyle = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    ...(arrowDown
      ? { bottom: -8, borderTop: '8px solid #c8b87a', borderBottom: 'none' }
      : { top: -8,    borderBottom: '8px solid #c8b87a', borderTop: 'none' }
    ),
  }

  return (
    <div style={{
      position: 'fixed',
      top,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 280,
      background: '#1e1e1e',
      border: '1px solid #2e2e2e',
      borderRadius: 20,
      padding: '16px 16px 14px',
      zIndex: 101,
      boxShadow: '0 16px 56px rgba(0,0,0,0.70)',
    }}>
      {/* Gold arrow pointing toward spotlight */}
      {rect && <div style={arrowStyle} />}

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: '#5a5650', marginRight: 4 }}>
          {phaseIdx + 1} / {total}
        </span>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            height: 4, borderRadius: 2,
            width: i === phaseIdx ? 18 : 5,
            background: i === phaseIdx ? '#c8b87a' : 'rgba(255,255,255,0.12)',
            transition: 'width 0.25s',
            flexShrink: 0,
          }} />
        ))}
      </div>

      <p style={{ fontSize: 14, fontWeight: 700, color: '#e8e4dc', margin: '0 0 8px' }}>
        {phase.title}
      </p>
      <p style={{ fontSize: 13, color: '#9a9690', lineHeight: 1.65, margin: '0 0 16px' }}>
        {phase.body}
      </p>

      {/* Full-width gold action button */}
      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '11px', border: 'none', borderRadius: 12,
          background: '#c8b87a', color: '#0f0f0f',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          marginBottom: 8,
        }}
      >
        {phase.btn}
      </button>

      {/* Skip — smaller, below */}
      <button
        onClick={onSkip}
        style={{
          width: '100%', padding: '6px', border: 'none', borderRadius: 10,
          background: 'none', color: '#4a4a4a', fontSize: 11, cursor: 'pointer',
        }}
      >
        Skip tour
      </button>
    </div>
  )
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export default function Onboarding({ onDone, onTabChange, onOpenMemory }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [toast,    setToast]    = useState(null)
  const toastRef = useRef(null)

  const phase = PHASES[phaseIdx] ?? PHASES[PHASES.length - 1]
  const rect  = useSpotlightRect(phase.selector)

  useEffect(() => {
    try { onTabChange?.(phase.tab) } catch (_) {}
  }, [phaseIdx])

  function advance() {
    try {
      if (phaseIdx >= PHASES.length - 1) {
        finish()
      } else {
        setPhaseIdx(i => i + 1)
      }
    } catch (_) {
      finish()
    }
  }

  function finish() {
    try {
      localStorage.setItem('mirrorme_onboarded', 'true')
      setToast('You\'re all set! 🎉')
      clearTimeout(toastRef.current)
      toastRef.current = setTimeout(() => {
        try { onDone() } catch (_) {}
      }, 2000)
    } catch (_) {
      try { onDone() } catch (_) {}
    }
  }

  useEffect(() => {
    return () => { clearTimeout(toastRef.current) }
  }, [])

  return (
    <>
      <SpotlightOverlay rect={rect} />

      <TooltipCard
        rect={rect}
        phase={phase}
        phaseIdx={phaseIdx}
        total={PHASES.length}
        onNext={advance}
        onSkip={finish}
      />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 110, background: '#1e1e1e', border: '1px solid #2a2a2a',
          borderRadius: 14, padding: '10px 20px',
          color: '#8fa876', fontSize: 13, fontWeight: 600,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
