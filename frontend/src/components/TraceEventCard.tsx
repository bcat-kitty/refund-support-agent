import { useState } from 'react'
import type { TraceEvent } from '../types'

type KindStyle = {
  badge: string
  ring: string
  icon: JSX.Element
}

function iconFor(kind: TraceEvent['kind']): JSX.Element {
  switch (kind) {
    case 'llm_request':
    case 'llm_response':
      return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.5a3.5 3.5 0 0 1 3.5 3.5v.5h.5a3 3 0 0 1 0 6h-8a3 3 0 0 1 0-6h.5V6A3.5 3.5 0 0 1 10 2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="8" cy="9" r="0.8" fill="currentColor" />
          <circle cx="12" cy="9" r="0.8" fill="currentColor" />
          <path d="M9 15v2M11 15v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'tool_call':
    case 'tool_result':
      return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="M11.5 3.5a3.5 3.5 0 0 0-3.4 4.4L3.5 12.5l3 3 4.6-4.6a3.5 3.5 0 0 0 4.4-3.4 3.5 3.5 0 0 0-.6-2L13 7.8 12.2 7l2.3-2.3a3.5 3.5 0 0 0-3-1.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'retry':
      return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M3 10a7 7 0 1 0 2.5-5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'tool_error':
      return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 6.5v4M10 13.2v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'escalation':
      return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M10 3L3 16h14L10 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10 8v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="13.5" r="0.8" fill="currentColor" />
        </svg>
      )
  }
}

function styleFor(kind: TraceEvent['kind']): KindStyle {
  const base: Record<TraceEvent['kind'], { badge: string; ring: string }> = {
    llm_request: { badge: 'bg-slate-100 text-slate-700 border-slate-200', ring: 'border-slate-200' },
    llm_response: { badge: 'bg-brand-50 text-brand-700 border-brand-200', ring: 'border-brand-200' },
    tool_call: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', ring: 'border-indigo-200' },
    tool_result: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'border-emerald-200' },
    tool_error: { badge: 'bg-rose-50 text-rose-700 border-rose-200', ring: 'border-rose-300' },
    retry: { badge: 'bg-amber-50 text-amber-800 border-amber-300', ring: 'border-amber-300' },
    escalation: { badge: 'bg-orange-50 text-orange-700 border-orange-200', ring: 'border-orange-200' },
  }
  return { ...base[kind], icon: iconFor(kind) }
}

function JsonBlock({ data, title }: { data: unknown; title: string }) {
  const [open, setOpen] = useState(false)
  if (data === null || data === undefined) return null
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const lineCount = (text.match(/\n/g) || []).length + 1
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100/70 transition"
      >
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${open ? 'bg-brand-500' : 'bg-slate-300'}`} />
          {title}
          <span className="text-slate-400 font-mono text-[10px]">· {lineCount} ln</span>
        </span>
        <span className="font-mono text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <pre className="text-[11px] leading-snug bg-white p-2.5 overflow-x-auto font-mono text-slate-800 whitespace-pre-wrap break-all max-h-80 overflow-y-auto border-t border-slate-200">
          {text}
        </pre>
      )}
    </div>
  )
}

function fmtMs(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined) return null
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function TraceEventCard({ event }: { event: TraceEvent }) {
  const s = styleFor(event.kind)
  const tokens =
    event.tokens_in !== null && event.tokens_out !== null
      ? `${event.tokens_in}→${event.tokens_out}`
      : null
  const lat = fmtMs(event.latency_ms)
  const isErrorish = event.kind === 'tool_error' || event.kind === 'retry'

  return (
    <div className="relative pl-7 pr-1 py-3 group">
      {/* Connector line */}
      <span className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
      {/* Step dot */}
      <span
        className={`absolute left-[6px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
          isErrorish
            ? 'bg-white border-amber-400'
            : event.kind === 'tool_error'
            ? 'bg-white border-rose-400'
            : 'bg-white border-slate-300 group-hover:border-brand-400'
        } transition`}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-400 w-7 shrink-0">#{event.step_index}</span>
        <span className={`chip ${s.badge} gap-1 px-1.5`}>{s.icon}{event.kind.replace(/_/g, ' ')}</span>
        {event.name && (
          <span className="text-sm font-semibold text-slate-800 font-mono">{event.name}</span>
        )}
        <div className="flex-1" />
        {lat && (
          <span className="chip bg-slate-50 text-slate-600 border-slate-200">{lat}</span>
        )}
        {tokens && (
          <span className="chip bg-slate-50 text-slate-600 border-slate-200">{tokens} tok</span>
        )}
        {event.cache_read_in ? (
          <span className="chip bg-emerald-50 text-emerald-700 border-emerald-200">
            cache hit
          </span>
        ) : null}
        {event.cost_usd !== null && event.cost_usd > 0 && (
          <span className="chip bg-slate-50 text-slate-600 border-slate-200">
            ${event.cost_usd.toFixed(5)}
          </span>
        )}
      </div>
      {event.error && (
        <div className="mt-2 text-[12px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 font-mono">
          {event.error}
        </div>
      )}
      <div className="mt-2 space-y-1.5">
        <JsonBlock data={event.input} title="input" />
        <JsonBlock data={event.output} title="output" />
      </div>
    </div>
  )
}
