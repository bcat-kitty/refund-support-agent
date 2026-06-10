import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { PolicyDrawer } from '../components/PolicyDrawer'
import { SessionList } from '../components/SessionList'
import { TraceTimeline } from '../components/TraceTimeline'
import type { SessionSummary, TraceEvent } from '../types'

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [events, setEvents] = useState<TraceEvent[]>([])
  const [loadingTrace, setLoadingTrace] = useState(false)

  const loadSessions = useCallback(() => {
    api
      .listSessions()
      .then((rows) => {
        setSessions(rows)
        setActive((prev) => prev ?? rows[0]?.id ?? null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadSessions()
    const t = setInterval(loadSessions, 4000)
    return () => clearInterval(t)
  }, [loadSessions])

  useEffect(() => {
    if (!active) {
      setEvents([])
      return
    }
    setLoadingTrace(true)
    api
      .getTrace(active)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoadingTrace(false))
  }, [active])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      api.getTrace(active).then(setEvents).catch(() => {})
    }, 3000)
    return () => clearInterval(t)
  }, [active])

  const activeSession = sessions.find((s) => s.id === active)

  return (
    <div className="animate-fade-in">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">
            Observability
          </h1>
          <p className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">
            Every LLM round-trip, tool call, retry, and error is recorded with tokens, latency,
            and cost. Use this view to audit agent decisions.
          </p>
        </div>
        <PolicyDrawer />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4">
          <SessionList
            sessions={sessions}
            active={active}
            onSelect={setActive}
            onRefresh={loadSessions}
          />
        </aside>
        <section className="col-span-12 lg:col-span-8 space-y-3">
          {activeSession && (
            <div className="surface px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-500">
                  Session
                </span>
                <span className="text-[13px] font-medium text-slate-900 truncate">
                  {activeSession.customer_name}
                </span>
                <span className="text-slate-300">/</span>
                <span className="font-mono text-[11.5px] text-slate-500">{activeSession.id}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="chip bg-slate-50 text-slate-600 border-slate-200">
                  {activeSession.message_count} msg
                </span>
                <span className="font-mono">
                  {new Date(activeSession.last_seen_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
          <TraceTimeline events={events} loading={loadingTrace} />
        </section>
      </div>
    </div>
  )
}
