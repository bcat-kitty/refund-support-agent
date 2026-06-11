import { useEffect } from 'react'
import { useShortcutModifier } from '../lib/hooks'

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ['mod', 'K'], label: 'Browse example conversations' },
  { keys: ['mod', '/'], label: 'Show this help' },
  { keys: ['mod', 'Enter'], label: 'Send your message' },
  { keys: ['Esc'], label: 'Close any open panel' },
]

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="surface shadow-pop w-full max-w-md p-5 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-ink">Keyboard shortcuts</h3>
          <button onClick={onClose} className="btn-ghost">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="space-y-1.5">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1.5">
              <span className="text-[13px] text-slate-700">{r.label}</span>
              <span className="flex items-center gap-1">
                {r.keys.map((k) => (
                  <span key={k} className="kbd">
                    {k === 'mod' ? modLabel : k}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
