import { useState } from 'react'
import PathView     from './views/PathView'
import PlannerView  from './views/PlannerView'
import GoalsView    from './views/GoalsView'
import MirrorView   from './views/MirrorView'
import AIView       from './views/AIView'
import YouView      from './views/YouView'
import MemoryButton from './components/MemoryButton'
import Onboarding   from './components/Onboarding'

// ─── SVG line icons ───────────────────────────────────────────────────────────
// All icons share the same 24×24 viewBox, 1.5 stroke-width, no fill.

const PathIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="7"  y1="3" x2="7"  y2="21" />
    <line x1="17" y1="3" x2="17" y2="21" />
    <line x1="7"  y1="7"  x2="17" y2="7"  />
    <line x1="7"  y1="12" x2="17" y2="12" />
    <line x1="7"  y1="17" x2="17" y2="17" />
  </svg>
)

const PlannerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="3"  y1="9"  x2="21" y2="9"  />
    <line x1="8"  y1="9"  x2="8"  y2="22" />
    <line x1="14" y1="9"  x2="14" y2="22" />
    <line x1="3"  y1="14" x2="21" y2="14" />
    <line x1="3"  y1="19" x2="21" y2="19" />
    <line x1="8"  y1="2"  x2="8"  y2="5"  />
    <line x1="16" y1="2"  x2="16" y2="5"  />
  </svg>
)

const GoalsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6"  />
    <circle cx="12" cy="12" r="2"  />
  </svg>
)

const MirrorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <ellipse cx="12" cy="9" rx="6" ry="7.5" />
    <line x1="12" y1="16.5" x2="12" y2="21" />
    <line x1="8"  y1="21"   x2="16" y2="21" />
  </svg>
)

const AIIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const YouIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

// Pen/edit icon for the memory header button
const PenIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="#c8b87a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'path',    label: 'Path',    Icon: PathIcon    },
  { id: 'planner', label: 'Planner', Icon: PlannerIcon },
  { id: 'goals',   label: 'Goals',   Icon: GoalsIcon   },
  { id: 'mirror',  label: 'Mirror',  Icon: MirrorIcon  },
  { id: 'ai',      label: 'AI',      Icon: AIIcon      },
  { id: 'you',     label: 'You',     Icon: YouIcon     },
]

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [activeTab,   setActiveTab]   = useState('path')
  const [timerActive, setTimerActive] = useState(false)
  const [memOpen,     setMemOpen]     = useState(false)
  const [onboarded,   setOnboarded]   = useState(
    () => !!localStorage.getItem('mirrorme_onboarded')
  )

  return (
    <div className="flex justify-center bg-[#0f0f0f] min-h-screen">
      <div className="w-full max-w-[420px] flex flex-col h-screen bg-[#0f0f0f]">

        {/* ── Global header — pen/memory access ────────────────── */}
        <div
          style={{
            flexShrink: 0, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 16,
          }}
        >
          <button
            onClick={() => setMemOpen(true)}
            disabled={timerActive}
            data-memory-btn="true"
            title="Log a memory"
            className={timerActive ? '' : 'pressable'}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#1e1e1e', border: 'none',
              cursor: timerActive ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: timerActive ? 0.25 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <PenIcon />
          </button>
        </div>

        {/* ── Content area ─────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'path'    && <PathView onTimerActive={setTimerActive} />}
          {activeTab === 'planner' && <PlannerView />}
          {activeTab === 'goals'   && <GoalsView />}
          {activeTab === 'mirror'  && <MirrorView />}
          {activeTab === 'ai'      && <AIView />}
          {activeTab === 'you'     && <YouView />}
        </main>

        {/* ── Bottom nav — iOS-style SVG line icons ─────────── */}
        <nav
          className="flex-shrink-0 flex bg-[#161616] border-t border-[#ffffff10]"
          style={{
            backdropFilter: 'blur(var(--glass-blur)) saturate(1.8)',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.8)',
            boxShadow: '0 -1px 0 var(--color-border)',
            paddingBottom: 'var(--safe-bottom)',
          }}
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="pressable flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 gap-0.5"
                style={{ minHeight: 44 }}
              >
                {/* Icon badge — rounded-square highlight when active */}
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-xl ${
                    active ? 'bg-[#c8b87a15] text-[#c8b87a]' : 'text-[#5a5650]'
                  }`}
                  style={{
                    transition: `transform var(--dur-press) var(--ease-spring), background var(--dur-popover) var(--ease-out), color var(--dur-popover) var(--ease-out)`,
                    transform: active ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Icon />
                </span>
                <span className={`text-[9px] tracking-wide transition-colors ${
                  active ? 'text-[#c8b87a] font-bold' : 'text-[#5a5650] font-medium'
                }`}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>

      </div>

      {/* Memory sheets — controlled by header pen icon */}
      <MemoryButton open={memOpen} onClose={() => setMemOpen(false)} />

      {/* First-time onboarding overlay */}
      {!onboarded && (
        <Onboarding
          onDone={() => {
            localStorage.setItem('mirrorme_onboarded', 'true')
            setOnboarded(true)
          }}
          onTabChange={setActiveTab}
          onOpenMemory={() => setMemOpen(true)}
        />
      )}

    </div>
  )
}

export default App
