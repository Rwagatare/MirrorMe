import { useState, useEffect } from 'react'
import PreTimer      from '../components/PreTimer'
import Timer         from '../components/Timer'
import IncompleteNote from '../components/IncompleteNote'
import GiftModal     from '../components/GiftModal'

// ─── Constants ───────────────────────────────────────────────────────────────

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
  for (const s of SECTION_ORDER) groups[s] = []
  for (const t of tasks) {
    const key = SECTION_ORDER.includes(t.section) ? t.section : 'morning'
    groups[key].push(t)
  }
  return groups
}

function currentSection() {
  const h = new Date().getHours()
  if (h >= 6  && h <= 11) return 'morning'
  if (h >= 12 && h <= 16) return 'focus'
  if (h >= 17 && h <= 19) return 'growth'
  return 'evening' // 20-23 and 0-5
}

// Active node = first todo task in the current time-of-day section;
// if that section is all done, fall through to the next section with a todo task.
function withDisplayState(tasks) {
  const section    = currentSection()
  const sectionIdx = SECTION_ORDER.indexOf(section)

  // Build ordered list of sections starting from current, wrapping around
  const orderedSections = [
    ...SECTION_ORDER.slice(sectionIdx),
    ...SECTION_ORDER.slice(0, sectionIdx),
  ]

  // Find the id of the task that should be active
  let activeId = null
  for (const s of orderedSections) {
    const firstTodo = tasks.find(t => (t.section ?? 'morning') === s && (t.status ?? 'todo') !== 'done')
    if (firstTodo) { activeId = firstTodo.id; break }
  }

  return tasks.map(task => {
    const status = task.status ?? 'todo'
    if (status === 'done')      return { ...task, displayState: 'done'   }
    if (task.id === activeId)   return { ...task, displayState: 'active' }
    return { ...task, displayState: 'locked' }
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stars({ count = 0, max = 5 }) {
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < count ? 'text-[#c8b87a]' : 'text-[#2a2a2a]'}>★</span>
      ))}
    </div>
  )
}

