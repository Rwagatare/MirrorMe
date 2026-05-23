import { useState, useEffect } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANCH_COLORS = ['#c8b87a', '#8fa876', '#7b9eb5', '#9b8fd4']
const MAX_BRANCH_LENGTH = 130
const TRUNK_X  = 190
const TRUNK_TOP_Y = 230   // TRUNK_BASE_Y(290) - TRUNK_HEIGHT(60)

// Angles in standard math convention (from horizontal x-axis, CCW positive).
// sin(a) > 0 for all of these so branches grow upward (y decreases in SVG).
const BASE_ANGLES = [2.5, 2.0, 1.57, 1.1, 0.6, 2.8, 1.35, 0.85]

// ─── Helpers ─────────────────────────────────────────────────────────────────

// x2 = 190 + cos(angle) * length
// y2 = 230 - sin(angle) * length  (subtract because SVG y increases downward)
function branchEndpoint(angle, length) {
  return {
    x: TRUNK_X  + Math.cos(angle) * length,
    y: TRUNK_TOP_Y - Math.sin(angle) * length,
  }
}

function fruitPositions(angle, length, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = ((i + 1) / (count + 1)) * length
    return {
      x: TRUNK_X  + Math.cos(angle) * t,
      y: TRUNK_TOP_Y - Math.sin(angle) * t,
    }
  })
}

