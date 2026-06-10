import { useEffect, useState } from 'react'
import { GROUPS, OUTCOME_LABEL, OUTCOME_TONE, SCENARIOS, type Scenario } from '../data/scenarios'

const GROUP_TONE: Record<string, string> = {
  emerald: 'text-emerald-700',
  slate: 'text-slate-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
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
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 animate-fade-in flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl surface shadow-lift animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Example conversations</h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Pick one to load the matching customer and a sample message.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost shrink-0">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Close
            <span className="ml-1 text-[10px] font-mono text-slate-400">esc</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-6">
          {GROUPS.map((group) => {
            const items = SCENARIOS.filter((s) => s.group === group.id)
            return (
              <div key={group.id}>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className={`text-[11px] uppercase tracking-wider font-semibold ${GROUP_TONE[group.tone]}`}>
                    {group.label}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {items.length}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 mb-2.5 leading-relaxed">
                  {group.description}
                </p>
                <div className="space-y-1.5">
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onPick(s)
                        onClose()
                      }}
                      className="w-full text-left rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition px-3 py-2.5 focus-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-slate-900 leading-snug">
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
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ScenarioButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-secondary">
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M6 7.5h8M6 10.5h8M6 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Browse examples
    </button>
  )
}

/** Returns scenarios that match a customer's email. Used in the chat welcome state. */
export function scenariosForCustomer(email: string | undefined): Scenario[] {
  if (!email) return []
  return SCENARIOS.filter((s) => s.email === email)
}

/** A handful of broadly representative scenarios to suggest as quick-picks. */
export function representativeScenarios(): Scenario[] {
  const wanted = ['alice-fit', 'farah-digital', 'george-large', 'jenna-vip']
  return wanted.map((id) => SCENARIOS.find((s) => s.id === id)!).filter(Boolean)
}

// Re-export so the rest of the app's existing import paths keep working.
export { OUTCOME_LABEL, OUTCOME_TONE } from '../data/scenarios'
