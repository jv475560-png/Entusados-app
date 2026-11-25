import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/shared/ui/Brand'
import { AccountMenu } from './AccountMenu'

export function StaffShell({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? 'min-h-dvh bg-ink-950 text-white' : 'min-h-dvh bg-ink-100'}>
      <header
        className={
          dark
            ? 'border-b border-white/10 bg-ink-950/90 backdrop-blur'
            : 'border-b border-ink-200 bg-white'
        }
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Logo className="h-8 w-auto" />
            </Link>
            <nav className="flex items-center gap-1 text-xs font-semibold">
              <Link
                to="/admin/pos"
                className={
                  dark
                    ? 'rounded-lg px-2.5 py-1.5 text-white/70 hover:bg-white/10 hover:text-white'
                    : 'rounded-lg px-2.5 py-1.5 text-ink-500 hover:bg-ink-100'
                }
              >
                POS
              </Link>
              <Link
                to="/admin/kds"
                className={
                  dark
                    ? 'rounded-lg px-2.5 py-1.5 text-white/70 hover:bg-white/10 hover:text-white'
                    : 'rounded-lg px-2.5 py-1.5 text-ink-500 hover:bg-ink-100'
                }
              >
                Cocina
              </Link>
              <Link
                to="/admin"
                className={
                  dark
                    ? 'rounded-lg px-2.5 py-1.5 text-white/70 hover:bg-white/10 hover:text-white'
                    : 'rounded-lg px-2.5 py-1.5 text-ink-500 hover:bg-ink-100'
                }
              >
                Admin
              </Link>
            </nav>
          </div>
          <AccountMenu compact />
        </div>
      </header>
      <Outlet />
    </div>
  )
}
