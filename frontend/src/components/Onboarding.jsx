import { useState, useEffect } from 'react'

const TASKS_API = 'http://localhost:8000/tasks/'

// ─── Spotlight geometry ───────────────────────────────────────────────────────
// Returns {x, y, r} for each coach-mark step (steps 2-8).

function spotlightPos(step) {
  const W = window.innerWidth
  const H = window.innerHeight
  const containerW = Math.min(W, 420)
  const cLeft      = (W - containerW) / 2
  const tabW       = containerW / 6

  switch (step) {
    case 2: // Path tab (index 0)
      return { x: cLeft + tabW * 0.5, y: H - 28, r: 38 }
    case 3: // Active node — general content centre
      return { x: W / 2, y: H * 0.42, r: 54 }
    case 4: // Planner tab (index 1)
      return { x: cLeft + tabW * 1.5, y: H - 28, r: 38 }
    case 5: // Goals tab (index 2)
      return { x: cLeft + tabW * 2.5, y: H - 28, r: 38 }
    case 6: // Mirror tab (index 3)
      return { x: cLeft + tabW * 3.5, y: H - 28, r: 38 }
    case 7: // AI tab (index 4)
      return { x: cLeft + tabW * 4.5, y: H - 28, r: 38 }
    case 8: // You tab (index 5)
      return { x: cLeft + tabW * 5.5, y: H - 28, r: 38 }
    default:
      return { x: W / 2, y: H / 2, r: 50 }
  }
}

// ─── Step copy ────────────────────────────────────────────────────────────────

const STEP_TEXT = {
  2: 'Your daily journey — tasks become nodes you complete one by one, earning stars as you go.',
  3: 'Tap the glowing node to start a focused timer. Stars fill as you work.',
  4: 'Plan your week here — drag tasks between days to reschedule. Tasks sync instantly to your Path.',
  5: 'Set long-term goals here. Each goal grows as a branch on your tree as you complete sub-tasks.',
  6: 'Your Mirror reflects your patterns — weekly stars, habits, and every memory you\'ve logged.',
  7: 'Your local AI knows your tasks, goals and memories. Ask it anything. It runs on your machine — completely private.',
  8: 'Customize your sections, free time activities, and settings here. Your profile grows as you complete tasks.',
}

// ─── Planner step inline task form ───────────────────────────────────────────

function PlannerTaskForm() {
  const [title,  setTitle]  = useState('Morning run')
  const [added,  setAdded]  = useState(false)
  const [adding, setAdding] = useState(false)

  async function addTask() {
    if (added || adding || !title.trim()) return
    setAdding(true)
    try {
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      await fetch(TASKS_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:            title.trim(),
          section:          'morning',
          due_date:         today.toISOString(),
          duration_minutes: 25,
        }),
      })
      setAdded(true)
    } catch { /* swallow */ }
    setAdding(false)
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a2a' }}>
      <p style={{ fontSize: 11, color: '#5a5650', margin: '0 0 8px' }}>
        Create your first task:
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={added}
          style={{
            flex: 1, background: '#222', border: '1px solid #333',
            borderRadius: 8, padding: '7px 10px', color: '#e8e4dc',
            fontSize: 12, outline: 'none', fontFamily: 'inherit',
            opacity: added ? 0.5 : 1,
          }}
        />
        <button
          onClick={addTask}
          disabled={added}
          style={{
            padding: '7px 14px', border: 'none', borderRadius: 8,
            background: added ? 'rgba(143,168,118,0.15)' : '#c8b87a',
            color:      added ? '#8fa876' : '#0f0f0f',
            fontSize: 12, fontWeight: 700, cursor: added ? 'default' : 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}
        >
          {adding ? '…' : added ? '✓ Added' : 'Add →'}
        </button>
      </div>
    </div>
  )
}

// ─── Welcome screen (step 1) ──────────────────────────────────────────────────

