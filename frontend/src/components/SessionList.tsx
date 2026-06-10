import { useMemo, useState } from 'react'
import type { SessionSummary } from '../types'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function SessionList({
  sessions,
  active,
  onSelect,
  onRefresh,
}: {
  sessions: SessionSummary[]
  active: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(
      (s) =>
        s.customer_name.toLowerCase().includes(q) ||
        s.customer_email.toLowerCase().includes(q) ||
        (s.last_user_message || '').toLowerCase().includes(q),
    )
  }, [sessions, query])

  return (
    <div className="surface overflow-hidden flex flex-col h-[760px]">
      <div className="px-3.5 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">Sessions</h2>
          <button onClick={onRefresh} className="btn-ghost" title="Refresh">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
              <path d="M3 10a7 7 0 1 0 2.5-5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="relative mt-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full text-[12.5px] border border-slate-200 rounded-md pl-7 pr-2 py-1.5 focus-ring bg-white placeholder:text-slate-400"
          />
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-[12.5px] text-slate-400 py-12 px-6 leading-relaxed">
            {sessions.length === 0
              ? 'No sessions yet. Send a message from the chat to populate.'
              : `No sessions match "${query}".`}
          </div>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-3.5 py-3 border-b border-slate-100 transition focus-ring ${
              active === s.id ? 'bg-slate-50' : 'hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10.5px] font-semibold shrink-0">
                {initials(s.customer_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-medium text-slate-900 truncate">
                    {s.customer_name}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono whitespace-nowrap">
                    {fmtTime(s.last_seen_at)}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{s.customer_email}</div>
                {s.last_user_message && (
                  <div className="text-[11.5px] text-slate-600 mt-1 line-clamp-2 leading-snug">
                    {s.last_user_message}
                  </div>
                )}
                <div className="mt-1.5 text-[10.5px] text-slate-500">
                  {s.message_count} messages
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