function formatDeadline(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, color, onRefetch, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const pct      = Math.min(100, Math.max(0, goal.progress ?? 0))
  const deadline = formatDeadline(goal.deadline)
  const tasks    = goal.tasks ?? []

  async function toggleTask(task) {
    await fetch(`http://localhost:8000/goals/${goal.id}/tasks/${task.id}`, { method: 'PATCH' })
    onRefetch()
  }

  async function deleteTask(task) {
    await fetch(`http://localhost:8000/goals/${goal.id}/tasks/${task.id}`, { method: 'DELETE' })
    onRefetch()
  }

  async function addTask(e) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    await fetch(`http://localhost:8000/goals/${goal.id}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setNewTitle('')
    setAdding(false)
    onRefetch()
  }

  return (
    <div style={{ borderLeft: `3px solid ${color}` }} className="bg-[#161616] rounded-xl overflow-hidden">

      {/* Card header: expand toggle + delete */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <button onClick={() => setExpanded(v => !v)} className="flex-1 text-left px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ background: color }} className="w-2 h-2 rounded-full flex-shrink-0" />
            <span className="text-[#e8e4dc] text-xs font-medium leading-tight flex-1">{goal.title}</span>
            <span style={{ color }} className="text-[10px] font-bold ml-1 flex-shrink-0">{Math.round(pct)}%</span>
            <span className="text-[#3d3d3d] text-[10px] ml-1 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
          </div>
          <div className="w-full h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
          </div>
          {deadline && <p className="text-[9px] text-[#3d3d3d] mt-1.5">{deadline}</p>}
        </button>
        <button
          onClick={() => onDelete(goal)}
          style={{ padding: '10px 10px 0 0', color: '#3a3a3a', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* Expanded sub-tasks */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#2a2a2a] pt-2">
          {tasks.length === 0 && (
            <p className="text-[#3a3a3a] text-[10px] py-2 text-center">Add your first sub-task below</p>
          )}
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 py-1.5 group">
              <button
                onClick={() => toggleTask(task)}
                className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors"
                style={{ borderColor: task.is_done ? color : '#3a3a3a', background: task.is_done ? color : 'transparent' }}
              >
                {task.is_done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="2,5 4,7 8,3" stroke="#0f0f0f" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className="flex-1 text-[11px] leading-tight transition-colors"
                style={{ color: task.is_done ? '#3d3d3d' : '#e8e4dc', textDecoration: task.is_done ? 'line-through' : 'none' }}>
                {task.title}
              </span>
              <button onClick={() => deleteTask(task)}
                className="text-[#2a2a2a] hover:text-[#5a5a5a] text-xs transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                ✕
              </button>
            </div>
          ))}
          <form onSubmit={addTask} className="flex items-center gap-2 mt-2">
            <input
              type="text" placeholder="Add sub-task..."
              value={newTitle} onChange={e => setNewTitle(e.target.value)} disabled={adding}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e8e4dc] placeholder:text-[#3a3a3a] focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
            />
            <button type="submit" disabled={adding || !newTitle.trim()}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity disabled:opacity-30"
              style={{ background: color, color: '#0f0f0f' }}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── GoalsView ────────────────────────────────────────────────────────────────

export default function GoalsView() {
  const [goals, setGoals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [animated, setAnimated]   = useState(false)
  // Only increments on first load and new goal — sub-task mutations do NOT touch this
  const [animationKey, setAnimationKey] = useState(0)

  const [form, setForm] = useState({ title: '', description: '', deadline: '' })

  // Draw branches from scratch only when animationKey increments
  useEffect(() => {
    if (animationKey === 0) return
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(id)
  }, [animationKey])

  useEffect(() => { fetchGoals(true) }, [])

  async function fetchGoals(withAnimation = false) {
    try {
      const res = await fetch('http://localhost:8000/goals/')
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
        if (withAnimation) setAnimationKey(k => k + 1)
        // withAnimation=false: goals update, animated stays true → branches stay visible
      }
    } catch (_) {}
    setLoading(false)
  }

  function silentRefetch() { fetchGoals(false) }

  async function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.title}" and all its sub-tasks?`)) return
    await fetch(`http://localhost:8000/goals/${goal.id}`, { method: 'DELETE' })
    fetchGoals(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await fetch('http://localhost:8000/goals/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        progress: 0,
      }),
    })
    setForm({ title: '', description: '', deadline: '' })
    setShowModal(false)
    fetchGoals(true)
  }

  // ── Tree SVG ──────────────────────────────────────────────────────────────
  // Classic stroke-dashoffset draw animation:
  //   strokeDasharray = actualLength   (one dash covering the branch)
  //   strokeDashoffset: length → 0     (draws from trunk outward)
  //
  // When animated stays true (sub-task update):
  //   dashoffset stays 0 → branch stays fully visible
  //   endpoint (x2,y2) updates to new length → instant resize, no disappearing

  function renderTree() {
    return (
      <svg viewBox="0 0 380 300" width="100%" style={{ maxHeight: 280, display: 'block' }}>
        {/* Ground */}
        <line x1="60" y1="290" x2="320" y2="290" stroke="#2a2a2a" strokeWidth="1" />
        {/* Trunk — centered at x=190, top at y=230, bottom at y=290 */}
        <rect x="185" y="230" width="10" height="60" rx="4" fill="#2a2a2a" />

        {goals.map((goal, idx) => {
          const color  = BRANCH_COLORS[idx % BRANCH_COLORS.length]
          const angle  = BASE_ANGLES[idx % BASE_ANGLES.length]
          const pct    = Math.min(100, Math.max(0, goal.progress ?? 0))
          const length = (pct / 100) * MAX_BRANCH_LENGTH

          // Branch starts at trunk top: (190, 230)
          // Branch end: (190 + cos(angle)*length, 230 - sin(angle)*length)
          const tip    = branchEndpoint(angle, length)
          const fruits = fruitPositions(angle, length, Math.floor(pct / 12))
          const dashLen = Math.max(length, 1)

          return (
            <g key={goal.id}>
              {/* Branch — draws from (190,230) to tip */}
              <line
                x1={TRUNK_X} y1={TRUNK_TOP_Y}
                x2={tip.x}   y2={tip.y}
                stroke={color} strokeWidth="3" strokeLinecap="round"
                style={{
                  strokeDasharray: dashLen,
                  // animated=true → dashoffset 0 (fully drawn); animated=false → dashoffset=length (hidden)
                  strokeDashoffset: animated ? 0 : dashLen,
                  transition: animated
                    ? `stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1) ${idx * 0.12}s`
                    : 'none',
                }}
              />

              {/* Foliage circle at tip */}
              {pct > 0 && (
                <circle cx={tip.x} cy={tip.y} r={8 + pct * 0.1} fill={color}
                  style={{
                    opacity: animated ? 0.18 : 0,
                    transition: animated ? `opacity 0.5s ease ${idx * 0.12 + 0.7}s` : 'none',
                  }}
                />
              )}

              {/* Fruits — one per 12% progress */}
              {fruits.map((pos, fi) => (
                <circle key={fi} cx={pos.x} cy={pos.y} r="5" fill={color}
                  style={{
                    transformOrigin: `${pos.x}px ${pos.y}px`,
                    transform: animated ? 'scale(1)' : 'scale(0)',
                    opacity: animated ? 1 : 0,
                    transition: animated
                      ? `transform 0.3s ease ${idx * 0.12 + fi * 0.08 + 0.35}s, opacity 0.3s ease ${idx * 0.12 + fi * 0.08 + 0.35}s`
                      : 'none',
                  }}
                />
              ))}
            </g>
          )
        })}
      </svg>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">

      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-white text-sm font-semibold tracking-wide">Goals</h1>
        <button onClick={() => setShowModal(true)}
          data-new-goal-btn="true"
          className="text-[10px] font-semibold text-[#0f0f0f] bg-[#c8b87a] px-3 py-1.5 rounded-full tracking-wide active:opacity-80 transition-opacity">
          + New goal
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading && (
          <p className="text-[#2e2e2e] text-xs tracking-widest uppercase animate-pulse text-center mt-20">
            Loading goals…
          </p>
        )}
        {!loading && goals.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-24">
            <p className="text-[#3a3a3a] text-sm text-center">No goals yet — add your first goal</p>
          </div>
        )}
        {!loading && goals.length > 0 && (
          <>
            <div className="mt-2 mb-6" data-goals-tree="true">{renderTree()}</div>
            <div className="grid grid-cols-2 gap-3">
              {goals.map((goal, idx) => (
                <GoalCard key={goal.id} goal={goal}
                  color={BRANCH_COLORS[idx % BRANCH_COLORS.length]}
                  onRefetch={silentRefetch}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-[#141414] rounded-t-2xl px-6 pt-6 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-white text-base font-semibold">New Goal</h3>
              <input type="text" required autoFocus placeholder="Goal title"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
              />
              <textarea placeholder="Description (optional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#c8b87a]/40 transition-colors resize-none"
              />
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3">
                <span className="text-[#3d3d3d] text-xs">Deadline</span>
                <input type="date" value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="bg-transparent text-[#e8e4dc] text-xs focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-[#4a4a4a] text-sm active:opacity-70 transition-opacity">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold active:opacity-90 transition-opacity">
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
