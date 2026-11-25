import type { UserRole } from '@/shared/types'

export type ShiftType = 'OPENING' | 'CLOSING'

export interface ChecklistItem {
  id: string
  label: string
  hint?: string
  critical?: boolean
}

export interface ShiftChecklist {
  id: string
  shift_type: ShiftType
  user_id: string | null
  user_name: string
  user_role: UserRole | null
  items_checked: string[]
  items_total: number
  notes: string | null
  created_at: string
}

export const OPENING_ITEMS: ChecklistItem[] = [
  {
    id: 'battery',
    label: 'Cargar y verificar batería de terminales POS / datáfonos / móviles',
    hint: 'Equipos al 100% o conectados a corriente.',
    critical: true,
  },
  {
    id: 'fridges',
    label: 'Alistar e inspeccionar neveras (temperatura e insumos del día)',
    hint: 'Salsas, queso, carnes y chorizos en rango seguro.',
    critical: true,
  },
  {
    id: 'potato-station',
    label: 'Alistamiento de estación de papas y freidoras',
    hint: 'Aceite limpio y temperatura óptima.',
  },
  {
    id: 'corn-station',
    label: 'Alistamiento de estación de maíces y elotes',
    hint: 'Asador/plancha encendida y salsas en dispensadores.',
  },
  {
    id: 'packaging',
    label: 'Verificar stock de empaques, servilletas y bolsas para domicilio',
    critical: true,
  },
  {
    id: 'cash',
    label: 'Ingresar la base inicial de efectivo en caja',
    hint: 'Registra el monto en el módulo de caja.',
  },
]

export const CLOSING_ITEMS: ChecklistItem[] = [
  {
    id: 'leftovers',
    label: 'Conteo rápido de insumos sobrantes críticos',
    hint: 'Carnes, maíces y queso.',
  },
  {
    id: 'fridge-clean',
    label: 'Limpieza y desinfección de neveras y contenedores',
    critical: true,
  },
  {
    id: 'fryer-clean',
    label: 'Lavado y filtrado de freidoras / estación de papas',
    critical: true,
  },
  {
    id: 'power-off',
    label: 'Apagado seguro de planchas, asadores y equipos eléctricos',
    critical: true,
  },
  {
    id: 'charge',
    label: 'Poner a cargar baterías de terminales y dispositivos',
  },
  {
    id: 'cleaning',
    label: 'Limpieza general del área de preparación y empaque',
  },
]

export function checklistItems(shiftType: ShiftType): ChecklistItem[] {
  return shiftType === 'OPENING' ? OPENING_ITEMS : CLOSING_ITEMS
}

export function checklistProgress(checklist: Pick<ShiftChecklist, 'items_checked' | 'items_total'>) {
  if (checklist.items_total <= 0) return 0
  return Math.min(100, Math.round((checklist.items_checked.length / checklist.items_total) * 100))
}
