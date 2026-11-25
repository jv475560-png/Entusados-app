import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, ShoppingCart, Store, Truck } from 'lucide-react'
import { Logo } from '@/shared/ui/Brand'
import {
  cartCount,
  cartSubtotal,
  useCartStore,
} from '@/modules/ordering/store/cartStore'
import { formatCOP, cn } from '@/shared/lib/format'
import { getBogotaTime } from '@/shared/lib/schedule'
import { ClientLocationProvider } from '@/shared/contexts/ClientLocationContext'

function StoreOpenStatus() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(interval)
  }, [])

  const at = getBogotaTime(now)
  const open = at.minutes >= 19 * 60 && at.minutes < 23 * 60

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left',
        open
          ? 'border-emerald-400/30 bg-emerald-400/10'
          : 'border-brand-400/25 bg-brand-400/10',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          open ? 'bg-emerald-400' : 'bg-brand-400',
        )}
      />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            'text-[11px] font-bold',
            open ? 'text-emerald-300' : 'text-brand-300',
          )}
        >
          {open ? 'Abierto' : 'Cerrado'}
        </span>
        {!open && (
          <span className="text-[9px] font-medium text-brand-200/70">
            (abierto de 7 a 11pm)
          </span>
        )}
      </span>
    </span>
  )
}

function ClientShell() {
  const items = useCartStore((state) => state.items)
  const setFulfillment = useCartStore((state) => state.setFulfillment)
  const count = cartCount(items)
  const subtotal = cartSubtotal(items)
  const location = useLocation()
  const hideFloating =
    location.pathname.includes('/cart') ||
    location.pathname.includes('/checkout') ||
    location.pathname.includes('/order/') ||
    location.pathname.includes('/success/')

  // La tienda pública es exclusivamente para domicilio.
  useEffect(() => {
    setFulfillment('delivery')
  }, [setFulfillment])

  return (
    <div className="theme-dark flex min-h-dvh flex-col bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-0">
              <Logo className="h-10 w-auto" />
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                <Truck className="h-2.5 w-2.5" />
                Domicilio
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <StoreOpenStatus />
              <Link
                to="/cart"
                className="relative inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-3 text-sm font-bold text-ink-950 transition hover:bg-brand-400"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Carrito</span>
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-extrabold text-ink-950">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-4">
        <Outlet />
      </main>

      {count > 0 && !hideFloating && (
        <div className="fixed bottom-[68px] left-0 right-0 z-30 px-4 sm:bottom-4">
          <Link
            to="/cart"
            className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-ink-950 shadow-glow transition hover:bg-brand-400"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-950 px-1 text-[11px] font-extrabold text-brand-300">
                {count}
              </span>
              Ver mi pedido
            </span>
            <span className="flex items-center gap-2 text-sm font-extrabold">
              {formatCOP(subtotal)}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      )}

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-ink-950/95 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-16 py-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isActive ? 'text-brand-400' : 'text-white/40'
              }`
            }
          >
            <Store className="h-4 w-4" />
            Menú
          </NavLink>
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isActive ? 'text-brand-400' : 'text-white/40'
              }`
            }
          >
            <ShoppingCart className="h-4 w-4" />
            Carrito
          </NavLink>
        </div>
      </nav>

      <footer className="mt-4 border-t border-white/10 bg-ink-950 px-4 py-6 text-center">
        <Logo className="mx-auto h-9 w-auto" />
        <p className="mt-2 text-[11px] text-white/35">
          Elotes asados, hamburguesas, arepas rellenas y papas · Bogotá
        </p>
        <p className="mt-2 text-[10px] text-white/25">ENTUSADOS</p>
      </footer>
    </div>
  )
}

export function ClientLayout() {
  return (
    <ClientLocationProvider>
      <ClientShell />
    </ClientLocationProvider>
  )
}
