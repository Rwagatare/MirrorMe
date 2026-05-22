import { useState, useEffect, useRef } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_META = {
  morning: { emoji: '🌅', borderColor: '#c8b87a' },
  focus:   { emoji: '⚡', borderColor: '#4a9d8a' },
  growth:  { emoji: '🌱', borderColor: '#8fa876' },
  evening: { emoji: '🌙', borderColor: '#9b8fd4' },
}

const SECTIONS = ['morning', 'focus', 'growth', 'evening']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const RECURRENCE_OPTIONS = [
  { id: 'once',     label: 'Once'     },
  { id: 'daily',    label: 'Daily'    },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly',   label: 'Weekly'   },
  { id: 'custom',   label: 'Custom'   },
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates() {
  const now = new Date()
  const dow = now.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dow + i)
    d.setHours(12, 0, 0, 0) // noon avoids daylight-saving edge cases
    return d
  })
}

function toISODate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function taskDateKey(task) {
  if (!task.due_date) return null
  return String(task.due_date).slice(0, 10)
}

// ─── PlannerView ─────────────────────────────────────────────────────────────

export default function PlannerView() {
  const [tasks, setTasks]               = useState([])
  const [showSheet, setShowSheet]       = useState(false)
  const [toast, setToast]               = useState(null)
  const [hoveredDeleteId, setHoveredDeleteId] = useState(null)
  const [form, setForm]           = useState({
    title: '',
    duration_minutes: 25,
    section: 'focus',
    dayIndex: new Date().getDay(),
    recurrence: 'once',
    recurrence_days: [],
  })

  const toastTimer  = useRef(null)
  const draggingId  = useRef(null)
  const weekDates   = getWeekDates()
  const todayStr    = toISODate(new Date())

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    try {
      const res = await fetch('http://localhost:8000/tasks/')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
        console.log('tasks:', data)
      }
    } catch (_) {}
  }

  function showToastMsg(msg) {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function onDragStart(task) {
    draggingId.current = task.id
  }

  async function onDrop(date) {
    const id = draggingId.current
    draggingId.current = null
    if (!id) return

    const task = tasks.find(t => t.id === id)
    if (!task) return

    const meta    = SECTION_META[task.section] ?? { emoji: '📌' }
    const dayName = DAYS[date.getDay()]

    await fetch(`http://localhost:8000/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: date.toISOString() }),
    })

    showToastMsg(`Moved to ${dayName} · ${meta.emoji} ${task.section ?? ''}`)
    fetchTasks()
  }

  // ── Add task ───────────────────────────────────────────────────────────────

  async function handleAddTask(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    const due = new Date(weekDates[form.dayIndex])
    await fetch('http://localhost:8000/tasks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            form.title.trim(),
        duration_minutes: form.duration_minutes,
        section:          form.section,
        due_date:         due.toISOString(),
        recurrence:       form.recurrence,
        recurrence_days:  form.recurrence === 'custom'
                            ? JSON.stringify(form.recurrence_days)
                            : null,
      }),
    })

    setForm({ title: '', duration_minutes: 25, section: 'focus', dayIndex: new Date().getDay(), recurrence: 'once', recurrence_days: [] })
    setShowSheet(false)
    fetchTasks()
  }

  // ── Delete task ────────────────────────────────────────────────────────────

  async function handleDeleteTask(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return
    await fetch(`http://localhost:8000/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  // ── Group tasks by day ─────────────────────────────────────────────────────

  const tasksByDay = {}
  for (const d of weekDates) tasksByDay[toISODate(d)] = []
  for (const t of tasks) {
    // Tasks without a due_date fall into today's column
    const key = taskDateKey(t) ?? todayStr
    if (tasksByDay[key] !== undefined) tasksByDay[key].push(t)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">

      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-white text-sm font-semibold tracking-wide">Planner</h1>
        {/* Google Calendar sync badge — UI only, not wired yet */}
        <span className="text-[10px] text-teal-400 border border-teal-900 rounded-full px-2.5 py-0.5 font-medium">
          ✓ Synced
        </span>
      </div>

      {/* 7-day kanban columns — horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-2 px-3 pb-3 min-w-max">
          {weekDates.map((date) => {
            const ds       = toISODate(date)
            const isToday  = ds === todayStr
            const dayTasks = tasksByDay[ds] ?? []

            return (
              <div
                key={ds}
                style={{
                  width: 130,
                  minWidth: 130,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  background: '#161616',
                  border: `1px solid ${isToday ? '#c8b87a' : '#2a2a2a'}`,
                  borderRadius: 12,
                  padding: 12,
                  boxSizing: 'border-box',
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(date)}
              >
                {/* Day header */}
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <p style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: isToday ? '#c8b87a' : '#3d3d3d',
                    margin: 0,
                  }}>
                    {DAYS[date.getDay()]}
                  </p>
                  <p style={{
                    fontSize: 22,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: isToday ? '#c8b87a' : '#3d3d3d',
                    margin: 0,
                  }}>
                    {date.getDate()}
                  </p>
                </div>

                {/* Drop zone / task pills */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 40 }}>
                  {dayTasks.map(task => {
                    const meta = SECTION_META[task.section] ?? { emoji: '📌', borderColor: '#3a3a3a' }
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => onDragStart(task)}
                        style={{
                          background: '#1e1e1e',
                          borderLeft: `3px solid ${meta.borderColor}`,
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 12,
                          color: '#e8e4dc',
                          marginBottom: 6,
                          cursor: 'grab',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ marginRight: 4 }}>{meta.emoji}</span>
                        {task.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add task trigger bar */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 flex-shrink-0">
        <button
          onClick={() => setShowSheet(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-[#2a2a2a] text-[#3d3d3d] text-xs font-medium tracking-wide active:border-[#c8b87a]/40 transition-colors"
        >
          + Add task
        </button>
      </div>

      {/* Add task bottom sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-[#141414] rounded-t-2xl px-6 pt-6 pb-10">
            <form onSubmit={handleAddTask} className="space-y-4">
              <h3 className="text-white text-base font-semibold">Add Task</h3>

              {/* Title */}
              <input
                type="text"
                required
                autoFocus
                placeholder="Task title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
              />

              {/* Duration picker */}
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3">
                <span className="text-[#3d3d3d] text-xs">Duration</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, duration_minutes: Math.max(5, f.duration_minutes - 5) }))}
                    className="w-7 h-7 rounded-full bg-[#222] text-white text-sm flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-white text-sm font-semibold w-14 text-center">
                    {form.duration_minutes} min
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, duration_minutes: Math.min(120, f.duration_minutes + 5) }))}
                    className="w-7 h-7 rounded-full bg-[#222] text-white text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Section selector */}
              <div className="grid grid-cols-4 gap-2">
                {SECTIONS.map(s => {
                  const m = SECTION_META[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, section: s }))}
                      className={`flex flex-col items-center py-2.5 rounded-xl text-xs border transition-colors ${
                        form.section === s
                          ? 'border-[#c8b87a] text-[#c8b87a] bg-[#c8b87a]/10'
                          : 'border-[#222] text-[#3d3d3d] bg-[#1a1a1a]'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span className="capitalize text-[9px] mt-0.5">{s}</span>
                    </button>
                  )
                })}
              </div>

              {/* Day selector */}
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, dayIndex: i }))}
                    className={`flex flex-col items-center py-1.5 rounded-lg text-[9px] border transition-colors ${
                      form.dayIndex === i
                        ? 'border-[#c8b87a] text-[#c8b87a] bg-[#c8b87a]/10'
                        : 'border-[#222] text-[#3d3d3d]'
                    }`}
                  >
                    <span>{DAYS[d.getDay()]}</span>
                    <span className="font-bold">{d.getDate()}</span>
                  </button>
                ))}
              </div>

              {/* Recurrence selector */}
              <div>
                <p className="text-[#3d3d3d] text-[10px] mb-2 uppercase tracking-widest">Repeat</p>
                <div className="flex gap-1.5 flex-wrap">
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, recurrence: opt.id }))}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                        form.recurrence === opt.id
                          ? 'border-[#c8b87a] text-[#c8b87a] bg-[#c8b87a]/10'
                          : 'border-[#222] text-[#3d3d3d] bg-[#1a1a1a]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom day toggles */}
                {form.recurrence === 'custom' && (
                  <div className="flex gap-1.5 justify-between mt-3">
                    {WEEKDAY_LABELS.map((label, i) => {
                      const active = form.recurrence_days.includes(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            recurrence_days: active
                              ? f.recurrence_days.filter(d => d !== i)
                              : [...f.recurrence_days, i],
                          }))}
                          className={`w-9 h-9 rounded-full text-[11px] font-bold border transition-colors ${
                            active
                              ? 'border-[#c8b87a] text-[#c8b87a] bg-[#c8b87a]/10'
                              : 'border-[#222] text-[#3d3d3d]'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sheet actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSheet(false)}
                  className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-[#4a4a4a] text-sm active:opacity-70 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold active:opacity-90 transition-opacity"
                >
                  Add
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Move toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-xs font-medium shadow-xl whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}

    </div>
  )
}
