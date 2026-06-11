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
      <div className="space-y-3">
        <div className="surface grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 space-y-2">
              <div className="skeleton h-2.5 w-16" />
              <div className="skeleton h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="surface p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-2.5 w-2.5 rounded-full" />
              <div className="skeleton h-3 w-32" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <div className="surface p-12 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-[13px] font-medium text-ink">No trace yet</div>
        <div className="text-[12px] text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
          Pick a session on the left, or send a message from Conversations to populate this timeline.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MetricsBar events={events} />
      <div className="surface px-3 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-0.5 p-1 bg-sand-100/70 rounded-md">
          {FILTERS.map((f) => {
            const count = events.filter(f.matches).length
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative px-2.5 h-7 inline-flex items-center rounded text-[12px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-white text-ink shadow-soft border border-slate-200'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] font-mono tnum ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="text-[11px] text-slate-500 tnum">
          {visible.length} of {events.length} events
        </div>
      </div>
      <div className="surface px-1.5 py-1.5">
        {visible.map((e) => (
          <TraceEventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  )
}
