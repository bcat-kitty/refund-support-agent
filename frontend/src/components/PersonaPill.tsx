import { useEffect, useRef, useState } from 'react'
import type { Customer } from '../types'

const TIER_TONE: Record<string, string> = {
  standard: 'bg-slate-100 text-slate-700 border-slate-200',
  gold: 'bg-amber-50 text-amber-800 border-amber-200',
  vip: 'bg-accent-50 text-accent-700 border-accent-100',
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2.5 px-2.5 h-10 rounded-lg hover:bg-white hover:shadow-soft hover:border-slate-200 border border-transparent transition-all duration-200 focus-ring"
        title="Switch customer"
      >
        <span className="relative">
          <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-[10.5px] font-semibold">
            {initials(active.name)}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-500 border-2 border-[var(--bg)]" />
        </span>
        <div className="text-left leading-tight">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            Acting as
          </div>
          <div className="text-[13px] font-medium text-ink flex items-center gap-1.5">
            {active.name}
            <span className={`chip ${TIER_TONE[active.tier] || TIER_TONE.standard} !text-[9.5px] !px-1.5`}>
              {active.tier}
            </span>
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 20 20" className="text-slate-400 ml-0.5">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 left-0 w-96 surface shadow-pop animate-pop overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-sand-50/60 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center text-[13px] font-semibold">
              {initials(active.name)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-ink truncate">{active.name}</div>
              <div className="text-[11.5px] text-slate-500 truncate">{active.email}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">LTV</div>
              <div className="text-[13px] font-semibold tnum text-ink">
                ${active.lifetime_value.toFixed(0)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white">
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Tier</div>
              <div className="text-[12.5px] font-medium text-ink mt-0.5 capitalize">{active.tier}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Refunds 90d</div>
              <div className={`text-[12.5px] font-medium mt-0.5 tnum ${active.refunds_last_90d >= 3 ? 'text-rose-700' : 'text-ink'}`}>
                {active.refunds_last_90d}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Joined</div>
              <div className="text-[12.5px] font-medium text-ink mt-0.5 tnum">
                {new Date(active.joined_at).getFullYear()}
              </div>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              Switch customer
            </div>
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                  c.id === active.id ? 'bg-sand-100' : 'hover:bg-slate-50'
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink truncate">
                    {c.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {c.email}
                  </span>
                </span>
                <span className={`chip ${TIER_TONE[c.tier] || TIER_TONE.standard} !text-[9.5px] !px-1.5`}>
                  {c.tier}
                </span>
                {c.id === active.id && (
                  <svg width="13" height="13" viewBox="0 0 20 20" className="text-ink shrink-0">
                    <path d="M5 10l3.5 3.5L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 p-1.5">
            <button
              onClick={() => {
                onReset()
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12.5px] text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10a7 7 0 1 0 2.5-5.4" />
                <path d="M3 4v4h4" />
              </svg>
              Start a new conversation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
