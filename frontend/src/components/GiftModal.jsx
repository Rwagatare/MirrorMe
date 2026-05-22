const ACTIVITIES = [
  { emoji: '📺', label: 'YouTube', duration: '30 min' },
  { emoji: '📖', label: 'Reading', duration: '30 min' },
  { emoji: '🚶', label: 'Walk',    duration: '20 min' },
  { emoji: '🎵', label: 'Music',   duration: '25 min' },
]

const SECTION_META = {
  morning: { emoji: '🌅', label: 'morning' },
  focus:   { emoji: '⚡', label: 'focus' },
  growth:  { emoji: '🌱', label: 'growth' },
  evening: { emoji: '🌙', label: 'evening' },
}

// Props: section, onClose
export default function GiftModal({ section, onClose }) {
  const meta = SECTION_META[section] ?? { emoji: '🎁', label: section ?? 'session' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6">
      <div className="w-full max-w-[360px] bg-[#141414] rounded-2xl px-6 py-7 space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-4xl">🎁</p>
          <h2 className="text-white text-lg font-bold mt-2">Break time earned!</h2>
          <p className="text-[#3d3d3d] text-xs">
            {meta.emoji} {meta.label} section complete
          </p>
        </div>

        {/* Activity grid — hardcoded, will be driven by You settings later */}
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITIES.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center justify-center bg-[#1a1a1a] rounded-xl py-4 px-3 gap-1.5 active:bg-[#222] transition-colors"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-white text-xs font-semibold">{a.label}</span>
              <span className="text-[#3d3d3d] text-[10px]">{a.duration}</span>
            </button>
          ))}
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border border-[#222] text-[#3d3d3d] text-sm active:opacity-70 transition-opacity"
        >
          Maybe later
        </button>

      </div>
    </div>
  )
}
