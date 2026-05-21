import { useState, useEffect } from 'react'

// ─── Constants ──────────────────────────────────────────────────────────────

const SECTION_META = {
  morning: { emoji: '🌅', label: 'Rise & reflect' },
  focus:   { emoji: '⚡', label: 'Deep work zone' },
  growth:  { emoji: '🌱', label: 'Sharpen your edge' },
  evening: { emoji: '🌙', label: 'Wind down & reflect' },
}

const SECTION_ORDER = ['morning', 'focus', 'growth', 'evening']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupBySection(tasks) {
  const groups = {}
  for (const section of SECTION_ORDER) groups[section] = []
  for (const task of tasks) {
    const key = SECTION_ORDER.includes(task.section) ? task.section : 'morning'
    groups[key].push(task)
  }
  return groups
}

// Derive display state: done stays done; the first todo is active; rest are locked
function withDisplayState(tasks) {
  let activeSeen = false
  return tasks.map((task) => {
    if (task.status === 'done') return { ...task, displayState: 'done' }
    if (!activeSeen) {
      activeSeen = true
      return { ...task, displayState: 'active' }
    }
    return { ...task, displayState: 'locked' }
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stars({ count = 0, max = 5 }) {
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < count ? 'text-[#c8b87a]' : 'text-[#2a2a2a]'}>
          ★
        </span>
      ))}
    </div>
  )
}

function TaskNode({ task, onActivate }) {
  const { displayState, title, stars_average } = task
  const initial = title?.[0]?.toUpperCase() ?? '?'

  const isDone   = displayState === 'done'
  const isActive = displayState === 'active'
  const isLocked = displayState === 'locked'

  const circleBase = 'w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold relative select-none'

  const circleClass = isDone
    ? `${circleBase} bg-[#1f1f1f] text-[#3a3a3a]`
    : isActive
    ? `${circleBase} bg-[#c8b87a] text-[#0f0f0f] cursor-pointer`
    : `${circleBase} bg-[#1a1a1a] text-[#2e2e2e] cursor-default`

  function handleClick() {
    if (isActive) onActivate(task)
  }

  return (
    <div className="flex flex-col items-center">
      {/* Circle node */}
      <div className={circleClass} onClick={handleClick}>
        {/* Pulse ring on active node */}
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-[#c8b87a] opacity-30 animate-ping" />
        )}

        {isLocked ? '🔒' : initial}
      </div>

      {/* Stars */}
      <Stars count={Math.round(stars_average ?? 0)} />

      {/* Title */}
      <p className={`mt-1 text-xs text-center max-w-[80px] leading-tight ${isDone ? 'text-[#2e2e2e]' : isActive ? 'text-[#c8b87a]' : 'text-[#3a3a3a]'}`}>
        {title}
      </p>
    </div>
  )
}

function SectionBanner({ sectionKey }) {
  const meta = SECTION_META[sectionKey] ?? { emoji: '📌', label: sectionKey }
  return (
    <div className="flex items-center gap-2 px-4 py-2 my-2">
      <span className="text-base">{meta.emoji}</span>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#3d3d3d]">
        {meta.label}
      </span>
      <div className="flex-1 h-px bg-[#1e1e1e]" />
    </div>
  )
}

function ProgressBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="px-6 pt-4 pb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] tracking-widest uppercase text-[#3d3d3d]">Today</span>
        <span className="text-[10px] text-[#3d3d3d]">{done} / {total}</span>
      </div>
      <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#c8b87a] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── PathView ────────────────────────────────────────────────────────────────

export default function PathView() {
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/tasks/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => { setTasks(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  function handleActivate(task) {
    alert('Pre-timer coming soon')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#2e2e2e] text-xs tracking-widest uppercase animate-pulse">Loading path…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <p className="text-[#3a3a3a] text-xs text-center">Could not reach the backend.<br />{error}</p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <p className="text-[#2e2e2e] text-xs text-center tracking-wide">No tasks yet.<br />Add one in the Planner.</p>
      </div>
    )
  }

  const enriched = withDisplayState(tasks)
  const groups   = groupBySection(enriched)
  const done     = enriched.filter((t) => t.status === 'done').length

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Progress bar */}
      <ProgressBar done={done} total={tasks.length} />

      {/* Sections */}
      <div className="flex flex-col items-center pb-8">
        {SECTION_ORDER.map((section) => {
          const sectionTasks = groups[section]
          if (sectionTasks.length === 0) return null

          return (
            <div key={section} className="w-full">
              <SectionBanner sectionKey={section} />

              {/* Nodes connected by a dashed vertical line */}
              <div className="flex flex-col items-center gap-0">
                {sectionTasks.map((task, idx) => (
                  <div key={task.id} className="flex flex-col items-center">
                    <TaskNode task={task} onActivate={handleActivate} />

                    {/* Dashed connector — skip after the last node in the section */}
                    {idx < sectionTasks.length - 1 && (
                      <div className="w-px h-8 border-l-2 border-dashed border-[#1e1e1e] my-1" />
                    )}
                  </div>
                ))}

                {/* Slightly longer connector between sections */}
                <div className="w-px h-10 border-l-2 border-dashed border-[#1a1a1a] my-1" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
