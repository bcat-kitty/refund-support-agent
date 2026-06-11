import { useEffect, useRef, useState } from 'react'

/** Detect Cmd on Mac, Ctrl elsewhere. */
export function useShortcutModifier(): 'meta' | 'ctrl' {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent)
  return isMac ? 'meta' : 'ctrl'
}

/** Fires `handler` when the user presses the given key with the modifier (Cmd/Ctrl). */
export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  opts: { withMod?: boolean } = { withMod: true },
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (opts.withMod && !mod) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        handler(e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [key, handler, opts.withMod])
}

/** Returns elapsed milliseconds since `start` (re-renders ~10x/sec). */
export function useElapsed(start: number | null): number {
  const [, tick] = useState(0)
  const lastRef = useRef(0)
  useEffect(() => {
    if (start === null) return
    const id = window.setInterval(() => {
      lastRef.current = Date.now() - start
      tick((n) => n + 1)
    }, 100)
    return () => window.clearInterval(id)
  }, [start])
  if (start === null) return 0
  return Math.max(0, Date.now() - start)
}

/** Animates a number from 0 to `target` over `durationMs`. */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target)
  const startedAt = useRef<number | null>(null)
  const from = useRef(target)
  useEffect(() => {
    from.current = value
    startedAt.current = Date.now()
    let raf = 0
    const step = () => {
      const t = startedAt.current ?? Date.now()
      const elapsed = Date.now() - t
      const p = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = from.current + (target - from.current) * eased
      setValue(next)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])
  return value
}
