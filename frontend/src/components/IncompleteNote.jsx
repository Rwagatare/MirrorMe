import { useState } from 'react'

// Props: task, earnedStars, onDone(stars), onExtend, onClose
export default function IncompleteNote({ task, earnedStars, onDone, onExtend }) {
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await fetch('http://localhost:8000/memory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:    note.trim() || '(no note)',
          entry_type: 'context',
          activity:   task.title,
          date:       new Date().toISOString().slice(0, 10),
        }),
      })
    } catch (_) {
      // Best-effort — don't block the user if backend is unreachable
    }
    onDone(earnedStars)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
      <div className="w-full max-w-[360px] space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-white text-xl font-bold">Time's up!</h2>
          <p className="text-[#3d3d3d] text-xs mt-1.5 leading-relaxed">
            What got in the way? One sentence — helps your Mirror learn.
          </p>
        </div>

        {/* Note textarea */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="I got distracted by…"
          rows={3}
          className="w-full bg-[#141414] border border-[#222] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#2a2a2a] resize-none focus:outline-none focus:border-[#c8b87a]/40 transition-colors"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="flex-1 py-3 rounded-xl border border-[#2a2a2a] text-[#4a4a4a] text-sm font-medium active:opacity-70 transition-opacity"
          >
            + 10 min
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#c8b87a] text-[#0f0f0f] text-sm font-bold disabled:opacity-60 active:opacity-90 transition-opacity"
          >
            {saving ? 'Saving…' : 'Submit & finish'}
          </button>
        </div>

      </div>
    </div>
  )
}
