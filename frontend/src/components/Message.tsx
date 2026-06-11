import { useState } from 'react'
import { MarkdownLite } from '../lib/markdown'
import { useElapsed } from '../lib/hooks'
import { useToast } from '../lib/toast'
import type { Message as MessageT, TurnMetrics } from '../types'

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function MetricsFooter({ m }: { m: TurnMetrics }) {
  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
      <span className="flex items-center gap-1">
        <span className="text-slate-400">{m.tool_calls === 1 ? 'tool' : 'tools'}</span>
        <span className="font-mono tnum text-slate-700">{m.tool_calls}</span>
      </span>
      {m.retries > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-slate-400">retry</span>
          <span className="font-mono tnum text-amber-700">{m.retries}</span>
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className="text-slate-400">latency</span>
        <span className="font-mono tnum text-slate-700">{fmtMs(m.latency_ms)}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-slate-400">tokens</span>
        <span className="font-mono tnum text-slate-700">{(m.tokens_in + m.tokens_out).toLocaleString()}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-slate-400">cost</span>
        <span className="font-mono tnum text-slate-700">${m.cost_usd.toFixed(4)}</span>
      </span>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.push('Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 1400)
      }}
      className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-[10.5px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
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
        <div className="max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[14px] leading-relaxed bg-ink text-white whitespace-pre-wrap shadow-soft">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start mb-5 animate-slide-up group">
      <div className="max-w-[82%] w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
          Refund Agent
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-[14px] leading-relaxed text-ink shadow-soft">
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

export function TypingBubble({ startedAt }: { startedAt: number | null }) {
  const elapsed = useElapsed(startedAt)
  const stage = stageFor(elapsed)
  return (
    <div className="flex justify-start mb-5 animate-fade-in">
      <div className="max-w-[82%]">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
          Refund Agent
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-slate-500 shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
            <span className="text-[12.5px] text-slate-600">{stage}</span>
            <span className="text-[10.5px] font-mono tnum text-slate-400 ml-1">
              {(elapsed / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function stageFor(elapsedMs: number): string {
  if (elapsedMs < 800) return 'Reading your message'
  if (elapsedMs < 2500) return 'Looking up your account'
  if (elapsedMs < 4500) return 'Checking the policy'
  if (elapsedMs < 7000) return 'Verifying eligibility'
  return 'Composing a response'
}
