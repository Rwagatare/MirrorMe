import { useState, useEffect, useRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const OLLAMA_CHAT = 'http://localhost:11434/api/chat'
const OLLAMA_TAGS = 'http://localhost:11434/api/tags'
const TASKS_API   = 'http://localhost:8000/tasks/'
const MODEL       = 'llama3.2:3b'

// ─── Action tag parsing ───────────────────────────────────────────────────────
// AI embeds: [ACTION: create_task title="…" section="focus" duration=25 recurrence="once"]
// We parse, execute, strip the tag, and attach a confirmation chip to the bubble.

const ACTION_RE = /\[ACTION:\s*create_task\s+([^\]]+)\]/i

const WEEKDAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function resolveDueDate(dateAttr) {
  const base = new Date()
  base.setHours(12, 0, 0, 0)

  if (!dateAttr || dateAttr === 'today') return base

  if (dateAttr === 'tomorrow') {
    base.setDate(base.getDate() + 1)
    return base
  }

  const idx = WEEKDAY_NAMES.indexOf(dateAttr.toLowerCase())
  if (idx !== -1) {
    const today = base.getDay()
    const diff  = (idx - today + 7) % 7 || 7
    base.setDate(base.getDate() + diff)
    return base
  }

  return base
}

function parseAction(text) {
  const match = text.match(ACTION_RE)
  if (!match) return null

  const attrs  = match[1]
  const getStr = key => { const m = attrs.match(new RegExp(`${key}="([^"]*)"`, 'i')); return m ? m[1] : null }
  const getNum = key => { const m = attrs.match(new RegExp(`${key}=(\\d+)`,    'i')); return m ? parseInt(m[1], 10) : null }

  const title = getStr('title')
  if (!title?.trim()) return null

  return {
    raw:        match[0],
    title:      title.trim(),
    section:    getStr('section')    ?? 'focus',
    duration:   getNum('duration')   ?? 25,
    recurrence: getStr('recurrence') ?? 'once',
    date:       getStr('date')       ?? 'today',
  }
}

