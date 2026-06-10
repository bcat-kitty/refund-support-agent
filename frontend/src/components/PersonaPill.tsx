import { useState, useRef, useEffect } from 'react'
import type { Customer } from '../types'

const TIER_TONE: Record<string, string> = {
  standard: 'bg-slate-100 text-slate-700 border-slate-200',
  gold: 'bg-amber-100 text-amber-800 border-amber-200',
  vip: 'bg-violet-100 text-violet-800 border-violet-200',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function PersonaPill({
  customers,
  active,
  onChange,
  onReset,
}: {
  customers: Customer[]
  active: Customer | null
  onChange: (c: Customer) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!active) return null

  return (
    <div className="card p-3 sm:p-4 flex flex-wrap items-center gap-3" ref={ref}>
      <div className="relative flex-1 min-w-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 transition focus-ring"
        >
          <div className="w-10 h-10 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shrink-0 shadow-soft">
            {initials(active.name)}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{active.name}</span>
              <span className={`chip ${TIER_TONE[active.tier] || TIER_TONE.standard}`}>
                {active.tier}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">{active.email}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 20 20" className="text-slate-400 shrink-0">
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-30 mt-2 left-0 right-0 max-h-80 overflow-y-auto card shadow-lift animate-slide-up p-1">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 ${
                  c.id === active.id ? 'bg-brand-50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{c.name}</span>
                    <span className={`chip ${TIER_TONE[c.tier] || TIER_TONE.standard}`}>{c.tier}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{c.notes || c.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">refunds in 90d</span>
          <b className={`text-slate-900 ${active.refunds_last_90d >= 3 ? 'text-rose-700' : ''}`}>
            {active.refunds_last_90d}
          </b>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">LTV</span>
          <b className="text-slate-900">${active.lifetime_value.toFixed(0)}</b>
        </div>
        <button
          onClick={onReset}
          className="btn-ghost ml-1"
          title="Start a new session with this customer"
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10a7 7 0 1 0 2.5-5.4" />
            <path d="M3 4v4h4" />
          </svg>
          New session
        </button>
      </div>

      {active.notes && (
        <div className="w-full text-[12px] text-slate-500 italic border-t border-slate-100 pt-2.5 leading-relaxed">
          <span className="font-semibold text-slate-600 not-italic">Scenario hint -</span> {active.notes}
        </div>
      )}
    </div>
  )
}
