import { useState, useEffect } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_BAR_H  = 80

const AI_INSIGHTS = [
  { emoji: '📈', color: '#8fa876', text: 'You complete focus tasks 40% faster on weekdays.' },
  { emoji: '🌅', color: '#c8b87a', text: 'Your strongest section is morning — 78% completion rate.' },
  { emoji: '⚠️', color: '#c47a6a', text: 'Weekend completion drops 30%. Consider lighter weekend tasks.' },
  { emoji: '🔥', color: '#9b8fd4', text: '5-day streak — your longest this month. Keep it going!' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates() {
  const now = new Date()
  const dow = now.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dow + i)
    d.setHours(12, 0, 0, 0)
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

function parseCompletions(str) {
  try { return JSON.parse(str || '[]') } catch { return [] }
}

function computeStreak(completions) {
  if (!completions.length) return 0
  const set = new Set(completions)
  let streak = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  while (set.has(toISODate(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ─── MirrorView ───────────────────────────────────────────────────────────────

export default function MirrorView() {
  const [tasks,     setTasks]     = useState([])
  const [habits,    setHabits]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newHabit,  setNewHabit]  = useState({ emoji: '', title: '' })

  const weekDates = getWeekDates()
  const todayStr  = toISODate(new Date())

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/tasks/').then(r => r.ok ? r.json() : []),
      fetch('http://localhost:8000/habits/').then(r => r.ok ? r.json() : []),
    ]).then(([t, h]) => {
      setTasks(t)
      setHabits(h)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── Stars bar chart ───────────────────────────────────────────────────────

  const doneTasks = tasks.filter(t => t.status === 'done' && t.stars_average != null)

  const starsByDay = weekDates.map(date => {
    const ds       = toISODate(date)
    const dayTasks = doneTasks.filter(t =>
      ((t.due_date ?? t.created_at ?? '').slice(0, 10)) === ds
    )
    if (!dayTasks.length) return { avg: null, count: 0 }
    const avg = dayTasks.reduce((s, t) => s + t.stars_average, 0) / dayTasks.length
    return { avg: Math.round(avg * 10) / 10, count: dayTasks.length }
  })

  const totalDone  = doneTasks.length
  const overallAvg = totalDone
    ? Math.round(doneTasks.reduce((s, t) => s + t.stars_average, 0) / totalDone * 10) / 10
    : 0

  // ── Habit toggle ──────────────────────────────────────────────────────────

  async function toggleHabitDay(habit, dateStr) {
    const prev    = parseCompletions(habit.completions)
    const updated = prev.includes(dateStr)
      ? prev.filter(d => d !== dateStr)
      : [...prev, dateStr]
    const streak  = computeStreak(updated)

    // Optimistic update
    setHabits(hs => hs.map(h =>
      h.id === habit.id
        ? { ...h, completions: JSON.stringify(updated), streak_count: streak }
        : h
    ))

    await fetch(`http://localhost:8000/habits/${habit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completions: JSON.stringify(updated), streak_count: streak }),
    })
  }

  async function addHabit(e) {
    e.preventDefault()
    if (!newHabit.title.trim()) return
    const res = await fetch('http://localhost:8000/habits/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newHabit.title.trim(), emoji: newHabit.emoji.trim() || null }),
    })
    if (res.ok) { const created = await res.json(); setHabits(prev => [...prev, created]) }
    setNewHabit({ emoji: '', title: '' })
    setShowModal(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[#2e2e2e] text-xs tracking-widest uppercase animate-pulse">Loading mirror…</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0f0f0f] pb-8">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-white text-sm font-semibold tracking-wide">Mirror</h1>
        <p className="text-[#3d3d3d] text-[10px] mt-0.5">Reflections on your week</p>
      </div>

      {/* ── A: Stars bar chart ───────────────────────────────────────────── */}
      <div className="mx-4 mb-4 bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4">
        <p className="text-white text-xs font-semibold mb-0.5">This week's stars</p>
        <p className="text-[#3d3d3d] text-[10px] mb-4">
          Avg: {overallAvg} ★ across {totalDone} task{totalDone !== 1 ? 's' : ''}
        </p>

        <div className="flex items-end justify-between gap-1" style={{ height: MAX_BAR_H + 32 }}>
          {weekDates.map((date, i) => {
            const ds      = toISODate(date)
            const isToday = ds === todayStr
            const { avg } = starsByDay[i]
            const barH    = avg != null ? Math.max(4, (avg / 5) * MAX_BAR_H) : 0

            return (
              <div key={ds} className="flex flex-col items-center flex-1 gap-1">
                {/* Numeric label above bar */}
                <span style={{
                  fontSize: 9,
                  color: avg != null ? (isToday ? '#c8b87a' : '#5a5a5a') : '#2a2a2a',
                  minHeight: 14,
                  display: 'block',
                  textAlign: 'center',
                }}>
                  {avg != null ? avg : '–'}
                </span>

                {/* Bar track + fill */}
                <div style={{ width: '100%', height: MAX_BAR_H, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: barH,
                    borderRadius: 4,
                    background: isToday ? '#c8b87a' : 'rgba(200,184,122,0.30)',
                    transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>

                {/* Day abbreviation */}
                <span style={{
                  fontSize: 9,
                  color: isToday ? '#c8b87a' : '#3d3d3d',
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {DAYS_SHORT[date.getDay()]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── B: AI observations ──────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <p className="text-[#3d3d3d] text-[10px] uppercase tracking-widest mb-2">Patterns</p>
        <div className="flex flex-col gap-2">
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i}
              style={{ borderLeft: `3px solid ${ins.color}` }}
              className="bg-[#161616] rounded-xl px-3 py-3 flex items-start gap-2.5"
            >
              <span className="text-base flex-shrink-0 leading-tight">{ins.emoji}</span>
              <p className="text-[#c8c4bc] text-xs leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── C: Habits tracker ────────────────────────────────────────────── */}
      <div className="mx-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#3d3d3d] text-[10px] uppercase tracking-widest">Habits</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-[10px] font-semibold text-[#0f0f0f] bg-[#c8b87a] px-2.5 py-1 rounded-full active:opacity-80"
          >
            + Add
          </button>
        </div>

        {habits.length === 0 ? (
          <p className="text-[#3a3a3a] text-xs text-center py-6">
            No habits yet — add one below
          </p>
        ) : (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center px-3 pt-3 pb-1">
              <div className="flex-1" />
              {weekDates.map(date => {
                const ds = toISODate(date)
                return (
                  <div key={ds} style={{ width: 30, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: ds === todayStr ? 700 : 400,
                      color: ds === todayStr ? '#c8b87a' : '#3d3d3d',
                    }}>
                      {DAYS_SHORT[date.getDay()][0]}
                    </span>
                  </div>
                )
              })}
            </div>

            {habits.map((habit, hi) => {
              const completions = parseCompletions(habit.completions)
              const streak      = habit.streak_count ?? 0
              return (
                <div
                  key={habit.id}
                  className="flex items-center px-3 py-2"
                  style={{ borderTop: hi > 0 ? '1px solid #1e1e1e' : 'none' }}
                >
                  {/* Name + streak */}
                  <div className="flex-1 min-w-0 mr-1">
                    <p className="text-[#e8e4dc] text-[11px] font-medium truncate leading-tight">
                      {habit.emoji && <span className="mr-1">{habit.emoji}</span>}
                      {habit.title}
                    </p>
                    {streak > 0 && (
                      <p style={{ fontSize: 9, color: '#c8b87a', marginTop: 1 }}>{streak}d streak</p>
                    )}
                  </div>

                  {/* 7-day circles */}
                  {weekDates.map(date => {
                    const ds   = toISODate(date)
                    const done = completions.includes(ds)
                    return (
                      <button
                        key={ds}
                        onClick={() => toggleHabitDay(habit, ds)}
                        style={{
                          width: 28, height: 28,
                          borderRadius: '50%',
                          background: done ? '#c8b87a' : '#1e1e1e',
                          border: `1.5px solid ${done ? '#c8b87a' : '#2a2a2a'}`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 2,
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <polyline points="2,5 4,7 8,3" stroke="#0f0f0f"
                              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add habit modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-[#141414] rounded-t-2xl px-6 pt-6 pb-10">
            <form onSubmit={addHabit} className="space-y-4">
              <h3 className="text-white text-base font-semibold">New Habit</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="😊"
                  value={newHabit.emoji}
                  onChange={e => setNewHabit(h => ({ ...h, emoji: e.target.value }))}
                  maxLength={2}
                  className="w-16 bg-[#1a1a1a] border border-[#222] rounded-xl px-3 py-3 text-white text-center text-lg focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
                />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Habit name"
                  value={newHabit.title}
                  onChange={e => setNewHabit(h => ({ ...h, title: e.target.value }))}
                  className="flex-1 bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-[#4a4a4a] text-sm active:opacity-70">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold active:opacity-90">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
