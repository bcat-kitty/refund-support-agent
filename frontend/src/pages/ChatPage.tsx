import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ChatWindow, ChatWindowHandle } from '../components/ChatWindow'
import { ExpectedOutcomeBanner } from '../components/ExpectedOutcomeBanner'
import { PersonaPill } from '../components/PersonaPill'
import { ScenarioCatalog } from '../components/ScenarioCatalog'
import type { Scenario } from '../data/scenarios'
import type { Customer, Session } from '../types'

export default function ChatPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [active, setActive] = useState<Customer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const chatRef = useRef<ChatWindowHandle | null>(null)
  // Pending scenario input to load into the chat once the (possibly new) session is ready.
  const pendingRef = useRef<{ sessionEmail: string; text: string } | null>(null)

  useEffect(() => {
    api
      .listCustomers()
      .then((list) => {
        setCustomers(list)
        if (list.length && !active) setActive(list[0])
      })
      .catch((e) => setError(String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start (or restart) a session whenever active customer changes.
  useEffect(() => {
    if (!active) return
    setSession(null)
    api
      .startSession(active.email)
      .then(setSession)
      .catch((e) => setError(String(e)))
  }, [active])

  // Once the session is ready, deliver any pending scenario prefill.
  useEffect(() => {
    if (!session || !pendingRef.current) return
    if (pendingRef.current.sessionEmail !== session.customer.email) return
    const { text } = pendingRef.current
    pendingRef.current = null
    // Allow ChatWindow to mount before prefilling.
    requestAnimationFrame(() => chatRef.current?.prefill(text))
  }, [session])

  const handleResetSession = useCallback(() => {
    if (!active) return
    setSession(null)
    setActiveScenario(null)
    api.startSession(active.email).then(setSession).catch((e) => setError(String(e)))
  }, [active])

  const handlePickScenario = useCallback(
    (s: Scenario) => {
      setActiveScenario(s)
      const target = customers.find((c) => c.email === s.email) || null
      if (!target) return
      if (target.id !== active?.id) {
        // Switch persona - useEffect will start the session, then deliver the prefill.
        pendingRef.current = { sessionEmail: s.email, text: s.input }
        setActive(target)
      } else if (session) {
        chatRef.current?.prefill(s.input)
      } else {
        pendingRef.current = { sessionEmail: s.email, text: s.input }
      }
    },
    [active, customers, session],
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero / welcome */}
      <div className="card overflow-hidden">
        <div className="bg-mesh-hero p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/80 backdrop-blur border border-slate-200 items-center justify-center shadow-soft text-brand-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3.5 11.5a8.5 8.5 0 1 1 2.4 5.9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M3 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chat with the refund agent
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-2xl">
                The agent identifies you, checks your orders against the corporate policy, and either
                issues a refund, escalates to a human, or denies the request with a citation. Try a
                scenario from the rail - each one loads the right customer and a sample message.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-slate-500 shrink-0">
              <span className="chip bg-white/70 border-slate-200 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                live
              </span>
              <span className="font-mono">claude-sonnet-4-6</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-4">
          <div className="card p-4 max-h-[760px] overflow-y-auto">
            <ScenarioCatalog onPick={handlePickScenario} activeId={activeScenario?.id ?? null} />
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8 xl:col-span-8 space-y-4">
          <PersonaPill
            customers={customers}
            active={active}
            onChange={(c) => {
              setActive(c)
              setActiveScenario(null)
            }}
            onReset={handleResetSession}
          />
          {activeScenario && (
            <ExpectedOutcomeBanner
              scenario={activeScenario}
              onDismiss={() => setActiveScenario(null)}
            />
          )}
          {session ? (
            <ChatWindow ref={chatRef} sessionId={session.id} />
          ) : (
            <div className="card p-10 flex items-center justify-center text-sm text-slate-400">
              {active ? 'Starting session…' : 'Loading…'}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
