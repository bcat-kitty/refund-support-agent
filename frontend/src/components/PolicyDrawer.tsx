import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Policy } from '../types'

export function PolicyDrawer() {
  const [open, setOpen] = useState(false)
  const [policy, setPolicy] = useState<Policy | null>(null)

  useEffect(() => {
    if (open && !policy) {
      api.getPolicy().then(setPolicy).catch(() => {})
    }
  }, [open, policy])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 3.5h6.5L15 7v9.5A1.5 1.5 0 0 1 13.5 18h-8.5A1.5 1.5 0 0 1 3.5 16.5v-12A1.5 1.5 0 0 1 5 3.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M11 3.5V7h4M6 11h7M6 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        View policy
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-md z-40 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-200 z-50 flex flex-col animate-slide-up shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between bg-sand-50/40">
              <div>
                <h3 className="text-[14.5px] font-semibold tracking-tight text-ink">Refund policy</h3>
                {policy && (
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono tnum">
                    Version {policy.version} - effective{' '}
                    {new Date(policy.effective_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost">
                <span className="kbd">esc</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-[13px] whitespace-pre-wrap font-mono leading-relaxed text-slate-800">
              {policy ? policy.content_md : 'Loading...'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
