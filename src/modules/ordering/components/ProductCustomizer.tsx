import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { Product, Topping } from '@/shared/types'
import { formatCOP } from '@/shared/lib/format'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { ProductImage } from '@/shared/ui/Brand'
import { useCartStore } from '../store/cartStore'
import { getProductToppings } from '../toppings'

export function ProductCustomizer({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setSelected([])
    }
  }, [open, product?.id])

  const options = useMemo<Topping[]>(
    () => (product ? getProductToppings(product) : []),
    [product],
  )
  const toppings = useMemo<Topping[]>(
    () => options.filter((topping) => selected.includes(topping.id)),
    [options, selected],
  )

  const unitPrice = (product?.price ?? 0) + toppings.reduce((sum, t) => sum + t.price, 0)
  const total = unitPrice * quantity
  const showToppings = options.length > 0

  if (!product) return null

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product.name}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-1">
            <button
              className="p-2 text-ink-500 hover:text-ink-900"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Disminuir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{quantity}</span>
            <button
              className="p-2 text-ink-500 hover:text-ink-900"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1 bg-emerald-500 text-ink-950 hover:bg-emerald-400"
            onClick={() => {
              addItem(product, quantity, toppings, '')
              onClose()
            }}
          >
            Agregar · {formatCOP(total)}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm leading-relaxed text-ink-600">{product.description}</p>

      <ProductImage
        product={product}
        className="mb-4 aspect-[16/9] w-full rounded-2xl"
        emojiClassName="text-6xl"
      />

      {showToppings && (
        <div>
          <p className="label-overline">Personaliza</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map((topping) => {
              const active = selected.includes(topping.id)
              return (
                <button
                  key={topping.id}
                  onClick={() => toggle(topping.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'border-brand-400/60 bg-brand-500/15 text-ink-900 ring-1 ring-brand-400/40'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block h-4 w-4 rounded border ${
                        active ? 'border-brand-600 bg-brand-500' : 'border-ink-300 bg-white'
                      }`}
                    />
                    {topping.name}
                  </span>
                  <span className="text-xs font-semibold text-ink-500">
                    {topping.price > 0 ? `+${formatCOP(topping.price)}` : 'Gratis'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
