import { useCallback, useMemo, useState } from 'react'
import type { Product } from '@/shared/types'

export interface PosLine {
  key: string
  product: Product
  quantity: number
}

export function usePosCart() {
  const [lines, setLines] = useState<PosLine[]>([])

  const add = useCallback((product: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      if (existing) {
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [...current, { key: product.id, product, quantity: 1 }]
    })
  }, [])

  const decrement = useCallback((key: string) => {
    setLines((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0),
    )
  }, [])

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [lines],
  )

  return { lines, add, decrement, remove, clear, count, subtotal }
}
