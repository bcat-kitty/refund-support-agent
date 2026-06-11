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
    <div className="surface-tinted p-3.5 mb-3 animate-slide-down flex items-start gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-white border border-sand-200 flex items-center justify-center text-slate-700 mt-0.5">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.5L4 5v5c0 3.5 2.5 6.2 6 7.5 3.5-1.3 6-4 6-7.5V5l-6-2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.5 10l2 2 3.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
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
          <span className="font-medium text-ink">Expected:</span> {scenario.expected}
        </div>
      </div>
      <button onClick={onDismiss} className="btn-ghost shrink-0" title="Dismiss">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
