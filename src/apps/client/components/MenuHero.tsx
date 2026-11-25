import { Flame, Sparkles } from 'lucide-react'
import { Logo } from '@/shared/ui/Brand'
import { useCartStore } from '@/modules/ordering/store/cartStore'

/**
 * Héroe original de la tienda. Se conserva para volver a activarlo más adelante.
 * No está renderizado en la página principal actualmente.
 */
export function MenuHero() {
  const isDelivery = useCartStore((state) => state.fulfillment) === 'delivery'

  return (
    <section className="bg-art relative overflow-hidden rounded-3xl border border-white/10 p-5 text-white sm:p-7">
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <Logo className="h-11 w-auto rounded-xl" />
          <span className="rounded-full border border-brand-400/30 bg-brand-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300">
            Antójate
          </span>
        </div>
        <h1 className="mt-3 max-w-md font-display text-4xl leading-[0.95] text-white drop-shadow sm:text-5xl">
          ELOTES ASADOS, <span className="text-brand-400">HAMBURGUESAS</span> Y MÁS
        </h1>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/65 sm:text-sm">
          {isDelivery
            ? 'Quédate en casa y pide a domicilio. Paga con Bre-B o Nequi.'
            : 'Estás en el punto físico. Pide desde tu mesa o para llevar y el equipo te ubica en caja.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-white/75">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            Recetas propias
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur">
            <Flame className="h-3.5 w-3.5 text-accent-400" />
            Parrilla encendida
          </span>
        </div>
      </div>
    </section>
  )
}
