import { useState, useEffect, useRef } from 'react'

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function statusMessage(progress) {
  if (progress >= 0.8) return 'Final stretch!'
  if (progress >= 0.5) return 'Past halfway, almost there!'
  if (progress >= 0.2) return 'Good rhythm, keep going!'
  return 'Just getting started...'
}

function fmt(secs) {
  const m = Math.floor(Math.abs(secs) / 60)
  const s = Math.abs(secs) % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Props: task, duration (min), isLate, starCap (default 5), onDone(stars), onClose, onTimeUp(stars)
export default function Timer({ task, duration, isLate, starCap = 5, onDone, onClose, onTimeUp }) {
  const [totalSec, setTotalSec]   = useState(duration * 60)
  const [secsLeft, setSecsLeft]   = useState(duration * 60)
  const [adjusted, setAdjusted]   = useState(false)

  const elapsed  = totalSec - secsLeft
  const progress = totalSec === 0 ? 1 : Math.min(1, elapsed / totalSec)

  // Star ceiling: late start → max 4, mid-session adjust → max 3, extension (starCap=1) → max 1
  const effectiveCap  = Math.min(starCap, isLate ? 4 : 5, adjusted ? 3 : 5)
  const earnedStars   = Math.min(effectiveCap, Math.floor(progress * 5))

  // Keep a ref so the interval closure can read the current earnedStars on time-up
  const starsRef = useRef(earnedStars)
  starsRef.current = earnedStars

  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          // Defer to avoid calling onTimeUp inside a state updater
          setTimeout(() => onTimeUp(starsRef.current), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, []) // intentionally runs once — onTimeUp is stable from parent

  function adjust(deltaMin) {
    const ds = deltaMin * 60
    setTotalSec(prev => Math.max(60, prev + ds))
    setSecsLeft(prev => Math.max(1, prev + ds))
    setAdjusted(true)
  }

  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f0f] px-6">

      {/* Status */}
      <p className="text-[#3d3d3d] text-[10px] tracking-widest uppercase mb-10">
        {statusMessage(progress)}
      </p>

      {/* SVG countdown ring */}
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200">
          {/* Track */}
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#1a1a1a" strokeWidth="8" />
          {/* Draining arc */}
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="#c8b87a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        {/* Center: initial + countdown */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl font-bold text-[#c8b87a]">
            {task.title?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="text-white text-2xl font-semibold tabular-nums">
            {fmt(secsLeft)}
          </span>
        </div>
      </div>

      {/* Stars row — fills at 20 / 40 / 60 / 80 / 100 % elapsed */}
      <div className="flex gap-2 mt-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`text-2xl transition-colors duration-500 ${i < earnedStars ? 'text-[#c8b87a]' : 'text-[#1e1e1e]'}`}
          >
            ★
          </span>
        ))}
      </div>

      {/* Cap indicator */}
      {(isLate || adjusted || starCap < 5) && (
        <p className="text-[#3a3a3a] text-[10px] mt-2 tracking-wide">
          {starCap < 5 && !adjusted && !isLate
            ? `Extension · max ${starCap} ★`
            : adjusted
            ? 'Adjusted · max 3 ★'
            : 'Late start · max 4 ★'}
        </p>
      )}

      {/* Adjust buttons */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => adjust(-5)}
          className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-[#4a4a4a] text-sm font-medium active:opacity-70 transition-opacity"
        >
          −5 min
        </button>
        <button
          onClick={() => adjust(5)}
          className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-[#4a4a4a] text-sm font-medium active:opacity-70 transition-opacity"
        >
          +5 min
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 w-full max-w-[300px]">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-[#1e1e1e] text-[#3d3d3d] text-sm active:opacity-70 transition-opacity"
        >
          Skip
        </button>
        <button
          onClick={() => onDone(earnedStars)}
          className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold active:opacity-90 transition-opacity"
        >
          Done · {earnedStars}★
        </button>
      </div>

    </div>
  )
}
