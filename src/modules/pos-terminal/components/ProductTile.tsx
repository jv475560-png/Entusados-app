import type { Product } from '@/shared/types'
import { formatCOP } from '@/shared/lib/format'
import { ProductImage } from '@/shared/ui/Brand'

export function ProductTile({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:border-brand-400/60 hover:bg-white/10 active:scale-[0.99]"
    >
      <ProductImage
        product={product}
        className="aspect-square w-full"
        emojiClassName="text-4xl"
      />
      <div className="flex flex-1 flex-col justify-between gap-1 p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-white">
          {product.name}
        </p>
        <p className="text-sm font-extrabold text-brand-300">{formatCOP(product.price)}</p>
      </div>
    </button>
  )
}
