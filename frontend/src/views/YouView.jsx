import { useState, useEffect } from 'react'

// ─── Defaults stored in localStorage ─────────────────────────────────────────

const DEFAULT_ACTIVITIES = [
  { emoji: '📺', name: 'YouTube',     duration: 30 },
  { emoji: '📖', name: 'Reading',     duration: 30 },
  { emoji: '🚶', name: 'Walk outside', duration: 20 },
  { emoji: '🎵', name: 'Music break', duration: 25 },
]

const DEFAULT_SECTIONS = [
  { emoji: '🌅', name: 'Morning' },
  { emoji: '⚡', name: 'Focus'   },
  { emoji: '🌱', name: 'Growth'  },
  { emoji: '🌙', name: 'Evening' },
]

const DEFAULT_SETTINGS = {
  aiModel:         'llama3.2:3b',
  eveningReminder: false,
  weeklyPlanning:  false,
  googleCalendar:  false,
  notifications:   false,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}

const SECTION_LABEL = { morning: 'Morning', focus: 'Focus', growth: 'Growth', evening: 'Evening' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#c8b87a' : '#2a2a2a',
        border: 'none', position: 'relative',
        transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function SectionLabel({ label, count }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#1e1e1e', border: '1px solid #2a2a2a',
      borderRadius: 8, padding: '2px 8px',
      fontSize: 11, color: '#c8b87a', fontWeight: 600,
    }}>
      {label}{count ? <span style={{ color: '#5a5650', fontWeight: 400 }}> · {count}</span> : null}
    </div>
  )
}

// ─── YouView ─────────────────────────────────────────────────────────────────

