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
    <div className="space-y-5 animate-fade-in">
      <div className="card overflow-hidden">
        <div className="bg-mesh-hero p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-semibold text-brand-700">
              observability
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Agent trace timeline
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
              Every LLM round-trip, tool call, retry, and error is logged with token counts, latency,
              and estimated cost. The first session in a fresh backend process surfaces an engineered
              <span className="font-semibold"> retry on lookup_policy</span> - perfect for demoing
              retry behavior in a Loom.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PolicyDrawer />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3">
          <SessionList
            sessions={sessions}
            active={active}
            onSelect={setActive}
            onRefresh={loadSessions}
          />
        </aside>
        <section className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-4">
          {activeSession && (
            <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Selected session
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {activeSession.customer_name}{' '}
                  <span className="text-slate-400 font-normal">·</span>{' '}
                  <span className="font-mono text-xs text-slate-600">{activeSession.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="chip bg-slate-100 text-slate-600 border-slate-200">
                  {activeSession.message_count} msg
                </span>
                <span className="font-mono">
                  last activity {new Date(activeSession.last_seen_at).toLocaleTimeString()}
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
