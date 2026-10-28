import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Search,
  Server,
  Settings,
} from 'lucide-react'

import { useAuth } from '@/api/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/chamados', label: 'Chamados', icon: ClipboardList },
  { to: '/ativos', label: 'Ativos', icon: Server },
  { to: '/sei', label: 'SEI', icon: FileSearch },
  { to: '/consultas', label: 'Consultas', icon: Search },
  { to: '/admin', label: 'Admin', icon: Settings, admin: true },
]

export function AppShell() {
  const { usuario, sair, ehAdmin } = useAuth()

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col bg-ink text-white">
        <div className="px-5 pt-6 pb-4">
          <p className="font-mono text-[10px] tracking-[0.16em] text-on-ink-soft uppercase">
            Secretaria de Governo
          </p>
          <h1 className="mt-1 font-display text-xl font-extrabold">Portal SEGOV</h1>
          {usuario?.secao && (
            <Badge variant="secondary" className="mt-3 border-0 bg-white/10 text-on-ink-warn">
              {usuario.secao}
              {usuario.seiUnidade?.sigla ? ` · ${usuario.seiUnidade.sigla}` : ''}
            </Badge>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.filter((item) => !item.admin || ehAdmin).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-on-ink hover:bg-white/8 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 opacity-80" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 flex items-start gap-2">
            <LayoutDashboard className="mt-0.5 h-4 w-4 text-on-ink-soft" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {usuario?.displayName ?? usuario?.username}
              </p>
              <p className="truncate font-mono text-[11px] text-on-ink-soft">
                {usuario?.username}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-0 bg-white/10 text-white hover:bg-white/20"
            onClick={sair}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-card px-6 py-3">
          <div>
            <p className="font-mono text-[10.5px] tracking-wider text-muted uppercase">
              Sessão AD · 8h
            </p>
            <p className="text-sm text-ink-soft">
              {usuario?.ouPath ? `OU: ${usuario.ouPath}` : 'Seção não mapeada'}
            </p>
          </div>
          <div className="flex gap-2">
            {(usuario?.papeis ?? []).map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
          </div>
        </header>
        <Separator />
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
