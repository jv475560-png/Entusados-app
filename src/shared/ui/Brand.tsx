import { useState } from 'react'
import { cn } from '@/shared/lib/format'
import type { Product, ProductCategory } from '@/shared/types'

const CATEGORY_EMOJI: Record<ProductCategory, string> = {
  elotes: '🌽',
  espiropapas: '🥔',
  hamburguesas: '🍔',
  arepas: '🫓',
  bebidas: '🥤',
  adiciones: '🧀',
}

export function ProductImage({
  product,
  className,
  emojiClassName,
}: {
  product: Pick<Product, 'image_url' | 'category' | 'name'>
  className?: string
  emojiClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!product.image_url || failed) {
    return (
      <div
        role="img"
        aria-label={product.name}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-ink-800 via-ink-900 to-brand-900/50',
          className,
        )}
      >
        <span className={cn('text-5xl drop-shadow-sm', emojiClassName)}>
          {CATEGORY_EMOJI[product.category]}
        </span>
      </div>
    )
  }

  return (
    <img
      src={product.image_url}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [svgFailed, setSvgFailed] = useState(false)

  if (!failed) {
    return (
      <img
        src="/assets/logo-entusados.jpeg"
        alt="ENTUSADOS"
        onError={() => setFailed(true)}
        className={cn('rounded-lg object-contain', className)}
      />
    )
  }

  if (!svgFailed) {
    return (
      <img
        src="/assets/logo-entusados.svg"
        alt="ENTUSADOS"
        onError={() => setSvgFailed(true)}
        className={cn('rounded-lg object-contain', className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'font-display text-2xl leading-none tracking-[0.08em]',
        dark ? 'text-ink-900' : 'text-brand-400',
        className,
      )}
    >
      ENTUSADOS
    </span>
  )
}