async function executeAction(action) {
  const dueDate = resolveDueDate(action.date)
  try {
    const res = await fetch(TASKS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            action.title,
        section:          action.section,
        duration_minutes: action.duration,
        recurrence:       action.recurrence,
        due_date:         dueDate.toISOString(),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(tasks, goals) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const taskLines = tasks.length
    ? tasks.map(t => `- ${t.title} [${t.section ?? 'general'}, ${t.status ?? 'todo'}]`).join('\n')
    : 'No tasks scheduled today.'
  const goalLines = goals.length
    ? goals.map(g => `- ${g.title} (${Math.round(g.progress ?? 0)}% complete)`).join('\n')
    : 'No goals set yet.'

  return `You are MirrorMe, a warm and concise personal AI assistant built into a productivity app. You know the user's full context.
Today is ${date}.
Tasks today:
${taskLines}
Goals:
${goalLines}
Respond in 2-3 sentences. Be direct and actionable.

MOOD QUESTIONS — when a message in this conversation provides "Mood data for the last N day(s)"
or "Relevant memories" with mood values attached, use it directly to answer questions about
how the user has been feeling: state whether the overall mood was positive, mixed, or negative,
and back it up with specifics from the log entries (quote or paraphrase what they wrote and on
what date). Don't guess at mood if no such data was provided in this conversation — say you
don't have enough logged entries to tell instead.

TASK CREATION RULES — read carefully and follow exactly:
- NEVER use the action tag unless the user's message contains explicit confirmation words such as: "add it", "create it", "do it", "yes", "sure", "add that", "add them", "create those", "schedule it", "put it on my path".
- CRITICAL: Never use [ACTION: create_task] unless the user's message contains words like: "add it", "create it", "do it", "yes", "sure", "add that", "add them", "create those", "schedule it", "put it on my path". If the user is just asking for suggestions or advice, respond with text only. No ACTION tags.
- If you think a task would help, suggest it in text and end your response with: "Say yes to add this to your Path."
- Never use the action tag speculatively or proactively.

When the user has explicitly confirmed task creation, append this tag at the very end of your response (nothing after it):
[ACTION: create_task title="Exact task title" section="focus" duration=25 recurrence="once" date="today"]
Valid sections: morning, focus, growth, evening
Valid recurrence: once, daily, weekdays, weekly
Valid date values: "today" (default), "tomorrow", or a weekday name like "monday", "wednesday", etc.
If the user mentions a specific day, set date="<that weekday>" (e.g. date="monday").
If the user says "tomorrow", set date="tomorrow".
Otherwise use date="today".
The app executes and hides the tag automatically.`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowHHMM() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const MOOD_QUERY_RE = /\b(mood|feeling|feelings|emotion|emotions|emotional)\b/i

const CHAT_KEY = 'mirrorme_chat_history'

const WELCOME = {
  role:    'assistant',
  content: "Hi! I'm your MirrorMe AI. I can see your tasks, goals and habits. What would you like to work on today?",
  ts:      nowHHMM(),
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch { return null }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '12px 16px',
      background: '#161616', border: '1px solid #2a2a2a',
      borderRadius: '18px 18px 18px 4px',
      alignSelf: 'flex-start', maxWidth: 80,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#4a4a4a',
          animation: `mirrorPulse 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

function Bubble({ msg }) {
  const isUser   = msg.role === 'user'
  const isSystem = msg.role === 'system'

  if (isSystem) {
    return (
      <div style={{ alignSelf: 'center', textAlign: 'center', maxWidth: '90%' }}>
        <p style={{ fontSize: 12, color: '#5a5650', lineHeight: 1.5, fontStyle: 'italic' }}>{msg.content}</p>
        <p style={{ fontSize: 10, color: '#3a3a3a', marginTop: 3 }}>{msg.ts}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'rgba(200,184,122,0.08)' : '#161616',
        border: `1px solid ${isUser ? 'rgba(200,184,122,0.20)' : '#2a2a2a'}`,
      }}>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', color: isUser ? '#e8d99a' : '#d4d0c8' }}>
          {msg.content}
        </p>
      </div>

      {/* Confirmation chip — shown when AI successfully created a task */}
      {msg.chip && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginTop: 5,
          padding: '3px 10px',
          background:  msg.chipOk ? 'rgba(143,168,118,0.10)' : 'rgba(196,122,106,0.10)',
          border:     `1px solid ${msg.chipOk ? 'rgba(143,168,118,0.25)' : 'rgba(196,122,106,0.25)'}`,
          borderRadius: 20,
          fontSize: 11,
          color: msg.chipOk ? '#8fa876' : '#c47a6a',
        }}>
          {msg.chip}
        </div>
      )}

      {/* Context warning — shown when memory retrieval failed for this reply */}
      {msg.contextNote && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginTop: 5,
          padding: '3px 10px',
          background: 'rgba(150,150,150,0.08)',
          border: '1px solid rgba(150,150,150,0.20)',
          borderRadius: 20,
          fontSize: 11,
          color: '#8a8a8a',
        }}>
          ⚠ {msg.contextNote}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#3a3a3a', marginTop: msg.chip ? 3 : 3, paddingLeft: isUser ? 0 : 2, paddingRight: isUser ? 2 : 0 }}>
        {msg.ts}
      </p>
    </div>
  )
}

// ─── AIView ───────────────────────────────────────────────────────────────────

export default function AIView() {
  const [messages,  setMessages]  = useState(() => loadHistory() ?? [WELCOME])
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [ollamaOk,  setOllamaOk]  = useState(null)
  const [tasks,     setTasks]     = useState([])
  const [goals,     setGoals]     = useState([])
  const [habits,    setHabits]    = useState([])

  const bottomRef       = useRef(null)
  const textareaRef     = useRef(null)
  const systemPromptRef = useRef('')

  // ── Mount: health check + context fetch ──────────────────────────────────

  useEffect(() => {
    fetch(OLLAMA_TAGS, { signal: AbortSignal.timeout(3000) })
      .then(() => setOllamaOk(true))
      .catch(() => setOllamaOk(false))

    Promise.all([
      fetch('http://localhost:8000/tasks/today').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('http://localhost:8000/goals/').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('http://localhost:8000/habits/').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([t, g, h]) => {
      setTasks(t); setGoals(g); setHabits(h)
      systemPromptRef.current = buildSystemPrompt(t, g)
    })
  }, [])

  // ── Persist messages to localStorage ────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages))
  }, [messages])

  // ── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // ── Send ─────────────────────────────────────────────────────────────────

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg    = { role: 'user', content: text, ts: nowHHMM() }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setSending(true)

    if (ollamaOk === false) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: "Ollama isn't running. Start it with: ollama run llama3.2:3b",
        ts: nowHHMM(),
      }])
      setSending(false)
      return
    }

    try {
      // Fetch semantically relevant memories to inject as context
      const contextMsgs = []
      let contextUnavailable = false
      try {
        const memRes = await fetch(
          `http://localhost:8000/memory/search?q=${encodeURIComponent(text)}`,
          { signal: AbortSignal.timeout(4000) }
        )
        if (memRes.ok) {
          const memories = await memRes.json()
          if (Array.isArray(memories) && memories.length > 0) {
            const lines = memories
              .map(m => `[${m.date || '?'}${m.mood ? `, mood: ${m.mood}` : ''}] ${m.content}`)
              .join('\n')
            contextMsgs.push({
              role: 'assistant',
              content: `Relevant memories I found:\n${lines}`,
            })
          }
        } else {
          contextUnavailable = true
        }
      } catch { contextUnavailable = true /* backend down — continue without memories */ }

      // Mood/emotion questions need real date-scoped aggregation, not
      // semantic similarity — pull the mood summary separately.
      if (MOOD_QUERY_RE.test(text)) {
        try {
          const days = /\bmonth\b/i.test(text) ? 30 : /\btoday\b/i.test(text) ? 1 : 7
          const moodRes = await fetch(
            `http://localhost:8000/memory/mood-summary?days=${days}`,
            { signal: AbortSignal.timeout(4000) }
          )
          if (moodRes.ok) {
            const summary = await moodRes.json()
            if (summary.entry_count > 0) {
              const entryLines = summary.entries
                .map(e => `[${e.date}] mood: ${e.mood_label ?? e.mood ?? 'unknown'} — ${e.content}`)
                .join('\n')
              contextMsgs.push({
                role: 'assistant',
                content: `Mood data for the last ${summary.days} day(s) (since ${summary.since}): ` +
                  `average mood is "${summary.average_label ?? 'unknown'}" (score ${summary.average_score ?? 'n/a'}/5) ` +
                  `across ${summary.entry_count} logged entries.\n${entryLines}`,
              })
            }
          } else {
            contextUnavailable = true
          }
        } catch { contextUnavailable = true /* backend down — continue without mood summary */ }
      }

      // Build messages: strip UI-only fields (ts, chip, chipOk) before sending
      const apiMessages = nextHistory.map(({ role, content }) => ({ role, content }))

      // Inject context just before the final user message
      const messagesWithMemory = contextMsgs.length
        ? [...apiMessages.slice(0, -1), ...contextMsgs, apiMessages.at(-1)]
        : apiMessages

      const res = await fetch(OLLAMA_CHAT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:    MODEL,
          stream:   false,
          messages: [
            { role: 'system', content: systemPromptRef.current },
            ...messagesWithMemory,
          ],
        }),
      })

      if (!res.ok) throw new Error(`Ollama ${res.status}`)
      const data        = await res.json()
      const rawReply    = data.message?.content?.trim() ?? '(no response)'

      // ── Action tag processing ───────────────────────────────────────────
      const action     = parseAction(rawReply)
      const cleanReply = action ? rawReply.replace(action.raw, '').trim() : rawReply

      let chip   = null
      let chipOk = false
      if (action) {
        chipOk = await executeAction(action)
        chip   = chipOk
          ? `✓ Task added: "${action.title}"`
          : '⚠ Could not add task — is the backend running?'
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanReply,
        ts: nowHHMM(),
        chip,
        chipOk,
        contextNote: contextUnavailable ? "Couldn't reach your memories — answering without that context" : null,
      }])
      setOllamaOk(true)

    } catch {
      setOllamaOk(false)
      setMessages(prev => [...prev, {
        role:    'system',
        content: "Ollama isn't running. Start it with: ollama run llama3.2:3b",
        ts:      nowHHMM(),
      }])
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Status ───────────────────────────────────────────────────────────────

  const dotColor = ollamaOk === null ? '#5a5650' : ollamaOk ? '#8fa876' : '#c47a6a'
  const dotLabel = ollamaOk === null ? 'checking' : ollamaOk ? 'connected' : 'offline'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">

      <style>{`
        @keyframes mirrorPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40%            { opacity: 1;    transform: scale(1);    }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-[#161616]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-white text-sm font-semibold tracking-wide">AI Assistant</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: dotColor,
                boxShadow: ollamaOk ? `0 0 6px ${dotColor}` : 'none',
                transition: 'background 0.3s',
              }} />
              <span style={{ fontSize: 9, color: '#3d3d3d', letterSpacing: '0.05em' }}>{dotLabel}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: '#3d3d3d', letterSpacing: '0.04em' }}>
              {MODEL} · local · private
            </span>
            <button
              onClick={() => {
                if (window.confirm('Start a new conversation? This will clear the current chat.')) {
                  localStorage.removeItem(CHAT_KEY)
                  setMessages([{ ...WELCOME, ts: nowHHMM() }])
                }
              }}
              style={{
                fontSize: 9, color: '#5a5650',
                background: '#161616', border: '1px solid #2a2a2a',
                borderRadius: 20, padding: '2px 9px',
                cursor: 'pointer',
              }}
            >
              New chat
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[`${tasks.length} tasks today`, `${goals.length} goals`, `${habits.length} habits`, 'Memory'].map(chip => (
            <span key={chip} style={{
              fontSize: 10, color: '#5a5650',
              background: '#161616', border: '1px solid #2a2a2a',
              borderRadius: 20, padding: '2px 9px',
            }}>
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {sending && <TypingDots />}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-[#161616] px-4 py-3">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            data-ai-input="true"
            placeholder="Ask MirrorMe…  (Enter to send)"
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{
              flex: 1, resize: 'none', overflow: 'hidden',
              background: '#161616', border: '1px solid #2a2a2a',
              borderRadius: 20, padding: '10px 16px',
              color: '#e8e4dc', fontSize: 13, lineHeight: 1.45,
              outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s',
              opacity: sending ? 0.5 : 1,
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,184,122,0.4)' }}
            onBlur={e  => { e.target.style.borderColor = '#2a2a2a' }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: sending || !input.trim() ? '#1a1a1a' : '#c8b87a',
              border: 'none',
              cursor: sending || !input.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={sending || !input.trim() ? '#3a3a3a' : '#0f0f0f'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 9, color: '#2a2a2a', marginTop: 6, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  )
}