function TaskNode({ task, onActivate, onMenu }) {
  const { displayState, title, stars_average } = task
  const initial  = title?.[0]?.toUpperCase() ?? '?'
  const isDone   = displayState === 'done'
  const isActive = displayState === 'active'
  const isLocked = displayState === 'locked'

  const base = 'w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold relative select-none'
  const circleClass = isDone
    ? `${base} bg-[#1f1f1f] text-[#3a3a3a] cursor-pointer`
    : isActive
    ? `${base} bg-[#c8b87a] text-[#0f0f0f] cursor-pointer`
    : `${base} bg-[#1a1a1a] text-[#2e2e2e] cursor-pointer`

  function handleClick() {
    if (isActive) onActivate(task)
    else onMenu(task)
  }

  return (
    <div className="flex flex-col items-center">
      <div className={circleClass} onClick={handleClick} {...(isActive ? { 'data-active-node': 'true' } : {})}>
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-[#c8b87a] opacity-30 animate-ping" />
        )}
        {isLocked ? '🔒' : initial}
      </div>
      <Stars count={Math.round(stars_average ?? 0)} />
      <p className={`mt-1 text-xs text-center max-w-[80px] leading-tight ${
        isDone ? 'text-[#2e2e2e]' : isActive ? 'text-[#c8b87a]' : 'text-[#3a3a3a]'
      }`}>
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

export default function PathView({ onTimerActive }) {
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [menuTaskId, setMenuTaskId] = useState(null)

  // Modal state machine
  const [modal,            setModal]            = useState(null) // 'pretimer'|'timer'|'incomplete'|'gift'
  const [activeTask,       setActiveTask]       = useState(null)
  const [timerDuration,    setTimerDuration]    = useState(25)
  const [timerIsLate,      setTimerIsLate]      = useState(false)
  const [timerStarCap,     setTimerStarCap]     = useState(5)
  const [incompleteStars,  setIncompleteStars]  = useState(0)
  const [completedSection, setCompletedSection] = useState(null)

  // Returns the fresh task list so callers can inspect it immediately
  async function fetchTasks() {
    try {
      const res = await fetch('http://localhost:8000/tasks/today')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTasks(data)
      setLoading(false)
      return data
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return []
    }
  }

  useEffect(() => { fetchTasks() }, [])

  // Notify App when the timer overlay is open so it can hide the memory button
  useEffect(() => {
    onTimerActive?.(modal === 'pretimer' || modal === 'timer' || modal === 'incomplete')
  }, [modal])

  // ── Modal handlers ────────────────────────────────────────────────────────

  function handleActivate(task) {
    setActiveTask(task)
    setModal('pretimer')
  }

  function handlePreTimerStart(duration, isLate) {
    setTimerDuration(duration)
    setTimerIsLate(isLate)
    setTimerStarCap(5)
    setModal('timer')
  }

  async function handleTaskDone(stars) {
    if (!activeTask) return
    // Capture section before any state changes — activeTask may be cleared before awaits resolve
    const section = activeTask.section
    const taskId  = activeTask.id

    try {
      const res = await fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', stars_average: stars }),
      })
      if (!res.ok) throw new Error(`PATCH ${res.status}`)
    } catch {
      // PATCH failed — close modals without changing task state
      setModal(null)
      setActiveTask(null)
      return
    }

    // Re-fetch so node styling reflects the real DB state
    const updated = await fetchTasks()
    setActiveTask(null)

    // Only trigger GiftModal when every task in this section is now done
    if (!section) { setModal(null); return }

    const sectionTasks = updated.filter(t => t.section === section)
    const allDone      = sectionTasks.length > 0 && sectionTasks.every(t => t.status === 'done')

    if (allDone) {
      setCompletedSection(section)
      setModal('gift')
    } else {
      setModal(null)
    }
  }

  // Timer ran out naturally — pass current earned stars to IncompleteNote
  function handleTimeUp(stars) {
    setIncompleteStars(stars)
    setModal('incomplete')
  }

  // IncompleteNote "+ 10 min" — restart timer with max 1 star
  function handleExtend() {
    setTimerDuration(10)
    setTimerStarCap(1)
    setModal('timer')
  }

  function handleCloseAll() {
    setModal(null)
    setActiveTask(null)
  }

  function handleGiftClose() {
    setModal(null)
    setCompletedSection(null)
    fetchTasks()
  }

  function handleMenu(task) {
    setMenuTaskId(prev => prev === task.id ? null : task.id)
  }

  async function handleDeleteTask(taskId) {
    setMenuTaskId(null)
    await fetch(`http://localhost:8000/tasks/${taskId}`, { method: 'DELETE' })
    fetchTasks()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[#2e2e2e] text-xs tracking-widest uppercase animate-pulse">Loading path…</p>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center px-8">
      <p className="text-[#3a3a3a] text-xs text-center">Could not reach the backend.<br />{error}</p>
    </div>
  )

  if (tasks.length === 0) return (
    <div className="flex-1 flex items-center justify-center px-8">
      <p className="text-[#2e2e2e] text-xs text-center tracking-wide">No tasks yet.<br />Add one in the Planner.</p>
    </div>
  )

  const enriched = withDisplayState(tasks)
  const groups   = groupBySection(enriched)
  const done     = enriched.filter(t => t.status === 'done').length

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ProgressBar done={done} total={tasks.length} />

        <div className="flex flex-col items-center pb-8">
          {SECTION_ORDER.map(section => {
            const sectionTasks = groups[section]
            if (sectionTasks.length === 0) return null
            return (
              <div key={section} className="w-full">
                <SectionBanner sectionKey={section} />
                <div className="flex flex-col items-center">
                  {sectionTasks.map((task, idx) => (
                    <div key={task.id} className="flex flex-col items-center">
                      <TaskNode task={task} onActivate={handleActivate} onMenu={handleMenu} />

                      {/* Inline action menu for done/locked nodes */}
                      {menuTaskId === task.id && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 6, marginTop: 8, marginBottom: 4,
                        }}>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            style={{
                              fontSize: 12, fontWeight: 600,
                              color: '#c47a6a',
                              background: 'rgba(196,122,106,0.10)',
                              border: '1px solid rgba(196,122,106,0.25)',
                              borderRadius: 20,
                              padding: '5px 18px',
                              cursor: 'pointer',
                            }}
                          >
                            Delete task
                          </button>
                          <button
                            onClick={() => setMenuTaskId(null)}
                            style={{
                              fontSize: 11, color: '#5a5650',
                              background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px 8px',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {idx < sectionTasks.length - 1 && (
                        <div className="w-px h-8 border-l-2 border-dashed border-[#1e1e1e] my-1" />
                      )}
                    </div>
                  ))}
                  <div className="w-px h-10 border-l-2 border-dashed border-[#1a1a1a] my-1" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {modal === 'pretimer' && activeTask && (
        <PreTimer
          task={activeTask}
          onClose={handleCloseAll}
          onStart={handlePreTimerStart}
        />
      )}

      {modal === 'timer' && activeTask && (
        <Timer
          task={activeTask}
          duration={timerDuration}
          isLate={timerIsLate}
          starCap={timerStarCap}
          onDone={handleTaskDone}
          onClose={handleCloseAll}
          onTimeUp={handleTimeUp}
        />
      )}

      {modal === 'incomplete' && activeTask && (
        <IncompleteNote
          task={activeTask}
          earnedStars={incompleteStars}
          onDone={handleTaskDone}
          onExtend={handleExtend}
          onClose={handleCloseAll}
        />
      )}

      {modal === 'gift' && (
        <GiftModal section={completedSection} onClose={handleGiftClose} />
      )}
    </>
  )
}
