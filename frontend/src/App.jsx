import { useState } from 'react'
import PathView from './views/PathView'

const TABS = [
  { id: 'path',    label: 'Path',    icon: '🛤️'  },
  { id: 'planner', label: 'Planner', icon: '📅'  },
  { id: 'goals',   label: 'Goals',   icon: '🎯'  },
  { id: 'mirror',  label: 'Mirror',  icon: '🪞'  },
  { id: 'ai',      label: 'AI',      icon: '✨'  },
  { id: 'you',     label: 'You',     icon: '👤'  },
]

function App() {
  const [activeTab, setActiveTab] = useState('path')

  return (
    // Full-screen dark canvas; centers the app shell on wide screens
    <div className="flex justify-center bg-[#0f0f0f] min-h-screen">

      {/* App shell — mobile-first, capped at 420px */}
      <div className="w-full max-w-[420px] flex flex-col h-screen bg-[#0f0f0f]">

        {/* ── Content area ─────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'path' && <PathView />}
          {activeTab !== 'path' && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#3a3a3a] text-sm tracking-wide capitalize">
                {activeTab} view coming soon
              </p>
            </div>
          )}
        </main>

        {/* ── Bottom navigation bar ────────────────────────── */}
        <nav className="flex-shrink-0 flex bg-[#141414] border-t border-[#222222]">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                  active ? 'text-[#c8b87a]' : 'text-[#3d3d3d]'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-[9px] font-semibold tracking-widest uppercase">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>

      </div>
    </div>
  )
}

export default App
