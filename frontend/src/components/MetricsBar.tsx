import type { TraceEvent } from '../types'

function num(n: number | null | undefined): number {
  return typeof n === 'number' ? n : 0
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: 'brand' | 'amber' | 'emerald' | 'rose'
}) {
  const ring =
    accent === 'brand'
      ? 'border-brand-200 bg-brand-50/60'
      : accent === 'amber'
      ? 'border-amber-200 bg-amber-50/60'
      : accent === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/60'
      : accent === 'rose'
      ? 'border-rose-200 bg-rose-50/60'
      : 'border-slate-200 bg-white'
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${ring}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </div>
      <div className="text-base font-mono font-semibold text-slate-900 mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Metric label="LLM turns" value={String(llmCalls)} accent="brand" hint={`${toolCalls} tool calls`} />
      <Metric
        label="Reliability"
        value={errors + retries === 0 ? 'clean' : `${retries}r / ${errors}e`}
        accent={retries > 0 || errors > 0 ? 'amber' : 'emerald'}
        hint={retries > 0 ? `${retries} retry` : 'no retries'}
      />
      <Metric
        label="Tokens"
        value={`${(tokensIn + tokensOut).toLocaleString()}`}
        hint={`${tokensIn.toLocaleString()} in · ${tokensOut.toLocaleString()} out${
          cacheHits > 0 ? ` · ${cacheHits.toLocaleString()} cache` : ''
        }`}
      />
      <Metric label="Latency · Cost" value={fmtMs(latency)} hint={`$${cost.toFixed(4)}`} />
    </div>
  )
}
