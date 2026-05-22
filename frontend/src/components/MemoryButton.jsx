import { useState, useEffect, useRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_API = 'http://localhost:8000/memory/'
const MOODS      = ['😔', '😐', '🙂', '😊', '🤩']
const ENERGIES   = ['Low', 'Medium', 'High']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeOfDay() {
  const h = new Date().getHours()
  if (h >= 6  && h <= 11) return 'morning'
  if (h >= 12 && h <= 16) return 'afternoon'
  if (h >= 17 && h <= 20) return 'evening'
  return 'night'
}

function todayISO() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// ─── Voice-to-text hook ───────────────────────────────────────────────────────
// Tap to start, tap again to stop.
// Interim results update the textarea live; final text is committed on stop.
// toggle(currentContent, setContent) must be called with the current textarea
// value each time so the hook can prefix the voice text correctly.

function useSpeech() {
  const [recording,    setRecording]    = useState(false)
  const recognitionRef                  = useRef(null)
  const baseRef                         = useRef('') // textarea content when recording started
  const finalRef                        = useRef('') // accumulated final transcript
  const setContentRef                   = useRef(null)

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function toggle(currentContent, setContent) {
    if (!supported) return
    setContentRef.current = setContent

    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }

    baseRef.current  = currentContent
    finalRef.current = ''

    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = 'en-US'

    rec.onresult = e => {
      let addedFinal = ''
      let interim    = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) addedFinal += e.results[i][0].transcript
        else                      interim    += e.results[i][0].transcript
      }
      if (addedFinal) finalRef.current = (finalRef.current + ' ' + addedFinal).trim()
      const live = [baseRef.current, finalRef.current, interim].filter(Boolean).join(' ').trim()
      setContentRef.current?.(live)
    }

    rec.onend = () => {
      setRecording(false)
      // Commit final text, drop any trailing interim
      const settled = [baseRef.current, finalRef.current].filter(Boolean).join(' ').trim()
      setContentRef.current?.(settled)
    }

    rec.onerror = () => setRecording(false)

    recognitionRef.current = rec
    rec.start()
    setRecording(true)
  }

  return { supported, recording, toggle }
}

// ─── Shared pickers ──────────────────────────────────────────────────────────

