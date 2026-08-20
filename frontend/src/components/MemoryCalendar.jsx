import { useState, useMemo } from 'react'

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toISODate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function buildMonthGrid(year, month) {
  const first     = new Date(year, month, 1)
  const startDow  = first.getDay()
  const daysInMon = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMon; d++) cells.push(new Date(year, month, d))
  return cells
}

// ─── Day detail sheet ──────────────────────────────────────────────────────

function DaySheet({ date, entries, onClose, onDelete }) {
  const logs    = entries.filter(e => e.entry_type !== 'journal')
  const journal = entries.filter(e => e.entry_type === 'journal')

  function Section({ title, color, items }) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, margin: '0 0 8px' }}>
          {title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(entry => (
            <div key={entry.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <p style={{ fontSize: 12, color: '#c8c4bc', lineHeight: 1.6, margin: 0, flex: 1 }}>
                  {entry.content}
                </p>
                <button
                  onClick={() => { if (window.confirm("Delete this memory? This can't be undone.")) onDelete(entry.id) }}
                  aria-label="Delete memory"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d3d3d', padding: 0, flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
              {(entry.mood || entry.time_of_day) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  {entry.mood && <span style={{ fontSize: 13 }}>{entry.mood}</span>}
                  {entry.time_of_day && <span style={{ fontSize: 10, color: '#3d3d3d' }}>{entry.time_of_day}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 45, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 420, maxHeight: '78vh', overflowY: 'auto', background: '#141414', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#e8e4dc', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>

        {entries.length === 0 ? (
          <p style={{ fontSize: 12, color: '#3a3a3a', textAlign: 'center', padding: '24px 0' }}>No entries this day.</p>
        ) : (
          <>
            <Section title="Journal"    color="#c8b87a" items={journal} />
            <Section title="Quick logs" color="#4a9d8a" items={logs} />
          </>
        )}

        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 4, padding: 12, border: '1px solid #2a2a2a', borderRadius: 14, background: 'none', color: '#4a4a4a', fontSize: 13, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ─── MemoryCalendar ─────────────────────────────────────────────────────────

export default function MemoryCalendar({ memories, onDelete }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)

  const byDate = useMemo(() => {
    const map = new Map()
    for (const m of memories) {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date).push(m)
    }
    return map
  }, [memories])

  const cells   = buildMonthGrid(cursor.getFullYear(), cursor.getMonth())
  const todayISO = toISODate(today)
  const selectedEntries = selectedDate ? (byDate.get(toISODate(selectedDate)) || []) : []

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          style={{ background: 'none', border: 'none', color: '#5a5650', cursor: 'pointer', fontSize: 16, padding: 4 }}
        >
          ‹
        </button>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#e8e4dc', margin: 0 }}>
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          style={{ background: 'none', border: 'none', color: '#5a5650', cursor: 'pointer', fontSize: 16, padding: 4 }}
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS_SHORT.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: '#3d3d3d', textAlign: 'center', textTransform: 'uppercase' }}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const iso     = toISODate(date)
          const entries = byDate.get(iso) || []
          const hasJournal = entries.some(e => e.entry_type === 'journal')
          const hasLog     = entries.some(e => e.entry_type !== 'journal')
          const isToday    = iso === todayISO

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, borderRadius: 10, cursor: 'pointer',
                background: isToday ? 'rgba(200,184,122,0.12)' : entries.length ? '#161616' : 'none',
                border: `1px solid ${isToday ? '#c8b87a' : '#1e1e1e'}`,
              }}
            >
              <span style={{ fontSize: 11, color: isToday ? '#c8b87a' : entries.length ? '#c8c4bc' : '#3a3a3a' }}>
                {date.getDate()}
              </span>
              <div style={{ display: 'flex', gap: 2, height: 4 }}>
                {hasJournal && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#c8b87a' }} />}
                {hasLog     && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4a9d8a' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, justifyContent: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#3d3d3d' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8b87a' }} /> Journal
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#3d3d3d' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a9d8a' }} /> Quick log
        </span>
      </div>

      {selectedDate && (
        <DaySheet
          date={selectedDate}
          entries={selectedEntries}
          onClose={() => setSelectedDate(null)}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
