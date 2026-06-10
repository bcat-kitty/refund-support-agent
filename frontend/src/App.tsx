import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { BrandMark } from './components/Brand'
import AdminPage from './pages/AdminPage'
import ChatPage from './pages/ChatPage'

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          isActive
            ? 'text-slate-900 bg-white shadow-soft'
            : 'text-slate-500 hover:text-slate-900'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 focus-ring rounded-lg pr-2">
            <BrandMark size={32} />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-slate-900">
                Harbor Refund Support
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium">
                AI agent · powered by Claude
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/70 border border-slate-200/70">
            <NavItem to="/" label="Chat" end />
            <NavItem to="/admin" label="Admin · Traces" />
          </nav>
          <a
            href="https://github.com"
            className="hidden sm:inline-flex btn-ghost"
            title="View the policy doc"
            onClick={(e) => e.preventDefault()}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 3.5h6.5L15 7v9.5A1.5 1.5 0 0 1 13.5 18h-8.5A1.5 1.5 0 0 1 3.5 16.5v-12A1.5 1.5 0 0 1 5 3.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M11 3.5V7h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span className="hidden md:inline">Demo build</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="text-center text-[11px] text-slate-400 py-6">
        Harbor Outfitters · refund agent demo · policy is the source of truth
      </footer>
    </div>
  )
}
