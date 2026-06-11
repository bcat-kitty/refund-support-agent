import { useState } from 'react'
import { useToast } from '../lib/toast'
import type { TraceEvent } from '../types'

function kindLabel(kind: TraceEvent['kind']): string {
  switch (kind) {
    case 'llm_request': return 'LLM request'
    case 'llm_response': return 'LLM response'
    case 'tool_call': return 'Tool call'
    case 'tool_result': return 'Tool result'
    case 'tool_error': return 'Tool error'
    case 'retry': return 'Retry'
    case 'escalation': return 'Escalation'
  }
}

function kindTone(kind: TraceEvent['kind']): string {
  switch (kind) {
    case 'llm_request':
    case 'llm_response':
      return 'bg-slate-50 text-slate-700 border-slate-200'
    case 'tool_call':
      return 'bg-sand-100 text-slate-800 border-sand-200'
    case 'tool_result':
      return 'bg-accent-50 text-accent-700 border-accent-100'
    case 'tool_error':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'retry':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'escalation':
      return 'bg-orange-50 text-orange-700 border-orange-200'
  }
}

function dotTone(kind: TraceEvent['kind']): string {
  if (kind === 'tool_error') return 'bg-white border-rose-400 ring-2 ring-rose-100'
  if (kind === 'retry') return 'bg-white border-amber-400 ring-2 ring-amber-100'
  if (kind === 'tool_result') return 'bg-white border-accent-500'
  return 'bg-white border-slate-300 group-hover:border-ink/60'
}

function JsonBlock({ data, title }: { data: unknown; title: string }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  if (data === null || data === undefined) return null
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const lineCount = (text.match(/\n/g) || []).length + 1
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1 h-1 rounded-full transition-colors ${
              open ? 'bg-ink' : 'bg-slate-300'
            }`}
          />
          {title}
          <span className="text-slate-400 font-mono text-[10px] tnum">{lineCount} ln</span>
        </span>
        <span className="flex items-center gap-2">
          {open && (
            <span
              role="button"
              tabIndex={0}
              onClick={async (e) => {
                e.stopPropagation()
                await navigator.clipboard.writeText(text)
                toast.push('Copied JSON', 'success')
              }}
              className="text-[10px] text-slate-400 hover:text-ink"
            >
              copy
            </span>
          )}
          <span className="font-mono text-slate-400 text-[12px]">{open ? '-' : '+'}</span>
        </span>
      </button>
      {open && (
        <pre className="text-[11px] leading-snug bg-sand-50 p-2.5 overflow-x-auto font-mono text-slate-800 whitespace-pre-wrap break-all max-h-80 overflow-y-auto border-t border-slate-200 animate-fade-in">
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
  const tokens =
    event.tokens_in !== null && event.tokens_out !== null
      ? `${event.tokens_in} / ${event.tokens_out}`
      : null
  const lat = fmtMs(event.latency_ms)

  return (
    <div className="relative pl-7 pr-2 py-3 group hover:bg-sand-50/40 rounded-md transition-colors">
      <span className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
      <span
        className={`absolute left-[7px] top-[15px] w-3 h-3 rounded-full border-2 ${dotTone(event.kind)} transition-all`}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-400 tnum w-6 shrink-0">
          #{event.step_index}
        </span>
        <span className={`chip ${kindTone(event.kind)}`}>{kindLabel(event.kind)}</span>
        {event.name && (
          <span className="text-[12.5px] font-medium text-ink font-mono">{event.name}</span>
        )}
        <div className="flex-1" />
        {lat && (
          <span className="chip-mono bg-white text-slate-600 border-slate-200">{lat}</span>
        )}
        {tokens && (
          <span className="chip-mono bg-white text-slate-600 border-slate-200">{tokens} tok</span>
        )}
        {event.cache_read_in ? (
          <span className="chip bg-accent-50 text-accent-700 border-accent-100">
            cache hit
          </span>
        ) : null}
        {event.cost_usd !== null && event.cost_usd > 0 && (
          <span className="chip-mono bg-white text-slate-600 border-slate-200">
            ${event.cost_usd.toFixed(5)}
          </span>
        )}
      </div>
      {event.error && (
        <div className="mt-2 text-[12px] text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5 font-mono">
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
