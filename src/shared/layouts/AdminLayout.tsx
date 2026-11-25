import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  Megaphone,
  QrCode,
  ReceiptText,
  ScanLine,
  Truck,
  Wallet,
} from 'lucide-react'
import { Logo } from '@/shared/ui/Brand'
import { cn } from '@/shared/lib/format'
import { AccountMenu } from './AccountMenu'

const NAV = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/promociones', label: 'Promociones', icon: Megaphone },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/admin/pagos', label: 'Pagos Bre-B', icon: Wallet },
  { to: '/admin/contabilidad', label: 'Caja y balance', icon: ReceiptText },
  { to: '/admin/checklists', label: 'Checklists turno', icon: ClipboardCheck },
  { to: '/admin/cobertura', label: 'Cobertura domicilio', icon: MapPin },
]

const SHORTCUTS = [
  { to: '/', label: 'Ver tienda', icon: QrCode },
  { to: '/admin/pos', label: 'POS', icon: ScanLine },
  { to: '/admin/kds', label: 'Cocina', icon: BarChart3 },
]

export function AdminLayout() {
  const location = useLocation()

  return (
    <div className="admin-dark min-h-dvh bg-ink-950 text-white lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-ink-900/50 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <Logo className="h-9 w-auto" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500 text-ink-950 shadow-sm'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
            Accesos rápidos
          </p>
          {SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-white/45 hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-auto lg:hidden" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                  {NAV.find(
                    (item) =>
                      item.to === location.pathname ||
                      (!item.end && location.pathname.startsWith(item.to)),
                  )?.label ?? 'ENTUSADOS'}
                </p>
                <p className="hidden text-xs text-ink-400 sm:block">
                  Operación en vivo · zona horaria America/Bogota
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NavLink
                to="/"
                className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 sm:inline-flex"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Tienda
              </NavLink>
              <AccountMenu />
            </div>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 lg:hidden">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                    isActive ? 'bg-brand-500 text-ink-950' : 'text-white/50 hover:bg-white/10',
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
