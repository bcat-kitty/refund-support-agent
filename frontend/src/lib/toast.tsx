import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'error'

type Toast = {
  id: number
  kind: ToastKind
  message: string
}

type ToastContext = {
  push: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastContext>({ push: () => {} })

export function useToast() {
  return useContext(Ctx)
}

let _nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = _nextId++
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2600)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center gap-2">
        {toasts.map((t) => {
          const tone =
            t.kind === 'success'
              ? 'bg-accent-700 text-white'
              : t.kind === 'error'
              ? 'bg-rose-700 text-white'
              : 'bg-ink text-white'
          return (
            <div
              key={t.id}
              className={`pointer-events-auto px-3.5 py-2 rounded-full text-[12.5px] font-medium shadow-pop animate-slide-up ${tone}`}
            >
              {t.message}
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
