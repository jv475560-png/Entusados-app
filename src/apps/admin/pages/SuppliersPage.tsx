import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Plus, Trash2, Truck, Wallet } from 'lucide-react'
import { useSuppliers } from '@/modules/suppliers/hooks/useSuppliers'
import { useInventory } from '@/modules/inventory/hooks/useInventory'
import { formatCOP, formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Select, Textarea } from '@/shared/ui/Input'
import { Badge } from '@/shared/ui/Badge'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

interface Line {
  key: string
  ingredientId: string
  qty: string
  unitCost: string
}

export function SuppliersPage() {
  const { suppliers, supplierOrders, createSupplierOrder } = useSuppliers()
  const { ingredients } = useInventory()

  const [supplierId, setSupplierId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { key: 'line-1', ingredientId: '', qty: '1', unitCost: '' },
  ])
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!supplierId && suppliers[0]) setSupplierId(suppliers[0].id)
  }, [supplierId, suppliers])

  useEffect(() => {
    if (!lines[0]?.ingredientId && ingredients[0]) {
      setLines((current) =>
        current.map((line, index) =>
          index === 0
            ? {
                ...line,
                ingredientId: ingredients[0].id,
                unitCost: String(ingredients[0].cost_per_unit),
              }
            : line,
        ),
      )
    }
  }, [ingredients, lines])

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.qty) || 0
        const cost = Number(line.unitCost) || 0
        return sum + qty * cost
      }, 0),
    [lines],
  )

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? 'Proveedor'

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  const submit = async () => {
    if (!supplierId) return
    const validLines = lines
      .filter((line) => line.ingredientId && Number(line.qty) > 0)
      .map((line) => ({
        ingredientId: line.ingredientId,
        qty: Number(line.qty),
        unitCost: Number(line.unitCost) || 0,
      }))

    if (validLines.length === 0) {
      setFeedback('Agrega al menos un insumo con cantidad.')
      return
    }

    await createSupplierOrder({
      supplierId,
      expectedAt: expectedAt || null,
      notes: notes.trim() || undefined,
      lines: validLines,
    })

    setLines([{ key: `line-${Date.now()}`, ingredientId: '', qty: '1', unitCost: '' }])
    setNotes('')
    setExpectedAt('')
    setFeedback('Orden de compra creada como borrador.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Abastecimiento"
        title="PROVEEDORES"
        description="Programa compras anticipadas de insumos según lead time y stock crítico."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Proveedores activos" value={suppliers.length} icon={Truck} tone="blue" />
        <StatCard
          label="Órdenes de compra"
          value={supplierOrders.length}
          icon={CalendarClock}
          tone="brand"
        />
        <StatCard
          label="Compras abiertas"
          value={formatCOP(
            supplierOrders
              .filter((order) => order.status !== 'received' && order.status !== 'cancelled')
              .reduce((sum, order) => sum + order.total, 0),
          )}
          icon={Wallet}
          tone="green"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900">{supplier.name}</p>
                  <p className="text-xs text-ink-400">
                    {supplier.contact_name ?? 'Sin contacto'} · {supplier.phone ?? '—'}
                  </p>
                </div>
                <Badge variant="success">{supplier.lead_time_days} días</Badge>
              </div>
              {supplier.notes && (
                <p className="mt-2 rounded-lg bg-ink-50 px-2 py-1 text-[11px] text-ink-500">
                  {supplier.notes}
                </p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-wide text-ink-400">
                Lead time de reposición
              </p>
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink-200 p-6 text-center text-xs text-ink-400">
              Sin proveedores cargados.
            </p>
          )}
        </div>

        <SectionCard title="Nueva orden anticipada" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proveedor">
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Entrega esperada">
              <Input
                type="date"
                value={expectedAt}
                onChange={(event) => setExpectedAt(event.target.value)}
              />
            </Field>
          </div>

          <div className="mt-3 space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6">
                  <Field label="Insumo">
                    <Select
                      value={line.ingredientId}
                      onChange={(event) => {
                        const ingredient = ingredients.find((i) => i.id === event.target.value)
                        updateLine(line.key, {
                          ingredientId: event.target.value,
                          unitCost: ingredient ? String(ingredient.cost_per_unit) : line.unitCost,
                        })
                      }}
                    >
                      <option value="">Selecciona…</option>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Cantidad">
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(event) => updateLine(line.key, { qty: event.target.value })}
                      className="h-9 text-xs"
                    />
                  </Field>
                </div>
                <div className="col-span-3">
                  <Field label="Costo unit.">
                    <Input
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(event) => updateLine(line.key, { unitCost: event.target.value })}
                      className="h-9 text-xs"
                    />
                  </Field>
                </div>
                <button
                  onClick={() =>
                    setLines((current) =>
                      current.length > 1 ? current.filter((l) => l.key !== line.key) : current,
                    )
                  }
                  className="col-span-1 mb-0.5 flex h-9 items-center justify-center rounded-lg text-ink-400 hover:bg-accent-50 hover:text-accent-600"
                  aria-label="Quitar línea"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { key: `line-${Date.now()}`, ingredientId: '', qty: '1', unitCost: '' },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar insumo
            </Button>
            <p className="text-sm font-bold text-ink-900">Total: {formatCOP(total)}</p>
          </div>

          <Field label="Notas" className="mt-3">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Condiciones de entrega, empaque, etc."
              className="min-h-16"
            />
          </Field>

          {feedback && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              {feedback}
            </p>
          )}

          <Button className="mt-3" onClick={() => void submit()}>
            Crear orden de compra
          </Button>
        </SectionCard>
      </div>

      <SectionCard className="mt-4" title="Órdenes de compra recientes">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                <th className="px-1 pb-2 font-semibold">Proveedor</th>
                <th className="px-1 pb-2 font-semibold">Creada</th>
                <th className="px-1 pb-2 font-semibold">Esperada</th>
                <th className="px-1 pb-2 font-semibold">Estado</th>
                <th className="px-1 pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {supplierOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-1 py-2.5 text-xs font-semibold text-ink-900">
                    {supplierName(order.supplier_id)}
                  </td>
                  <td className="px-1 py-2.5 text-xs text-ink-500">
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-1 py-2.5 text-xs text-ink-500">{order.expected_at ?? '—'}</td>
                  <td className="px-1 py-2.5">
                    <Badge
                      variant={
                        order.status === 'received'
                          ? 'success'
                          : order.status === 'sent'
                            ? 'info'
                            : order.status === 'cancelled'
                              ? 'danger'
                              : 'warning'
                      }
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs font-bold">
                    {formatCOP(order.total)}
                  </td>
                </tr>
              ))}
              {supplierOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-ink-400">
                    Aún no hay órdenes de compra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
