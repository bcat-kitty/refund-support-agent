import type { Scenario } from '../data/scenarios'
import { OUTCOME_LABEL, OUTCOME_TONE } from '../data/scenarios'

export function ExpectedOutcomeBanner({
  scenario,
  onDismiss,
}: {
  scenario: Scenario
  onDismiss: () => void
}) {
  return (
    <div className="surface p-3 mb-3 animate-slide-up flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] uppercase font-semibold tracking-wider text-slate-500">
            Example loaded
          </span>
          <span className={`chip ${OUTCOME_TONE[scenario.outcome]}`}>
            {OUTCOME_LABEL[scenario.outcome]}
          </span>
          {scenario.policyRefs.map((r) => (
            <span key={r} className="policy-ref">{r}</span>
          ))}
        </div>
        <div className="text-[12.5px] text-slate-700 mt-1.5 leading-relaxed">
          <span className="font-medium text-slate-900">Expected:</span> {scenario.expected}
        </div>
      </div>
      <button onClick={onDismiss} className="btn-ghost" title="Dismiss">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
