import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { Product } from '@/shared/types'
import { formatCOP } from '@/shared/lib/format'
import { ProductImage } from '@/shared/ui/Brand'

export function ProductCard({
  product,
  onAdd,
  onOpen,
  tag,
  displayName,
}: {
  product: Product
  onAdd: (product: Product) => void
  onOpen: (product: Product) => void
  tag?: string
  displayName?: string
}) {
  const name = displayName ?? product.name
  const [added, setAdded] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const quickAdd = () => {
    onAdd(product)
    setAdded(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setAdded(false), 900)
  }

  return (
    <article
      onClick={() => onOpen(product)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(product)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver ${name}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className="relative overflow-hidden">
        <ProductImage
          product={product}
          className="aspect-square w-full transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent" />

        {tag && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-ink-950 shadow-lg">
            {tag}
          </span>
        )}

        <button
          onClick={(event) => {
            event.stopPropagation()
            quickAdd()
          }}
          aria-label={`Agregar ${name} al carrito`}
          className="absolute bottom-2 right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_20px_rgba(2,6,23,.45)] transition hover:bg-brand-400 active:scale-90"
        >
          {added ? <Check className="h-5 w-5 stroke-[3]" /> : <Plus className="h-5 w-5 stroke-[3]" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-ink-900">
          {name}
        </h3>
        <p className="mt-1.5 text-base font-extrabold text-brand-400">
          {formatCOP(product.price)}
        </p>
      </div>
    </article>
  )
}
