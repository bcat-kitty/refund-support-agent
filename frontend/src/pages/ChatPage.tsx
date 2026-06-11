import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ChatWindow, ChatWindowHandle } from '../components/ChatWindow'
import { ExpectedOutcomeBanner } from '../components/ExpectedOutcomeBanner'
import { PersonaPill } from '../components/PersonaPill'
import { ScenarioBrowser, ScenarioButton } from '../components/ScenarioCatalog'
import type { Scenario } from '../data/scenarios'
import { useKeyboardShortcut } from '../lib/hooks'
import { useToast } from '../lib/toast'
import type { Customer, Session } from '../types'

export default function ChatPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [active, setActive] = useState<Customer | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [browserOpen, setBrowserOpen] = useState(false)
  const chatRef = useRef<ChatWindowHandle | null>(null)
  const pendingRef = useRef<{ sessionEmail: string; text: string } | null>(null)

  useKeyboardShortcut('k', (e) => {
    e.preventDefault()
    setBrowserOpen((o) => !o)
  })

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

  useEffect(() => {
    if (!active) return
    setSession(null)
    api
      .startSession(active.email)
      .then(setSession)
      .catch((e) => setError(String(e)))
  }, [active])

  useEffect(() => {
    if (!session || !pendingRef.current) return
    if (pendingRef.current.sessionEmail !== session.customer.email) return
    const { text } = pendingRef.current
    pendingRef.current = null
    requestAnimationFrame(() => chatRef.current?.prefill(text))
  }, [session])

  const handleResetSession = useCallback(() => {
    if (!active) return
    setSession(null)
    setActiveScenario(null)
    api
      .startSession(active.email)
      .then((s) => {
        setSession(s)
        toast.push(`New conversation with ${active.name}`, 'info')
      })
      .catch((e) => setError(String(e)))
  }, [active, toast])

  const handlePickScenario = useCallback(
    (s: Scenario) => {
      setActiveScenario(s)
      const target = customers.find((c) => c.email === s.email) || null
      if (!target) return
      if (target.id !== active?.id) {
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-4">
        <PersonaPill
          customers={customers}
          active={active}
          onChange={(c) => {
            setActive(c)
            setActiveScenario(null)
          }}
          onReset={handleResetSession}
        />
        <ScenarioButton onClick={() => setBrowserOpen(true)} />
      </div>

      {error && (
        <div className="text-[12.5px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {activeScenario && (
        <ExpectedOutcomeBanner
          scenario={activeScenario}
          onDismiss={() => setActiveScenario(null)}
        />
      )}

      {session ? (
        <ChatWindow
          ref={chatRef}
          sessionId={session.id}
          activeCustomer={active}
          onPickScenario={handlePickScenario}
          onBrowseAll={() => setBrowserOpen(true)}
        />
      ) : (
        <SessionSkeleton />
      )}

      <ScenarioBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onPick={handlePickScenario}
      />
    </div>
  )
}

function SessionSkeleton() {
  return (
    <div className="surface p-6 h-[640px] flex flex-col">
      <div className="space-y-4 flex-1">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-3 w-64" />
        <div className="flex justify-end">
          <div className="skeleton h-10 w-2/3 rounded-2xl" />
        </div>
        <div className="skeleton h-10 w-3/4 rounded-2xl" />
      </div>
      <div className="text-center text-[12px] text-slate-400 mt-4">
        Starting your conversation
      </div>
    </div>
  )
}
