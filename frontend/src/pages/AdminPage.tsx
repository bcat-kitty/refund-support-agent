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
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            <span className="live-dot" />
            Observability
          </div>
          <h1 className="text-[24px] font-semibold tracking-tightest-2 text-ink mt-1.5 leading-tight">
            Agent trace timeline
          </h1>
          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
            Every LLM round-trip, tool call, retry, and error is recorded with tokens, latency,
            and cost so you can audit any decision after the fact.
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
            <div className="surface px-4 py-3 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10.5px] font-semibold shrink-0">
                  {activeSession.customer_name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">
                    {activeSession.customer_name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">{activeSession.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="chip bg-slate-50 text-slate-600 border-slate-200 tnum">
                  {activeSession.message_count} msg
                </span>
                <span className="font-mono tnum">
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
