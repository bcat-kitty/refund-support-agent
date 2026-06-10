import { GROUPS, OUTCOME_LABEL, OUTCOME_TONE, SCENARIOS, type Scenario } from '../data/scenarios'

const TONE_BG: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-100',
  slate: 'bg-slate-50 border-slate-100',
  amber: 'bg-amber-50 border-amber-100',
  rose: 'bg-rose-50 border-rose-100',
}
const TONE_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
}

export function ScenarioCatalog({
  onPick,
  activeId,
}: {
  onPick: (s: Scenario) => void
  activeId: string | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9Zm3 1.5h8m-8 3h8m-8 3h5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Try a scenario
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          New here? Pick one of the 14 pre-built scenarios - each loads the right customer and a sample
          message. You can edit before sending.
        </p>
      </div>
      {GROUPS.map((group) => {
        const items = SCENARIOS.filter((s) => s.group === group.id)
        return (
          <div key={group.id}>
            <div className={`flex items-center gap-2 mb-2 px-1`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_DOT[group.tone]}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                {group.label}
              </span>
              <span className="text-[10px] text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((s) => {
                const isActive = activeId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => onPick(s)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 border transition group focus-ring
                      ${
                        isActive
                          ? 'border-brand-300 bg-brand-50/70 shadow-soft'
                          : `${TONE_BG[group.tone]} hover:border-slate-300 hover:shadow-soft`
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 leading-snug">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{s.customerName}</div>
                      </div>
                      <span className={`chip shrink-0 ${OUTCOME_TONE[s.outcome]}`}>
                        {OUTCOME_LABEL[s.outcome]}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.policyRefs.map((ref) => (
                        <span key={ref} className="policy-ref text-[10px]">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