function MoodPicker({ value, onChange }) {
  return (
    <>
      <p style={{ fontSize: 10, color: '#3d3d3d', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>
        Mood
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {MOODS.map(m => (
          <button
            key={m}
            onClick={() => onChange(value === m ? null : m)}
            style={{
              fontSize: 20, padding: '5px 9px', cursor: 'pointer',
              background: value === m ? 'rgba(200,184,122,0.15)' : '#1a1a1a',
              border: `1.5px solid ${value === m ? '#c8b87a' : '#2a2a2a'}`,
              borderRadius: 10, transition: 'all 0.15s',
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </>
  )
}

function EnergyPicker({ value, onChange }) {
  return (
    <>
      <p style={{ fontSize: 10, color: '#3d3d3d', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '12px 0 8px' }}>
        Energy
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {ENERGIES.map(e => (
          <button
            key={e}
            onClick={() => onChange(value === e ? null : e)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '5px 16px', cursor: 'pointer',
              background: value === e ? 'rgba(200,184,122,0.15)' : '#1a1a1a',
              border: `1.5px solid ${value === e ? '#c8b87a' : '#2a2a2a'}`,
              borderRadius: 20, color: value === e ? '#c8b87a' : '#5a5650',
              transition: 'all 0.15s',
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Entry sheet ─────────────────────────────────────────────────────────────

function EntrySheet({ type, onClose, onSuccess }) {
  const [content, setContent] = useState('')
  const [mood,    setMood]    = useState(null)
  const [energy,  setEnergy]  = useState(null)
  const isJournal = type === 'journal'

  const { supported: micOk, recording, toggle: toggleMic } = useSpeech(
    text => setContent(prev => prev ? `${prev} ${text}` : text)
  )

  async function submit() {
    if (!content.trim()) return
    try {
      await fetch(MEMORY_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:     content.trim(),
          entry_type:  isJournal ? 'journal' : 'context',
          mood:        mood   || null,
          energy:      energy ? energy.toLowerCase() : null,
          date:        todayISO(),
          time_of_day: timeOfDay(),
        }),
      })
      onSuccess(isJournal ? 'Journal saved ✓' : 'Logged ✓')
    } catch {
      onClose()
    }
  }

  const canSubmit = content.trim().length > 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 42, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: '#141414', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ color: '#e8e4dc', fontSize: 15, fontWeight: 700, margin: 0 }}>
            {isJournal ? '📖 Journal' : '⚡ Quick log'}
          </h3>
          {isJournal && (
            <span style={{ fontSize: 10, color: '#5a5650' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Textarea + mic button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            autoFocus
            rows={isJournal ? 5 : 3}
            placeholder={isJournal
              ? 'How was your day? What went well? What got in the way?'
              : 'e.g. Writing email to Yusuf, will finish after lunch…'}
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{
              flex: 1, resize: 'none', boxSizing: 'border-box',
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14,
              padding: '12px 16px', color: '#e8e4dc', fontSize: 13, lineHeight: 1.6,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {micOk && (
            <button
              onClick={toggleMic}
              style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: recording ? 'rgba(196,58,58,0.12)' : '#1a1a1a',
                border: `1.5px solid ${recording ? 'rgba(196,58,58,0.35)' : '#2a2a2a'}`,
                cursor: 'pointer', marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {recording ? (
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: '#c43a3a',
                  animation: 'micPulse 1s ease-in-out infinite',
                }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#5a5650" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8"  y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}
        </div>

        <MoodPicker   value={mood}   onChange={setMood}   />
        <EnergyPicker value={energy} onChange={setEnergy} />

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 12, border: '1px solid #2a2a2a', borderRadius: 14, background: 'none', color: '#4a4a4a', fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              flex: 2, padding: 12, borderRadius: 14, border: 'none',
              background: canSubmit ? '#c8b87a' : '#1a1a1a',
              color:      canSubmit ? '#0f0f0f'  : '#3a3a3a',
              fontSize: 13, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            {isJournal ? 'Save journal' : 'Log it'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MemoryButton ─────────────────────────────────────────────────────────────
// Controlled by parent via open/onClose. Renders only sheets + toast — no floating button.

export default function MemoryButton({ open, onClose }) {
  const [sheet, setSheet] = useState(null) // null | 'choice' | 'log' | 'journal'
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (open) setSheet('choice')
    else      setSheet(null)
  }, [open])

  function close() {
    setSheet(null)
    onClose?.()
  }

  function handleSuccess(msg) {
    setSheet(null)
    onClose?.()
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <>
      <style>{`
        @keyframes micPulse {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>

      {/* Choice sheet */}
      {sheet === 'choice' && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 41, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={close}
        >
          <div
            style={{ width: '100%', maxWidth: 420, background: '#141414', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 10, color: '#5a5650', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 20px' }}>
              What would you like to do?
            </p>

            {[
              { id: 'log',     icon: '⚡', title: 'Quick log', subtitle: 'What are you doing right now?' },
              { id: 'journal', icon: '📖', title: 'Journal',   subtitle: 'Reflect on your day'          },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSheet(opt.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16,
                  padding: '16px 20px', marginBottom: 10, cursor: 'pointer', textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: 26 }}>{opt.icon}</span>
                <div>
                  <p style={{ color: '#e8e4dc', fontSize: 14, fontWeight: 600, margin: 0 }}>{opt.title}</p>
                  <p style={{ color: '#5a5650', fontSize: 11, margin: '3px 0 0' }}>{opt.subtitle}</p>
                </div>
              </button>
            ))}

            <button
              onClick={close}
              style={{ width: '100%', marginTop: 4, padding: 12, border: '1px solid #2a2a2a', borderRadius: 14, background: 'none', color: '#4a4a4a', fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entry sheet */}
      {(sheet === 'log' || sheet === 'journal') && (
        <EntrySheet type={sheet} onClose={close} onSuccess={handleSuccess} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: '#1e1e1e', border: '1px solid #2a2a2a',
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
