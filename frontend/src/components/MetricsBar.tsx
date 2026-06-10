import type { TraceEvent } from '../types'

function num(n: number | null | undefined): number {
  return typeof n === 'number' ? n : 0
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-3.5 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </div>
      <div className="text-[15px] font-mono font-semibold text-slate-900 mt-0.5">{value}</div>
      {hint && <div className="text-[10.5px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  )
}

export function MetricsBar({ events }: { events: TraceEvent[] }) {
  const llmCalls = events.filter((e) => e.kind === 'llm_response').length
  const toolCalls = events.filter((e) => e.kind === 'tool_call').length
  const retries = events.filter((e) => e.kind === 'retry').length
  const errors = events.filter((e) => e.kind === 'tool_error').length
  const tokensIn = events.reduce(
    (s, e) => s + num(e.tokens_in) + num(e.cache_read_in) + num(e.cache_write_in),
    0,
  )
  const tokensOut = events.reduce((s, e) => s + num(e.tokens_out), 0)
  const latency = events.reduce((s, e) => s + num(e.latency_ms), 0)
  const cost = events.reduce((s, e) => s + num(e.cost_usd), 0)
  const cacheHits = events.reduce((s, e) => s + num(e.cache_read_in), 0)

  return (
    <div className="surface grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200">
      <Metric label="LLM turns" value={String(llmCalls)} hint={`${toolCalls} tool calls`} />
      <Metric
        label="Reliability"
        value={errors + retries === 0 ? 'clean' : `${retries}r / ${errors}e`}
        hint={retries > 0 ? `${retries} retry` : 'no retries'}
      />
      <Metric
        label="Tokens"
        value={`${(tokensIn + tokensOut).toLocaleString()}`}
        hint={`${tokensIn.toLocaleString()} in - ${tokensOut.toLocaleString()} out${
          cacheHits > 0 ? ` - ${cacheHits.toLocaleString()} cache` : ''
        }`}
      />
      <Metric label="Latency / Cost" value={fmtMs(latency)} hint={`$${cost.toFixed(4)}`} />
    </div>
  )
}
