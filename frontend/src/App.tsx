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
        `px-3 py-1.5 rounded-md text-[13px] font-medium transition ${
          isActive
            ? 'text-slate-900 bg-slate-100'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
      <header className="sticky top-0 z-20 bg-[var(--bg)]/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 focus-ring rounded-md pr-2">
            <BrandMark size={22} />
            <span className="text-[14px] font-semibold tracking-tight text-slate-900">
              Harbor Support
            </span>
          </Link>
          <nav className="flex items-center gap-0.5">
            <NavItem to="/" label="Conversations" end />
            <NavItem to="/admin" label="Observability" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Harbor Outfitters - Customer Refunds</span>
          <span className="font-mono text-slate-400">policy v4</span>
        </div>
      </footer>
    </div>
  )
}
