import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { BrandMark } from './components/Brand'
import { HelpOverlay } from './components/HelpOverlay'
import { useKeyboardShortcut, useShortcutModifier } from './lib/hooks'
import { ToastProvider } from './lib/toast'
import AdminPage from './pages/AdminPage'
import ChatPage from './pages/ChatPage'

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3 h-8 inline-flex items-center rounded-md text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? 'text-ink bg-white shadow-soft border border-slate-200'
            : 'text-slate-500 hover:text-ink'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  const [helpOpen, setHelpOpen] = useState(false)
  const mod = useShortcutModifier()
  const modLabel = mod === 'meta' ? '⌘' : 'Ctrl'

  useKeyboardShortcut('/', (e) => {
    e.preventDefault()
    setHelpOpen((o) => !o)
  })

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 focus-ring pr-2">
              <BrandMark size={24} />
              <div className="flex items-baseline gap-2">
                <span className="text-[14.5px] font-semibold tracking-tightest-2 text-ink">
                  Harbor Support
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-slate-500">
                  <span className="live-dot" />
                  online
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-1 p-1 rounded-lg bg-sand-100/80 border border-sand-200">
              <NavItem to="/" label="Conversations" end />
              <NavItem to="/admin" label="Observability" />
            </nav>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHelpOpen(true)}
                className="btn-ghost hidden sm:inline-flex"
                title="Keyboard shortcuts"
              >
                <span className="kbd">{modLabel}</span>
                <span className="kbd">/</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 mt-12">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Harbor Outfitters - Customer Refunds</span>
            <span className="font-mono text-slate-400">policy v4 - audit-ready</span>
          </div>
        </footer>

        <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ToastProvider>
  )
}
