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
    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2 text-[10.5px] text-slate-500">
      {parts.map((p, i) => (
        <span key={p.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300">-</span>}
          <span className="text-slate-400">{p.label}</span>
          <span className={`font-mono ${p.tone === 'amber' ? 'text-amber-700' : 'text-slate-700'}`}>
            {p.value}
          </span>
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
      className="opacity-0 group-hover:opacity-100 transition text-[10.5px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
            <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
            <rect x="7" y="3" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5 6v9.5A1.5 1.5 0 0 0 6.5 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

export function MessageBubble({ message }: { message: MessageT }) {
  const isUser = message.role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end mb-5 animate-slide-up">
        <div className="max-w-[78%] rounded-lg px-3.5 py-2.5 text-[14px] leading-relaxed bg-slate-900 text-white whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start mb-5 animate-slide-up group">
      <div className="max-w-[82%] w-full">
        <div className="text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5">
          Refund Agent
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-[14px] leading-relaxed text-slate-800">
          <MarkdownLite text={message.content} />
          {message.metrics && <MetricsFooter m={message.metrics} />}
        </div>
        <div className="pl-1 pt-1.5">
          <CopyButton text={message.content} />
        </div>
      </div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex justify-start mb-5 animate-fade-in">
      <div className="max-w-[82%]">
        <div className="text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5">
          Refund Agent
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="text-[12px] ml-2 text-slate-500">working on it</span>
          </span>
        </div>
      </div>
    </div>
  )
}
