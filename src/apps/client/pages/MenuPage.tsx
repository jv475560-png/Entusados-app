import { useMemo, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import type { Product, ProductCategory, Promotion } from '@/shared/types'
import { useProducts } from '@/modules/ordering/hooks/useProducts'
import { usePromotions } from '@/modules/ordering/hooks/usePromotions'
import { ProductCard } from '@/modules/ordering/components/ProductCard'
import { ProductCustomizer } from '@/modules/ordering/components/ProductCustomizer'
import { useCartStore } from '@/modules/ordering/store/cartStore'
import { DeliveryRouteBanner } from '@/modules/delivery/components/DeliveryRouteBanner'
import { Skeleton, EmptyState } from '@/shared/ui/Feedback'
import { Logo } from '@/shared/ui/Brand'
import { Button } from '@/shared/ui/Button'
import { formatCOP } from '@/shared/lib/format'

const SECTIONS: Array<{ key: ProductCategory; label: string; emoji: string }> = [
  { key: 'elotes', label: 'Elotes', emoji: '🌽' },
  { key: 'hamburguesas', label: 'Hamburguesas', emoji: '🍔' },
  { key: 'arepas', label: 'Arepas rellenas', emoji: '🫓' },
  { key: 'espiropapas', label: 'Espiropapas', emoji: '🥔' },
  { key: 'bebidas', label: 'Bebidas', emoji: '🥤' },
]

const CATEGORY_ORDER: Partial<Record<ProductCategory, string[]>> = {
  elotes: ['elote-queso', 'elote-doritos', 'elote-takis', 'elote-mango'],
  hamburguesas: [
    'hamburguesa-crunch',
    'hamburguesa-clasica',
    'jalapeno-crunch',
    'hamburguesa-criolla',
  ],
  arepas: ['arepa-carne', 'arepa-pollo', 'arepa-mixta', 'arepa-queso'],
  espiropapas: ['espiropapa'],
}

const CATEGORY_PICK: Partial<Record<ProductCategory, { slug: string; tag: string }>> = {
  elotes: { slug: 'elote-queso', tag: 'Más vendido' },
  hamburguesas: { slug: 'hamburguesa-crunch', tag: 'Más vendida' },
  arepas: { slug: 'arepa-carne', tag: 'Más vendida' },
  espiropapas: { slug: 'espiropapa', tag: 'Más crocante' },
}

const DISPLAY_NAMES: Record<string, string> = {
  'hamburguesa-crunch': 'Hamburguesa Crunch (tocineta)',
  'jalapeno-crunch': 'Jalapeño Crunch (jalapeños y tocineta)',
  'hamburguesa-criolla': 'Hamburguesa Criolla (huevo frito)',
}

const PROMO_GRADIENTS = [
  'from-brand-600 via-brand-500 to-accent-500',
  'from-emerald-600 via-emerald-500 to-brand-500',
  'from-accent-600 via-accent-500 to-brand-500',
  'from-sky-600 via-sky-500 to-emerald-500',
]

function promoProduct(promotion: Promotion): Product {
  return {
    id: `promo-${promotion.id}`,
    name: promotion.title,
    slug: `promo-${promotion.id}`,
    description: promotion.description,
    category: 'hamburguesas',
    price: promotion.price,
    image_url: null,
    prep_minutes: 12,
    is_active: true,
    is_featured: true,
  }
}

export function MenuPage() {
  const { products, loading } = useProducts()
  const { activePromotions } = usePromotions()
  const addItem = useCartStore((state) => state.addItem)
  const fulfillment = useCartStore((state) => state.fulfillment)
  const [selected, setSelected] = useState<Product | null>(null)

  const isDelivery = fulfillment === 'delivery'

  const grouped = useMemo(
    () =>
      SECTIONS.map((section) => {
        const order = CATEGORY_ORDER[section.key] ?? []
        return {
          ...section,
          items: products
            .filter((product) => product.category === section.key)
            .sort((a, b) => {
              const ai = order.indexOf(a.slug)
              const bi = order.indexOf(b.slug)
              if (ai === -1 && bi === -1) return 0
              if (ai === -1) return 1
              if (bi === -1) return -1
              return ai - bi
            }),
        }
      }).filter((section) => section.items.length > 0),
    [products],
  )

  const orderPromo = (promotion: Promotion) => {
    addItem(promoProduct(promotion), 1, [], `Combo: ${promotion.description}`)
  }

  const quickAdd = (product: Product) => {
    addItem(product, 1, [], '')
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-950 px-3 py-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,.22),transparent_65%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <Logo className="h-auto w-[150px] shrink-0 mix-blend-screen sm:w-[190px]" />
          <div className="min-w-0">
            <p className="font-display text-xl leading-[0.95] text-white sm:text-2xl">
              ARMA TU PEDIDO <span className="text-brand-400">FÁCIL</span>
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">
              Elige, personaliza y pide en segundos
            </p>
          </div>
        </div>
      </section>

      {activePromotions.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="label-overline">Promos de la noche</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
              Desliza
            </span>
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {activePromotions.map((promo, index) => {
              const blocked = isDelivery && promo.only_at_store
              return (
                <article
                  key={promo.id}
                  className={`relative w-[86%] shrink-0 snap-center overflow-hidden rounded-3xl p-4 text-left text-white shadow-glow sm:w-[46%] ${
                    promo.image_url
                      ? 'min-h-[210px] bg-ink-950'
                      : `bg-gradient-to-br ${PROMO_GRADIENTS[index % PROMO_GRADIENTS.length]}`
                  }`}
                  style={
                    promo.image_url
                      ? {
                          backgroundImage: `url(${promo.image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'right center',
                        }
                      : undefined
                  }
                >
                  {promo.image_url && (
                    <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent" />
                  )}
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[230px]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                          {promo.badge}
                        </p>
                        <p className="mt-1 text-lg font-extrabold leading-tight">{promo.title}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/80">
                          {promo.description}
                        </p>
                      </div>
                      {!promo.image_url && (
                        <span className="text-5xl drop-shadow-lg">{promo.emoji}</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-black/30 px-2.5 py-1 text-sm font-extrabold text-white backdrop-blur">
                        {formatCOP(promo.price)}
                      </span>
                      <Button
                        size="sm"
                        className="bg-ink-950 text-white hover:bg-ink-900"
                        disabled={blocked}
                        onClick={() => orderPromo(promo)}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {blocked ? 'Solo punto físico' : promo.cta_label || 'Pedir ahora'}
                      </Button>
                    </div>

                    {promo.only_at_store && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        Solo en punto físico · no aplica para domicilio
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <DeliveryRouteBanner />

      {loading ? (
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <Skeleton className="mb-2 h-5 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-64 w-48 shrink-0" />
                <Skeleton className="h-64 w-48 shrink-0" />
                <Skeleton className="h-64 w-48 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="Menú en actualización"
          description="Vuelve en un momento para ver los productos disponibles."
        />
      ) : (
        grouped.map((section) => (
          <section key={section.key}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-2xl text-white">
                <span className="text-xl">{section.emoji}</span>
                {section.label}
              </h2>
              <span className="text-[11px] font-semibold text-white/35">
                {section.items.length} opciones
              </span>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {section.items.map((product) => (
                <div
                  key={product.id}
                  className="w-[47%] shrink-0 snap-start sm:w-[32%] lg:w-[24%]"
                >
                  <ProductCard
                    product={product}
                    onAdd={quickAdd}
                    onOpen={setSelected}
                    tag={
                      CATEGORY_PICK[section.key]?.slug === product.slug
                        ? CATEGORY_PICK[section.key]?.tag
                        : undefined
                    }
                    displayName={DISPLAY_NAMES[product.slug]}
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <ProductCustomizer
        product={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