function WelcomeScreen({ onNext, onSkip }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: '#0f0f0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px',
    }}>
      {/* Ambient gold gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
        background: 'radial-gradient(ellipse at 50% -10%, rgba(200,184,122,0.18) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      <button
        onClick={onSkip}
        style={{
          position: 'absolute', top: 20, right: 20,
          fontSize: 12, color: '#5a5650', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        Skip
      </button>

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <p style={{ fontSize: 44, fontWeight: 800, color: '#c8b87a', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          MirrorMe
        </p>
        <p style={{ fontSize: 18, color: '#6a6050', fontStyle: 'italic', margin: '0 0 32px' }}>
          Your life, reflected.
        </p>
        <p style={{ fontSize: 14, color: '#4a4a4a', lineHeight: 1.75, maxWidth: 300, margin: '0 auto 52px' }}>
          A local-first planner that learns your patterns, powered by AI that runs on your machine.
        </p>

        <button
          onClick={onNext}
          style={{
            background: '#c8b87a', color: '#0f0f0f',
            fontSize: 15, fontWeight: 700, padding: '14px 40px',
            borderRadius: 50, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(200,184,122,0.35)',
            display: 'block', margin: '0 auto 22px',
          }}
        >
          Get started →
        </button>

        <p style={{ fontSize: 11, color: '#3a3a3a' }}>
          $0 forever · No cloud · Your data stays with you
        </p>
      </div>
    </div>
  )
}

// ─── Coach mark step (steps 2-6) ─────────────────────────────────────────────

function CoachStep({ step, onNext, onSkip, isLast }) {
  const pos = spotlightPos(step)

  // Tooltip: prefer above the spotlight; fall below if it would clip the screen top.
  // Use a larger estimate (240px) to accommodate the Planner step's embedded form.
  const tooltipH = 240
  const aboveY   = pos.y - pos.r - 16 - tooltipH
  const tooltipY = aboveY < 60 ? pos.y + pos.r + 16 : aboveY

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>

      {/* Dark overlay via box-shadow spread — the circle itself is transparent */}
      <div style={{
        position: 'fixed',
        width:  pos.r * 2,
        height: pos.r * 2,
        borderRadius: '50%',
        left: pos.x - pos.r,
        top:  pos.y - pos.r,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
        border: '1.5px solid rgba(200,184,122,0.40)',
        pointerEvents: 'none',
      }} />

      {/* Skip */}
      <button
        onClick={onSkip}
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 61,
          fontSize: 12, color: 'rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
        }}
      >
        Skip
      </button>

      {/* Tooltip card */}
      <div style={{
        position: 'fixed',
        left: '50%',
        top: tooltipY,
        transform: 'translateX(-50%)',
        width: 290,
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 18,
        padding: '18px 20px',
        zIndex: 61,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      }}>
        <p style={{ color: '#d4d0c8', fontSize: 13, lineHeight: 1.65, margin: '0 0 14px' }}>
          {STEP_TEXT[step]}
        </p>

        {/* Planner step: embedded first-task form */}
        {step === 4 && <PlannerTaskForm />}

        <button
          onClick={onNext}
          style={{
            width: '100%', marginTop: step === 4 ? 14 : 0,
            padding: '10px', borderRadius: 12, border: 'none',
            background: '#c8b87a', color: '#0f0f0f',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {isLast ? 'Got it ✓' : 'Next →'}
        </button>
      </div>

      {/* Step dots — 7 dots for coach steps 2-8 */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 5, zIndex: 61,
      }}>
        {[2, 3, 4, 5, 6, 7, 8].map(s => (
          <div
            key={s}
            style={{
              height: 6, borderRadius: 3,
              width: s === step ? 20 : 6,
              background: s === step ? '#c8b87a' : 'rgba(255,255,255,0.15)',
              transition: 'width 0.25s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export default function Onboarding({ onDone, onTabChange }) {
  const [step, setStep] = useState(1)

  // Navigate the underlying app to the relevant tab for each demo step
  useEffect(() => {
    if (step === 4) onTabChange?.('planner')
    if (step === 5) onTabChange?.('goals')
    if (step === 6) onTabChange?.('mirror')
    if (step === 7) onTabChange?.('ai')
    if (step === 8) onTabChange?.('you')
  }, [step])

  function next() {
    if (step >= 8) onDone()
    else setStep(s => s + 1)
  }

  if (step === 1) {
    return <WelcomeScreen onNext={next} onSkip={onDone} />
  }

  return <CoachStep step={step} onNext={next} onSkip={onDone} isLast={step === 8} />
}
