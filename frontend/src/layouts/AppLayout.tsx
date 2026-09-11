import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { HeartHandshake, LayoutDashboard, LogOut, Menu, Store, X } from 'lucide-react'
import { getStoredUser, logout as logoutRequest } from '../services/auth'
import { ROLE_LABELS } from '../types/auth'
import type { Role } from '../types/auth'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  roles?: Role[]
}

interface NavSection {
  title: string | null
  items: NavItem[]
}

// Navegação lateral, com itens visíveis conforme o papel do usuário (sem
// `roles`, o item aparece pra todo mundo). Cada fase de implementação
// adiciona seus itens aqui conforme as telas ficam prontas — ver plano em
// /root/.claude/plans/lovely-doodling-mochi.md.
const navSections: NavSection[] = [
  { title: null, items: [{ label: 'Painel', path: '/', icon: LayoutDashboard }] },
  {
    title: 'Cadastros',
    items: [
      { label: 'Doadores', path: '/doadores', icon: Store, roles: ['ADMIN'] },
      { label: 'Receptores', path: '/receptores', icon: HeartHandshake, roles: ['ADMIN'] },
    ],
  },
]

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const user = getStoredUser()

  async function handleLogout() {
    await logoutRequest()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-emerald-950 text-emerald-50 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            🍎 ConectFome
          </Link>
          <button
            type="button"
            className="text-emerald-300 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-6 px-3 py-4">
          {navSections.map((section, index) => {
            const items = section.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            if (items.length === 0) return null

            return (
              <div key={section.title ?? index}>
                {section.title && (
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    {section.title}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-emerald-100 hover:bg-emerald-900 hover:text-white'
                        }`
                      }
                    >
                      <item.icon size={18} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            className="text-slate-500 hover:text-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="ml-auto flex items-center gap-4">
            {user && (
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
