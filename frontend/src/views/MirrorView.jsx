import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import MemoryCalendar from '../components/MemoryCalendar'

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

function isoDateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function groupMemories(entries) {
  const today     = toISODate(new Date())
  const yesterday = isoDateOffset(-1)
  const sun       = new Date()
  sun.setDate(sun.getDate() - sun.getDay())
  const weekStart = toISODate(sun)

  const sorted = [...entries].sort((a, b) => (b.date > a.date ? 1 : -1))
  const groups = []
  const seen   = new Map()

  for (const entry of sorted) {
    let label
    if      (entry.date === today)     label = 'Today'
    else if (entry.date === yesterday) label = 'Yesterday'
    else if (entry.date >= weekStart)  label = 'This week'
    else {
      const [year, month] = entry.date.split('-')
      label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (!seen.has(label)) { seen.set(label, groups.length); groups.push({ label, entries: [] }) }
    groups[seen.get(label)].entries.push(entry)
  }
  return groups
}

function splitGroups(groups, limit) {
  let count = 0
  for (let i = 0; i < groups.length; i++) {
    count += groups[i].entries.length
    if (count >= limit) return { visible: groups.slice(0, i + 1), hidden: groups.slice(i + 1) }
  }
  return { visible: groups, hidden: [] }
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
  const [tasks,      setTasks]      = useState([])
  const [habits,     setHabits]     = useState([])
  const [memories,   setMemories]   = useState([])
  const [expandedIds, setExpandedIds] = useState([])
  const [showOlder,   setShowOlder]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [newHabit,   setNewHabit]   = useState({ emoji: '', title: '' })
  const [memoryView, setMemoryView] = useState('list') // 'list' | 'calendar'
  const [chartType,  setChartType]  = useState('bar')  // 'bar' | 'line' | 'heatmap'

  const weekDates = getWeekDates()
  const todayStr  = toISODate(new Date())

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/tasks/`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/habits/`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/memory/`).then(r => r.ok ? r.json() : []),
    ]).then(([t, h, m]) => {
      setTasks(t)
      setHabits(h)
      setMemories(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function toggleExpand(id) {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function deleteMemory(id) {
    const prev = memories
    setMemories(m => m.filter(entry => entry.id !== id)) // optimistic
    try {
      const res = await fetch(`${API_BASE}/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setMemories(prev) // roll back on failure
    }
  }

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

  // ── Heatmap data (GitHub-contributions style, last 12 weeks) ──────────────

  const HEATMAP_WEEKS = 12
  const heatmapByDate = new Map()
  for (const t of doneTasks) {
    const ds = (t.due_date ?? t.created_at ?? '').slice(0, 10)
    if (!ds) continue
    if (!heatmapByDate.has(ds)) heatmapByDate.set(ds, [])
    heatmapByDate.get(ds).push(t.stars_average)
  }

  const heatmapEnd   = new Date() // rewound to the current week's Sunday, so columns align Sun-Sat like GitHub
  heatmapEnd.setHours(12, 0, 0, 0)
  heatmapEnd.setDate(heatmapEnd.getDate() - heatmapEnd.getDay())
  const heatmapStart = new Date(heatmapEnd)
  heatmapStart.setDate(heatmapStart.getDate() - (HEATMAP_WEEKS - 1) * 7)

  const heatmapWeeks = Array.from({ length: HEATMAP_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(heatmapStart)
      date.setDate(date.getDate() + w * 7 + d)
      const ds     = toISODate(date)
      const scores = heatmapByDate.get(ds)
      const avg    = scores?.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
      return { date, ds, avg, future: date > new Date() }
    })
  )

  function heatmapColor(avg) {
    if (avg == null) return '#1e1e1e'
    if (avg < 1)  return 'rgba(200,184,122,0.18)'
    if (avg < 2)  return 'rgba(200,184,122,0.38)'
    if (avg < 3.5) return 'rgba(200,184,122,0.62)'
    return '#c8b87a'
  }

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

    await fetch(`${API_BASE}/habits/${habit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completions: JSON.stringify(updated), streak_count: streak }),
    })
  }

  async function addHabit(e) {
    e.preventDefault()
    if (!newHabit.title.trim()) return
    const res = await fetch(`${API_BASE}/habits/`, {
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

      {/* ── A: Stars chart ───────────────────────────────────────────────── */}
      <div className="glass-card mx-4 mb-4 bg-[#161616] p-4">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-white text-xs font-semibold">
            {chartType === 'heatmap' ? 'Last 12 weeks' : "This week's stars"}
          </p>
          <div style={{ display: 'flex', gap: 2, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 2 }}>
            {[['bar', 'Bar'], ['line', 'Line'], ['heatmap', 'Heat']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setChartType(v)}
                style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 8, border: 'none',
                  cursor: 'pointer',
                  background: chartType === v ? '#2a2a2a' : 'none',
                  color: chartType === v ? '#c8b87a' : '#5a5650',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[#3d3d3d] text-[10px] mb-4">
          Avg: {overallAvg} ★ across {totalDone} task{totalDone !== 1 ? 's' : ''}
        </p>

        {chartType === 'bar' && (
          <div className="flex items-end justify-between gap-1" style={{ height: MAX_BAR_H + 32 }}>
            {weekDates.map((date, i) => {
              const ds      = toISODate(date)
              const isToday = ds === todayStr
              const { avg } = starsByDay[i]
              const barH    = avg != null ? Math.max(4, (avg / 5) * MAX_BAR_H) : 0

              return (
                <div key={ds} className="flex flex-col items-center flex-1 gap-1">
                  <span style={{
                    fontSize: 9,
                    color: avg != null ? (isToday ? '#c8b87a' : '#5a5a5a') : '#2a2a2a',
                    minHeight: 14, display: 'block', textAlign: 'center',
                  }}>
                    {avg != null ? avg : '–'}
                  </span>
                  <div style={{ width: '100%', height: MAX_BAR_H, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%', height: barH, borderRadius: 4,
                      background: isToday ? '#c8b87a' : 'rgba(200,184,122,0.30)',
                      transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? '#c8b87a' : '#3d3d3d', fontWeight: isToday ? 700 : 400 }}>
                    {DAYS_SHORT[date.getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {chartType === 'line' && (() => {
          const W = 320, H = MAX_BAR_H, PAD = 10
          const points = starsByDay.map((d, i) => ({
            x: PAD + (i / 6) * (W - PAD * 2),
            y: d.avg != null ? H - (d.avg / 5) * H : null,
            avg: d.avg,
          }))
          const known = points.filter(p => p.avg != null)
          const path  = known.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          const high  = known.length ? known.reduce((a, b) => (b.avg > a.avg ? b : a)) : null
          const low   = known.length ? known.reduce((a, b) => (b.avg < a.avg ? b : a)) : null

          return (
            <div style={{ height: MAX_BAR_H + 32 }}>
              <svg width="100%" height={H + 4} viewBox={`0 0 ${W} ${H + 4}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {known.length > 1 && (
                  <path d={path} fill="none" stroke="#c8b87a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {points.map((p, i) => p.avg == null ? null : (
                  <circle
                    key={i} cx={p.x} cy={p.y} r={p === high || p === low ? 4 : 2.5}
                    fill={p === high ? '#8fa876' : p === low ? '#c47a6a' : '#c8b87a'}
                  />
                ))}
                {high && <text x={high.x} y={high.y - 8} fontSize="9" fill="#8fa876" textAnchor="middle">{high.avg}</text>}
                {low && low !== high && <text x={low.x} y={low.y + 16} fontSize="9" fill="#c47a6a" textAnchor="middle">{low.avg}</text>}
              </svg>
              <div className="flex justify-between mt-1">
                {weekDates.map(date => {
                  const isToday = toISODate(date) === todayStr
                  return (
                    <span key={toISODate(date)} style={{ fontSize: 9, color: isToday ? '#c8b87a' : '#3d3d3d', fontWeight: isToday ? 700 : 400, flex: 1, textAlign: 'center' }}>
                      {DAYS_SHORT[date.getDay()]}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {chartType === 'heatmap' && (
          <div>
            <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
              {heatmapWeeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {week.map(day => (
                    <div
                      key={day.ds}
                      title={day.avg != null ? `${day.ds}: ${Math.round(day.avg * 10) / 10}★` : day.ds}
                      style={{
                        width: 11, height: 11, borderRadius: 2,
                        background: day.future ? 'transparent' : heatmapColor(day.avg),
                        border: day.ds === todayStr ? '1px solid #c8b87a' : 'none',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mt-2">
              <span style={{ fontSize: 9, color: '#3d3d3d' }}>Less</span>
              {[null, 0.5, 1.5, 3, 4.5].map((v, i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: heatmapColor(v) }} />
              ))}
              <span style={{ fontSize: 9, color: '#3d3d3d' }}>More</span>
            </div>
          </div>
        )}
      </div>

      {/* ── B: AI observations ──────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <p className="text-[#3d3d3d] text-[10px] uppercase tracking-widest mb-2">Patterns</p>
        <div className="flex flex-col gap-2">
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i}
              style={{ borderLeft: `3px solid ${ins.color}` }}
              className="glass-card card-enter bg-[#161616] px-3 py-3 flex items-start gap-2.5"
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
          <div className="glass-card bg-[#161616] overflow-hidden">
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
                      <span className="streak-badge" style={{ display: 'inline-block', marginTop: 2 }}>{streak}d streak</span>
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
                        className={done ? 'habit-pop' : ''}
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
                          transition: 'background-color 160ms var(--ease-spring), border-color 160ms var(--ease-spring), transform 160ms var(--ease-spring)',
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

      {/* ── D: Memory log ────────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 mb-4" data-memory-section="true">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[#3d3d3d] text-[10px] uppercase tracking-widest">Your memory</p>
          <div style={{ display: 'flex', gap: 2, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: 2 }}>
            {['list', 'calendar'].map(v => (
              <button
                key={v}
                onClick={() => setMemoryView(v)}
                style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8, border: 'none',
                  textTransform: 'capitalize', cursor: 'pointer',
                  background: memoryView === v ? '#2a2a2a' : 'none',
                  color: memoryView === v ? '#c8b87a' : '#5a5650',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[#2a2a2a] text-[10px] mb-3">Recent logs and journal entries</p>

        {memories.length === 0 ? (
          <p className="text-[#3a3a3a] text-xs text-center py-6">
            No memories yet — use the ✏️ button to log your first one
          </p>
        ) : memoryView === 'calendar' ? (
          <MemoryCalendar memories={memories} onDelete={deleteMemory} />
        ) : (() => {
          const groups   = groupMemories(memories)
          const { visible, hidden } = splitGroups(groups, 10)
          const displayed = showOlder ? groups : visible
          const hiddenCount = hidden.reduce((s, g) => s + g.entries.length, 0)

          return (
            <>
              {displayed.map(group => (
                <div key={group.label} style={{ marginBottom: 4 }}>
                  {/* Sticky group header */}
                  <div style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 0 6px',
                    background: '#0f0f0f',
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.10em', color: '#c8b87a', whiteSpace: 'nowrap',
                    }}>
                      {group.label}
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
                  </div>

                  {/* Entries */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.entries.map(entry => {
                      const isExpanded  = expandedIds.includes(entry.id)
                      const isJournal   = entry.entry_type === 'journal'
                      const badgeColor  = isJournal ? '#c8b87a' : '#4a9d8a'
                      const badgeBg     = isJournal ? 'rgba(200,184,122,0.10)' : 'rgba(74,157,138,0.10)'
                      const badgeBorder = isJournal ? 'rgba(200,184,122,0.20)' : 'rgba(74,157,138,0.20)'

                      return (
                        <div
                          key={entry.id}
                          className="glass-card card-enter"
                          style={{ background: '#161616', padding: '12px 14px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                              color: badgeColor, background: badgeBg,
                              border: `1px solid ${badgeBorder}`,
                              borderRadius: 20, padding: '2px 8px',
                            }}>
                              {entry.entry_type ?? 'note'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {entry.mood && <span style={{ fontSize: 14, lineHeight: 1 }}>{entry.mood}</span>}
                              {entry.time_of_day && (
                                <span style={{ fontSize: 10, color: '#3d3d3d' }}>{entry.time_of_day}</span>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this memory? This can\'t be undone.')) deleteMemory(entry.id)
                                }}
                                aria-label="Delete memory"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 20, height: 20, marginLeft: 2, padding: 0,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#3d3d3d',
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" /><path d="M14 11v6" />
                                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p
                            onClick={() => toggleExpand(entry.id)}
                            style={{
                              fontSize: 12, color: '#c8c4bc', lineHeight: 1.6, margin: 0,
                              cursor: 'pointer',
                              display: '-webkit-box',
                              WebkitLineClamp: isExpanded ? 'unset' : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: isExpanded ? 'visible' : 'hidden',
                            }}
                          >
                            {entry.content}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {!showOlder && hiddenCount > 0 && (
                <button
                  onClick={() => setShowOlder(true)}
                  style={{
                    width: '100%', marginTop: 8,
                    padding: '10px', border: '1px solid #2a2a2a',
                    borderRadius: 12, background: 'none',
                    color: '#5a5650', fontSize: 12, cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                >
                  Show older entries ({hiddenCount} more)
                </button>
              )}
            </>
          )
        })()}
      </div>

      {/* Add habit modal */}
      {showModal && (
        <div className="sheet-backdrop fixed inset-0 z-40 flex items-end justify-center">
          <div className="glass-card sheet-panel w-full max-w-[420px] bg-[#141414] px-6 pt-6 pb-10">
            <div className="sheet-handle" />
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
