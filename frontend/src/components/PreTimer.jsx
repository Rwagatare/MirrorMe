import { useState } from 'react'

const SECTION_META = {
  morning: { emoji: '🌅', label: 'Rise & reflect' },
  focus:   { emoji: '⚡', label: 'Deep work zone' },
  growth:  { emoji: '🌱', label: 'Sharpen your edge' },
  evening: { emoji: '🌙', label: 'Wind down & reflect' },
}

// Props: task, onClose, onStart(duration, isLate)
export default function PreTimer({ task, onClose, onStart }) {
  const [duration, setDuration] = useState(task.duration_minutes ?? 25)

  const meta = SECTION_META[task.section] ?? { emoji: '📌', label: task.section ?? 'Task' }

  // Compute lateness relative to due_date
  let isLate = false
  let lateMinutes = 0
  if (task.due_date) {
    const diffMs = Date.now() - new Date(task.due_date).getTime()
    if (diffMs > 0) {
      isLate = true
      lateMinutes = Math.round(diffMs / 60000)
    }
  }

  function adjust(delta) {
    setDuration(d => Math.min(120, Math.max(5, d + delta)))
  }

  return (
    <div className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center">
      <div className="glass-card sheet-panel w-full max-w-[420px] bg-[#141414] px-6 pt-6 pb-10 space-y-5">
        <div className="sheet-handle" />

        {/* Section badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.emoji}</span>
          <span className="text-[10px] tracking-widest uppercase text-[#3d3d3d] font-semibold">
            {meta.label}
          </span>
        </div>

        {/* Task title */}
        <h2 className="text-white text-lg font-semibold leading-tight">{task.title}</h2>

        {/* Lateness indicator — only shown when task has a due_date */}
        {task.due_date && (
          <p className={`text-xs font-medium ${isLate ? 'text-red-400' : 'text-emerald-400'}`}>
            {isLate ? `Started ${lateMinutes} min late` : '✓ On time'}
          </p>
        )}

        {/* Duration picker */}
        <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3">
          <button
            onClick={() => adjust(-5)}
            disabled={duration <= 5}
            className="w-9 h-9 rounded-full bg-[#222] text-white text-lg flex items-center justify-center disabled:opacity-20 active:scale-95 transition-transform"
          >
            −
          </button>
          <div className="text-center">
            <span className="text-white text-xl font-bold">{duration}</span>
            <span className="text-[#3d3d3d] text-sm ml-1.5">min</span>
          </div>
          <button
            onClick={() => adjust(5)}
            disabled={duration >= 120}
            className="w-9 h-9 rounded-full bg-[#222] text-white text-lg flex items-center justify-center disabled:opacity-20 active:scale-95 transition-transform"
          >
            +
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-[#4a4a4a] text-sm font-medium active:opacity-70 transition-opacity"
          >
            Skip
          </button>
          <button
            onClick={() => onStart(duration, isLate)}
            className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold active:opacity-90 transition-opacity"
          >
            Start Timer
          </button>
        </div>

      </div>
    </div>
  )
}
