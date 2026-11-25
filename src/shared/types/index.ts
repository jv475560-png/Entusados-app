export * from './database'

export const BRAND = {
  name: 'ENTUSADOS',
  tagline: 'Elotes asados · Bogotá',
  currency: 'COP',
} as const

export const ROLES: Record<string, { label: string; home: string }> = {
  customer: { label: 'Cliente', home: '/' },
  cashier: { label: 'Cajero / POS', home: '/admin/pos' },
  kitchen: { label: 'Cocina / KDS', home: '/admin/kds' },
  admin: { label: 'Administrador', home: '/admin' },
}
