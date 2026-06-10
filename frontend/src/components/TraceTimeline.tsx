import { useMemo, useState } from 'react'
import type { TraceEvent } from '../types'
import { MetricsBar } from './MetricsBar'
import { TraceEventCard } from './TraceEventCard'

type FilterKey = 'all' | 'tool' | 'llm' | 'retries'

const FILTERS: { key: FilterKey; label: string; matches: (e: TraceEvent) => boolean }[] = [
  { key: 'all', label: 'All', matches: () => true },
  {
    key: 'tool',
    label: 'Tools',
    matches: (e) => ['tool_call', 'tool_result', 'tool_error'].includes(e.kind),
  },
  {
    key: 'llm',
    label: 'LLM',
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
      <div className="surface p-8 text-[13px] text-slate-400 flex items-center gap-2">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        Loading trace
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <div className="text-[13px] font-medium text-slate-700">No trace yet</div>
        <div className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          Pick a session on the left, or send a message from Conversations to populate.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MetricsBar events={events} />
      <div className="surface px-3 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-0.5">
          {FILTERS.map((f) => {
            const count = events.filter(f.matches).length
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] font-mono ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="text-[10.5px] text-slate-500 font-mono">
          {visible.length} of {events.length}
        </div>
      </div>
      <div className="surface px-1 py-1">
        {visible.map((e) => (
          <TraceEventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  )
}
