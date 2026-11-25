import type { Product, Topping } from '@/shared/types'

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'Todo',
  elotes: 'Elotes',
  espiropapas: 'Espiropapas',
  hamburguesas: 'Hamburguesas',
  arepas: 'Arepas',
  bebidas: 'Bebidas',
  adiciones: 'Adiciones',
}

/** Opciones de personalización específicas de cada producto. */
export function getProductToppings(product: Product): Topping[] {
  if (product.slug === 'elote-queso') {
    return [{ id: 'tajin-extra', name: 'Quiero un toque de Tajín', price: 0 }]
  }

  if (product.slug === 'elote-doritos') {
    return [{ id: 'sin-tajin', name: 'Lo quiero sin Tajín', price: 0 }]
  }

  if (product.slug === 'espiropapa') {
    return [
      { id: 'salsa-tomate', name: 'Salsa de tomate', price: 0 },
      { id: 'salsa-bbq', name: 'Salsa BBQ', price: 0 },
      { id: 'mayonesa', name: 'Mayonesa', price: 0 },
    ]
  }

  if (product.category === 'arepas') {
    return [
      { id: 'sin-mantequilla', name: 'Sin mantequilla', price: 0 },
      {
        id: 'queso-adicional',
        name: 'Queso adicional',
        price: 2000,
        ingredient_id: 'i-queso',
        ingredient_qty: 20,
      },
    ]
  }

  if (product.category === 'hamburguesas') {
    return [
      { id: 'sin-cebolla', name: 'Sin cebolla', price: 0 },
      { id: 'sin-doritos', name: 'Sin Doritos', price: 0 },
      {
        id: 'doble-queso',
        name: 'Doble queso',
        price: 2000,
        ingredient_id: 'i-queso',
        ingredient_qty: 30,
      },
      {
        id: 'doble-carne',
        name: 'Doble carne',
        price: 6000,
        ingredient_id: 'i-carne',
        ingredient_qty: 1,
      },
    ]
  }

  return []
}
