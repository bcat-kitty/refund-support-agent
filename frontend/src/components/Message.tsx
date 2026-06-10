import { useState } from 'react'
import { MarkdownLite } from '../lib/markdown'
import type { Message as MessageT, TurnMetrics } from '../types'

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function MetricsFooter({ m }: { m: TurnMetrics }) {
  const parts: { label: string; value: string; tone?: 'amber' }[] = [
    { label: m.tool_calls === 1 ? 'tool' : 'tools', value: String(m.tool_calls) },
    ...(m.retries > 0 ? [{ label: 'retry', value: String(m.retries), tone: 'amber' as const }] : []),
    { label: 'latency', value: fmtMs(m.latency_ms) },
    { label: 'tokens', value: `${m.tokens_in + m.tokens_out}` },
    { label: 'cost', value: `$${m.cost_usd.toFixed(4)}` },
  ]
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {parts.map((p) => (
        <span
          key={p.label}
          className={`chip ${
            p.tone === 'amber'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400 mr-0.5">{p.label}</span>
          {p.value}
        </span>
      ))}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      className="opacity-0 group-hover:opacity-100 transition text-[10px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
            <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
            <rect x="7" y="3" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5 6v9.5A1.5 1.5 0 0 0 6.5 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          copy
        </>
      )}
    </button>
  )
}

export function MessageBubble({ message }: { message: MessageT }) {
  const isUser = message.role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-slide-up">
        <div className="max-w-[78%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed bg-brand-gradient text-white shadow-soft whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start mb-4 animate-slide-up group">
      <div className="flex items-end gap-2 max-w-[82%]">
        <div className="w-8 h-8 rounded-full bg-brand-gradient text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-soft">
          AI
        </div>
        <div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
            <MarkdownLite text={message.content} />
            {message.metrics && <MetricsFooter m={message.metrics} />}
          </div>
          <div className="pl-1 pt-1">
            <CopyButton text={message.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full bg-brand-gradient text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-soft">
          AI
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-soft text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="text-[11px] ml-1 italic">thinking & calling tools…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
