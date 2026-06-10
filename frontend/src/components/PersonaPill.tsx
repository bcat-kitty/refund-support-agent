import { useEffect, useRef, useState } from 'react'
import type { Customer } from '../types'

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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition focus-ring"
        title="Switch customer"
      >
        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold">
          {initials(active.name)}
        </span>
        <span className="text-[13px] text-slate-700">
          <span className="text-slate-500">Acting as</span>{' '}
          <span className="font-medium text-slate-900">{active.name}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 20 20" className="text-slate-400">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 left-0 w-80 surface shadow-lift animate-slide-up p-1 max-h-96 overflow-y-auto">
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
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left hover:bg-slate-50 ${
                c.id === active.id ? 'bg-slate-50' : ''
              }`}
            >
              <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-slate-900 truncate">
                  {c.name}
                </span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {c.email} - {c.tier}
                </span>
              </span>
              {c.id === active.id && (
                <svg width="14" height="14" viewBox="0 0 20 20" className="text-slate-900 shrink-0">
                  <path d="M5 10l3.5 3.5L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-slate-200 mt-1 pt-1">
            <button
              onClick={() => {
                onReset()
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[12.5px] text-slate-700 hover:bg-slate-50"
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10a7 7 0 1 0 2.5-5.4" />
                <path d="M3 4v4h4" />
              </svg>
              Start a new conversation with {active.name}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
