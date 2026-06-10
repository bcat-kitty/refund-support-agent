import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../api'
import type { Customer, Message } from '../types'
import { MessageBubble, TypingBubble } from './Message'
import {
  representativeScenarios,
  scenariosForCustomer,
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const isEmpty = messages.length === 0 && !sending
  const customerScenarios = scenariosForCustomer(activeCustomer?.email)
  const fallback = representativeScenarios()
  const quickPicks = customerScenarios.length > 0 ? customerScenarios.slice(0, 3) : fallback

  return (
    <div className="surface flex flex-col h-[640px] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[15px] font-semibold">
              {activeCustomer?.name?.[0] ?? 'A'}
            </div>
            <h2 className="text-[18px] font-semibold text-slate-900 mt-3">
              {activeCustomer
                ? `Hi ${activeCustomer.name.split(' ')[0]}, how can we help?`
                : 'How can we help?'}
            </h2>
            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
              Ask about a return, an order status, or our refund policy. We will check
              eligibility and resolve, escalate, or explain.
            </p>
            <div className="w-full mt-6 space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 text-left mb-1.5">
                Try one of these
              </div>
              {quickPicks.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onPickScenario(s)}
                  className="w-full text-left rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition px-3 py-2 text-[13px] text-slate-800 focus-ring"
                >
                  <span className="text-slate-400 mr-1.5">{'>'}</span>
                  {s.title}
                </button>
              ))}
              <button
                onClick={onBrowseAll}
                className="w-full text-center text-[12px] text-slate-500 hover:text-slate-900 mt-2 py-1.5 transition"
              >
                Browse all examples
              </button>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {sending && <TypingBubble />}
        {error && (
          <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mt-2 animate-fade-in">
            <b>Couldn't send:</b> {error}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 bg-white px-3 py-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
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
              placeholder="Message Harbor Support"
              disabled={sending}
              rows={1}
              className="w-full resize-none text-[14px] border border-slate-200 rounded-md px-3 py-2.5 focus-ring disabled:bg-slate-50 disabled:cursor-wait placeholder:text-slate-400 leading-relaxed bg-white"
            />
          </div>
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary h-[42px] px-4"
            title="Send (Enter)"
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
          <span className="font-mono">session {sessionId.slice(0, 12)}</span>
        </div>
      </div>
    </div>
  )
})
