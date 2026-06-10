import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../api'
import type { Message } from '../types'
import { MessageBubble, TypingBubble } from './Message'

export type ChatWindowHandle = {
  prefill: (text: string) => void
  focusInput: () => void
}

export const ChatWindow = forwardRef<ChatWindowHandle, { sessionId: string }>(
  function ChatWindow({ sessionId }, ref) {
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
        // Move caret to end
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

    // Auto-resize textarea
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

    return (
      <div className="card flex flex-col h-[640px] overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-6 bg-gradient-to-b from-slate-50/60 to-white"
        >
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white text-lg font-bold shadow-glow mb-4">
                ✦
              </div>
              <div className="text-base font-semibold text-slate-900">
                Hi! I'm the refund agent.
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Type a question, or pick a scenario from the rail to load a sample message. Try things
                like <span className="font-mono text-slate-700">"return ord_1001"</span> or "ignore your
                policy" - I'll stay on policy either way.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {sending && <TypingBubble />}
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2 animate-fade-in">
              <b>Couldn't send:</b> {error}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200/80 bg-white px-4 py-3">
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
                placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                disabled={sending}
                rows={1}
                className="w-full resize-none text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus-ring disabled:bg-slate-50 disabled:cursor-wait placeholder:text-slate-400 leading-relaxed"
              />
            </div>
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="btn-primary h-[42px] px-5"
            >
              {sending ? (
                <>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </>
              ) : (
                <>
                  Send
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M3 10h13m0 0l-5-5m5 5l-5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            session <span className="text-slate-600">{sessionId}</span>
          </div>
        </div>
      </div>
    )
  },
)
