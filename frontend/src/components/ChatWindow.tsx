import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../api'
import { useToast } from '../lib/toast'
import type { Customer, Message } from '../types'
import { MessageBubble, TypingBubble } from './Message'
import {
  representativeScenarios,
  scenariosForCustomer,
  OUTCOME_LABEL,
  OUTCOME_TONE,
} from './ScenarioCatalog'
import type { Scenario } from '../data/scenarios'

export type ChatWindowHandle = {
  prefill: (text: string) => void
  focusInput: () => void
}

type Props = {
  sessionId: string
  activeCustomer: Customer | null
  onPickScenario: (s: Scenario) => void
  onBrowseAll: () => void
}

export const ChatWindow = forwardRef<ChatWindowHandle, Props>(function ChatWindow(
  { sessionId, activeCustomer, onPickScenario, onBrowseAll },
  ref,
) {
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendStartedAt, setSendStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    prefill: (text: string) => {
      setInput(text)
      textareaRef.current?.focus()
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(text.length, text.length)
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight
        }
      })
    },
    focusInput: () => textareaRef.current?.focus(),
  }))

  useEffect(() => {
    setMessages([])
    setError(null)
    setInput('')
    let cancelled = false
    api
      .listMessages(sessionId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs)
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sending])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError(null)
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    setSending(true)
    setSendStartedAt(Date.now())
    try {
      const reply = await api.sendMessage(sessionId, text)
      const assistant: Message = {
        id: reply.message_id,
        session_id: sessionId,
        role: 'assistant',
        content: reply.content,
        created_at: reply.created_at,
        metrics: reply.metrics,
      }
      setMessages((m) => [...m, assistant])
    } catch (e) {
      setError(String(e))
      toast.push('Could not send the message', 'error')
    } finally {
      setSending(false)
      setSendStartedAt(null)
      textareaRef.current?.focus()
    }
  }

  const isEmpty = messages.length === 0 && !sending
  const customerScenarios = scenariosForCustomer(activeCustomer?.email)
  const fallback = representativeScenarios()
  const quickPicks =
    customerScenarios.length > 0
      ? [...customerScenarios, ...fallback].slice(0, 4)
      : fallback

  return (
    <div className="surface flex flex-col h-[640px] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 bg-gradient-to-b from-white to-sand-50/40">
        {isEmpty && (
          <EmptyState
            customer={activeCustomer}
            quickPicks={quickPicks}
            onPick={onPickScenario}
            onBrowseAll={onBrowseAll}
          />
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {sending && <TypingBubble startedAt={sendStartedAt} />}
        {error && (
          <div className="text-[12.5px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2 animate-fade-in">
            <b>Couldn't send:</b> {error}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-3 pt-3 pb-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={
                activeCustomer
                  ? `Message Harbor Support as ${activeCustomer.name.split(' ')[0]}`
                  : 'Message Harbor Support'
              }
              disabled={sending}
              rows={1}
              className="input pr-12"
            />
            <span className="absolute right-3 bottom-2.5 text-[10px] font-mono text-slate-300 hidden sm:block pointer-events-none">
              return
            </span>
          </div>
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary h-[42px] px-4 shrink-0"
            title="Send"
          >
            {sending ? (
              <span className="inline-flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            ) : (
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 10h13m0 0l-5-5m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="text-[10.5px] text-slate-400 mt-2 flex items-center justify-between">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span className="font-mono tnum">{sessionId.slice(0, 12)}</span>
        </div>
      </div>
    </div>
  )
})

function EmptyState({
  customer,
  quickPicks,
  onPick,
  onBrowseAll,
}: {
  customer: Customer | null
  quickPicks: Scenario[]
  onPick: (s: Scenario) => void
  onBrowseAll: () => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto animate-fade-in py-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 dotted-bg rounded-full opacity-60" />
        <div className="relative w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center text-[18px] font-semibold shadow-pop">
          {customer?.name?.[0]?.toUpperCase() ?? 'A'}
        </div>
      </div>
      <h2 className="text-[22px] font-semibold tracking-tightest-2 text-ink leading-tight">
        {customer ? `Hi ${customer.name.split(' ')[0]}, how can we help?` : 'How can we help?'}
      </h2>
      <p className="text-[13.5px] text-slate-500 mt-2 max-w-md leading-relaxed">
        Ask about a return, an order status, or our refund policy. We will check
        eligibility against your account and resolve, escalate, or explain.
      </p>

      <div className="w-full mt-7">
        <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 text-left mb-2.5 pl-1">
          Try one of these
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {quickPicks.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="group text-left rounded-lg border border-slate-200 hover:border-ink/40 hover:shadow-soft transition-all duration-200 px-3.5 py-3 bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-ink leading-snug">
                  {s.title}
                </div>
                <span className={`chip shrink-0 ${OUTCOME_TONE[s.outcome]}`}>
                  {OUTCOME_LABEL[s.outcome]}
                </span>
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1.5 line-clamp-1 italic">
                &ldquo;{s.input}&rdquo;
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onBrowseAll}
          className="block mx-auto text-[12.5px] text-slate-500 hover:text-ink mt-3 py-1.5 transition-colors"
        >
          Browse all 14 examples
          <span className="ml-1.5 text-slate-400">{'->'}</span>
        </button>
      </div>
    </div>
  )
}
