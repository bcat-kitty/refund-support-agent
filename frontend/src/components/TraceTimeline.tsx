import { useMemo, useState } from 'react'
import type { TraceEvent } from '../types'
import { MetricsBar } from './MetricsBar'
import { TraceEventCard } from './TraceEventCard'

type FilterKey = 'all' | 'tool' | 'llm' | 'retries'

const FILTERS: { key: FilterKey; label: string; matches: (e: TraceEvent) => boolean }[] = [
  { key: 'all', label: 'All', matches: () => true },
  {
    key: 'tool',
    label: 'Tools only',
    matches: (e) => ['tool_call', 'tool_result', 'tool_error'].includes(e.kind),
  },
  {
    key: 'llm',
    label: 'LLM only',
    matches: (e) => ['llm_request', 'llm_response'].includes(e.kind),
  },
  {
    key: 'retries',
    label: 'Retries / errors',
    matches: (e) => ['tool_error', 'retry'].includes(e.kind),
  },
]

export function TraceTimeline({ events, loading }: { events: TraceEvent[]; loading: boolean }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const visible = useMemo(() => {
    const m = FILTERS.find((f) => f.key === filter)!
    return events.filter(m.matches)
  }, [events, filter])

  if (loading) {
    return (
      <div className="card p-8 text-sm text-slate-400 italic flex items-center gap-2">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        loading trace…
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl">📭</div>
        <div className="text-sm font-semibold text-slate-700 mt-2">No trace yet</div>
        <div className="text-xs text-slate-500 mt-1">
          Select a session on the left, or send a message from the Chat tab to populate.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricsBar events={events} />
      <div className="card p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/70">
          {FILTERS.map((f) => {
            const count = events.filter(f.matches).length
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active ? 'bg-white shadow-soft text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] font-mono text-slate-400">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {visible.length} of {events.length} events
        </div>
      </div>
      <div className="card pl-1 pr-3 py-2">
        {visible.map((e) => (
          <TraceEventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  )
}