export default function YouView() {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  // Activities — persisted to localStorage so GiftModal can read them
  const [activities,  setActivities]  = useState(() => load('mirrorme_activities', DEFAULT_ACTIVITIES))
  const [editingIdx,  setEditingIdx]  = useState(null)
  const [editDraft,   setEditDraft]   = useState(null)

  // Sections
  const [sections,    setSections]    = useState(() => load('mirrorme_sections', DEFAULT_SECTIONS))
  const [addingSection, setAddingSection] = useState(false)
  const [newSection,  setNewSection]  = useState({ emoji: '', name: '' })

  // Settings
  const [settings,    setSettings]    = useState(() => load('mirrorme_settings', DEFAULT_SETTINGS))

  // Persist on change
  useEffect(() => { localStorage.setItem('mirrorme_activities', JSON.stringify(activities)) }, [activities])
  useEffect(() => { localStorage.setItem('mirrorme_sections',   JSON.stringify(sections))   }, [sections])
  useEffect(() => { localStorage.setItem('mirrorme_settings',   JSON.stringify(settings))   }, [settings])

  useEffect(() => {
    fetch('http://localhost:8000/tasks/')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTasks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── Computed ───────────────────────────────────────────────────────────────

  const doneTasks  = tasks.filter(t => t.status === 'done')
  const totalDone  = doneTasks.length
  const level      = Math.floor(totalDone / 10) + 1
  const xpTotal    = totalDone * 10
  const xpProgress = (totalDone % 10) / 10       // 0–1 within current level
  const xpNextLevel = level * 100

  const sectionCounts = {}
  for (const t of doneTasks) sectionCounts[t.section ?? 'morning'] = (sectionCounts[t.section ?? 'morning'] ?? 0) + 1
  const bestSectionKey   = Object.entries(sectionCounts).sort(([,a],[,b]) => b-a)[0]?.[0]
  const bestSectionLabel = bestSectionKey ? (SECTION_LABEL[bestSectionKey] ?? bestSectionKey) : '—'

  // ── Activity edit handlers ─────────────────────────────────────────────────

  function startEdit(i) {
    setEditingIdx(i)
    setEditDraft({ ...activities[i] })
  }

  function saveEdit() {
    if (!editDraft.name.trim()) return
    setActivities(prev => prev.map((a, i) => i === editingIdx ? { ...editDraft, name: editDraft.name.trim() } : a))
    setEditingIdx(null)
    setEditDraft(null)
  }

  function cancelEdit() { setEditingIdx(null); setEditDraft(null) }

  // ── Section handlers ───────────────────────────────────────────────────────

  function removeSection(i) { setSections(prev => prev.filter((_, idx) => idx !== i)) }

  function commitSection() {
    if (!newSection.name.trim()) return
    setSections(prev => [...prev, { emoji: newSection.emoji.trim() || '📌', name: newSection.name.trim() }])
    setNewSection({ emoji: '', name: '' })
    setAddingSection(false)
  }

  function setSetting(key, val) { setSettings(prev => ({ ...prev, [key]: val })) }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0f0f0f] pb-10">

      {/* ── 1. Profile card ──────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 mb-4 bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c8b87a 0%, #8fa876 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#0f0f0f', letterSpacing: 1,
          }}>
            LR
          </div>

          {/* Name + level */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-bold leading-tight">Livingstone</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#0f0f0f',
                background: '#c8b87a', borderRadius: 6, padding: '1px 7px',
              }}>
                Lvl {level}
              </span>
              <span className="text-[#5a5650] text-[10px]">{xpTotal} XP</span>
            </div>

            {/* XP bar */}
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-[#3d3d3d]">{xpTotal % 100} / 100 XP to Lvl {level + 1}</span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, #c8b87a, #8fa876)',
                  width: `${xpProgress * 100}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Stats row ─────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Streak',     value: '0d',           sub: 'current' },
          { label: 'Done',       value: totalDone,       sub: 'tasks'   },
          { label: 'Best',       value: bestSectionLabel, sub: 'section' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex flex-col items-center">
            <span style={{ fontSize: 18, fontWeight: 700, color: '#c8b87a', lineHeight: 1.2 }}>{value}</span>
            <span style={{ fontSize: 9, color: '#3d3d3d', marginTop: 2 }}>{sub}</span>
            <span style={{ fontSize: 9, color: '#5a5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 3. Free time activities ──────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <p style={{ fontSize: 9, fontWeight: 700, color: '#3d3d3d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Free Time Activities
        </p>
        <div className="grid grid-cols-2 gap-2">
          {activities.map((act, i) => (
            <div key={i} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3">
              {editingIdx === i ? (
                /* Edit mode */
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <input
                      value={editDraft.emoji}
                      onChange={e => setEditDraft(d => ({ ...d, emoji: e.target.value }))}
                      maxLength={2}
                      style={{ width: 36, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '4px 6px', color: '#fff', fontSize: 14, textAlign: 'center' }}
                    />
                    <input
                      value={editDraft.name}
                      onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                      style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '4px 8px', color: '#e8e4dc', fontSize: 11 }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editDraft.duration}
                      onChange={e => setEditDraft(d => ({ ...d, duration: Number(e.target.value) }))}
                      min={5} max={120}
                      style={{ width: 48, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '4px 8px', color: '#e8e4dc', fontSize: 11 }}
                    />
                    <span style={{ fontSize: 10, color: '#5a5650' }}>min</span>
                    <button onClick={saveEdit}
                      style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#0f0f0f', background: '#c8b87a', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                      Save
                    </button>
                    <button onClick={cancelEdit}
                      style={{ fontSize: 10, color: '#5a5650', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p style={{ fontSize: 18, lineHeight: 1 }}>{act.emoji}</p>
                    <p style={{ fontSize: 11, color: '#e8e4dc', fontWeight: 500, marginTop: 4 }}>{act.name}</p>
                    <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>{act.duration} min</p>
                  </div>
                  <button onClick={() => startEdit(i)}
                    style={{ color: '#3a3a3a', background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
                    <PencilIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Section settings ──────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <p style={{ fontSize: 9, fontWeight: 700, color: '#3d3d3d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          My Sections
        </p>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {sections.map((sec, i) => (
            <div key={i} className="flex items-center px-4 py-3"
              style={{ borderBottom: i < sections.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
              <span style={{ fontSize: 16, marginRight: 10 }}>{sec.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>{sec.name}</span>
              <button onClick={() => removeSection(i)}
                style={{ color: '#3a3a3a', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>
                ×
              </button>
            </div>
          ))}

          {/* Inline add */}
          {addingSection ? (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#1e1e1e]">
              <input
                type="text" placeholder="😊" maxLength={2}
                value={newSection.emoji}
                onChange={e => setNewSection(s => ({ ...s, emoji: e.target.value }))}
                style={{ width: 36, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '5px 6px', color: '#fff', fontSize: 14, textAlign: 'center' }}
              />
              <input
                type="text" placeholder="Section name" autoFocus
                value={newSection.name}
                onChange={e => setNewSection(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') commitSection(); if (e.key === 'Escape') setAddingSection(false) }}
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '5px 10px', color: '#e8e4dc', fontSize: 12 }}
              />
              <button onClick={commitSection}
                style={{ fontSize: 10, fontWeight: 700, color: '#0f0f0f', background: '#c8b87a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Add
              </button>
              <button onClick={() => setAddingSection(false)}
                style={{ fontSize: 14, color: '#5a5650', background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="w-full text-left px-4 py-3 border-t border-[#1e1e1e]"
              style={{ background: 'none', border: 'none', borderTop: '1px solid #1e1e1e', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 12, color: '#3d3d3d' }}>+ Add section</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 5. Settings ──────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <p style={{ fontSize: 9, fontWeight: 700, color: '#3d3d3d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Settings
        </p>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden">

          {/* AI model */}
          <div className="flex items-center px-4 py-3.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div className="flex-1">
              <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>AI Model</p>
              <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Local · private · free</p>
            </div>
            <select
              value={settings.aiModel}
              onChange={e => setSetting('aiModel', e.target.value)}
              style={{
                background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8,
                color: '#c8b87a', fontSize: 11, padding: '4px 8px', cursor: 'pointer',
              }}
            >
              <option value="llama3.2:3b">llama3.2:3b</option>
              <option value="llama3.2:1b">llama3.2:1b</option>
              <option value="mistral:7b">mistral:7b</option>
            </select>
          </div>

          {/* Evening reminder */}
          <div className="flex items-center px-4 py-3.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div className="flex-1">
              <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>Evening Reminder</p>
              <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Review your day at 8pm</p>
            </div>
            <Toggle value={settings.eveningReminder} onChange={v => setSetting('eveningReminder', v)} />
          </div>

          {/* Weekly planning */}
          <div className="flex items-center px-4 py-3.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div className="flex-1">
              <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>Weekly Planning</p>
              <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Sunday 6pm check-in</p>
            </div>
            <Toggle value={settings.weeklyPlanning} onChange={v => setSetting('weeklyPlanning', v)} />
          </div>

          {/* Google Calendar */}
          <div className="flex items-center px-4 py-3.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div className="flex-1">
              <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>Google Calendar</p>
              <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Off · optional</p>
            </div>
            <Toggle value={settings.googleCalendar} onChange={v => setSetting('googleCalendar', v)} />
          </div>

          {/* Notifications */}
          <div className="flex items-center px-4 py-3.5">
            <div className="flex-1">
              <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>Notifications</p>
              <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Task reminders</p>
            </div>
            <Toggle value={settings.notifications} onChange={v => setSetting('notifications', v)} />
          </div>
        </div>
      </div>

      {/* ── 6. GitHub row ────────────────────────────────────────────────── */}
      <div className="mx-4">
        <a
          href="https://github.com/Rwagatare/MirrorMe"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] rounded-2xl px-4 py-3.5 no-underline active:opacity-70 transition-opacity"
        >
          <div>
            <p style={{ fontSize: 13, color: '#e8e4dc', fontWeight: 500 }}>View on GitHub</p>
            <p style={{ fontSize: 10, color: '#5a5650', marginTop: 1 }}>Open source · MIT license</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#3d3d3d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </div>

    </div>
  )
}
