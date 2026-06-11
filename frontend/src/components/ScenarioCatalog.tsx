import { useEffect, useMemo, useState } from 'react'
import { GROUPS, OUTCOME_LABEL, OUTCOME_TONE, SCENARIOS, type Scenario } from '../data/scenarios'
import { useShortcutModifier } from '../lib/hooks'

const GROUP_TONE: Record<string, { dot: string; text: string }> = {
  emerald: { dot: 'bg-accent-500', text: 'text-accent-700' },
  slate: { dot: 'bg-slate-400', text: 'text-slate-700' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-700' },
  rose: { dot: 'bg-rose-500', text: 'text-rose-700' },
}

export function ScenarioBrowser({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (s: Scenario) => void
}) {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const mod = useShortcutModifier()
  const modLabel = mod === 'meta' ? '⌘' : 'Ctrl'

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveGroup('all')
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SCENARIOS.filter((s) => {
      if (activeGroup !== 'all' && s.group !== activeGroup) return false
      if (!q) return true
      return (
        s.title.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.input.toLowerCase().includes(q)
      )
    })
  }, [query, activeGroup])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-md z-40 animate-fade-in flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl surface shadow-pop animate-pop overflow-hidden mt-4 sm:mt-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tightest-2 text-ink">
              Example conversations
            </h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5 leading-relaxed">
              Pick one to load the matching customer and a sample message.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost shrink-0">
            <span className="kbd">esc</span>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 space-y-2.5">
          <div className="relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by topic, customer, or message"
              className="input pl-9 pr-12 h-10"
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="kbd">{modLabel}</span>
              <span className="kbd">K</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveGroup('all')}
              className={`px-2.5 h-7 inline-flex items-center rounded-md text-[12px] font-medium transition ${
                activeGroup === 'all' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
              <span className={`ml-1.5 text-[10px] font-mono ${activeGroup === 'all' ? 'text-slate-400' : 'text-slate-400'}`}>
                {SCENARIOS.length}
              </span>
            </button>
            {GROUPS.map((g) => {
              const count = SCENARIOS.filter((s) => s.group === g.id).length
              const active = activeGroup === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition ${
                    active ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${GROUP_TONE[g.tone].dot}`} />
                  {g.label}
                  <span className={`text-[10px] font-mono ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-[13px] font-medium text-slate-700">No matches</div>
              <div className="text-[12px] text-slate-500 mt-1">
                Try a different keyword or remove the filter.
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onPick(s)
                  onClose()
                }}
                className="group text-left rounded-lg border border-slate-200 hover:border-ink/40 hover:shadow-soft transition-all duration-200 ease-smooth px-3.5 py-3 bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-ink leading-snug">
                      {s.title}
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      {s.customerName}
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${OUTCOME_TONE[s.outcome]}`}>
                    {OUTCOME_LABEL[s.outcome]}
                  </span>
                </div>
                <div className="mt-2 text-[12px] text-slate-600 line-clamp-2 italic leading-snug">
                  &ldquo;{s.input}&rdquo;
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.policyRefs.map((r) => (
                    <span key={r} className="policy-ref">{r}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-2.5 border-t border-slate-100 bg-sand-50/60 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            {filtered.length} of {SCENARIOS.length} scenarios
          </span>
          <span className="flex items-center gap-1">
            Tip: press <span className="kbd">{modLabel}</span> <span className="kbd">K</span> to open this anytime
          </span>
        </div>
      </div>
    </div>
  )
}

export function ScenarioButton({ onClick }: { onClick: () => void }) {
  const mod = useShortcutModifier()
  const modLabel = mod === 'meta' ? '⌘' : 'Ctrl'
  return (
    <button onClick={onClick} className="btn-secondary group">
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M6 7.5h8M6 10.5h8M6 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Examples
      <span className="ml-1 flex items-center gap-0.5">
        <span className="kbd">{modLabel}</span>
        <span className="kbd">K</span>
      </span>
    </button>
  )
}

export function scenariosForCustomer(email: string | undefined): Scenario[] {
  if (!email) return []
  return SCENARIOS.filter((s) => s.email === email)
}

export function representativeScenarios(): Scenario[] {
  const wanted = ['alice-fit', 'farah-digital', 'george-large', 'jenna-vip']
  return wanted.map((id) => SCENARIOS.find((s) => s.id === id)!).filter(Boolean)
}

export { OUTCOME_LABEL, OUTCOME_TONE } from '../data/scenarios'
