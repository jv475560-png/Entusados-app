import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, PackageCheck, Search, TrendingDown, Wallet } from 'lucide-react'
import { useInventory } from '@/modules/inventory/hooks/useInventory'
import type { Ingredient } from '@/shared/types'
import { formatCOP, formatNumber } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Input } from '@/shared/ui/Input'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

function StockInput({
  ingredient,
  onCommit,
}: {
  ingredient: Ingredient
  onCommit: (quantity: number) => void
}) {
  const [value, setValue] = useState(String(ingredient.stock_qty))

  useEffect(() => {
    setValue(String(ingredient.stock_qty))
  }, [ingredient.stock_qty])

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={value}
        min={0}
        step={ingredient.unit === 'unit' ? 1 : 10}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const parsed = Number(value)
          if (Number.isFinite(parsed) && parsed !== ingredient.stock_qty) onCommit(parsed)
        }}
        className="h-8 w-24 text-xs"
      />
      <span className="text-[10px] uppercase text-ink-400">{ingredient.unit}</span>
    </div>
  )
}

export function InventoryPage() {
  const { ingredients, lowStock, setStock, adjustStock, loading } = useInventory()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return ingredients.filter((ingredient) =>
      !term ? true : ingredient.name.toLowerCase().includes(term),
    )
  }, [ingredients, query])

  const inventoryValue = ingredients.reduce(
    (sum, ingredient) => sum + ingredient.stock_qty * ingredient.cost_per_unit,
    0,
  )

  return (
    <div>
      <PageHeader
        eyebrow="Inventario inteligente"
        title="INSUMOS Y RECETAS"
        description="Cada venta descuenta automáticamente los ingredientes de la receta (BOM). Ajusta stock y revisa alertas críticas."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Insumos activos" value={ingredients.length} icon={Boxes} tone="ink" />
        <StatCard
          label="Stock crítico"
          value={lowStock.length}
          hint="En o por debajo del mínimo"
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Valor del inventario"
          value={formatCOP(inventoryValue)}
          hint="Stock × costo unitario"
          icon={Wallet}
          tone="blue"
        />
        <StatCard
          label="Descuento automático"
          value="Activo"
          hint="Trigger PostgreSQL por order_item"
          icon={PackageCheck}
          tone="green"
        />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-accent-200 bg-accent-50 p-3 text-xs text-accent-800">
          <TrendingDown className="h-4 w-4" />
          <strong>Alerta de reposición:</strong>
          <span>{lowStock.map((ingredient) => ingredient.name).join(' · ')}</span>
        </div>
      )}

      <SectionCard
        className="mt-4"
        title={`Insumos · ${filtered.length}`}
        action={
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar insumo…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-xs text-ink-400">Cargando inventario…</p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                  <th className="px-1 pb-2 font-semibold">Insumo</th>
                  <th className="px-1 pb-2 font-semibold">Stock actual</th>
                  <th className="px-1 pb-2 font-semibold">Mínimo</th>
                  <th className="px-1 pb-2 font-semibold">Ajuste rápido</th>
                  <th className="px-1 pb-2 font-semibold">Costo unit.</th>
                  <th className="px-1 pb-2 text-right font-semibold">Valor</th>
                  <th className="px-1 pb-2 text-right font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((ingredient) => {
                  const low = ingredient.stock_qty <= ingredient.min_stock
                  const step = ingredient.unit === 'unit' ? 1 : 100
                  return (
                    <tr key={ingredient.id} className={low ? 'bg-accent-50/40' : undefined}>
                      <td className="px-1 py-2.5">
                        <p className="text-xs font-bold text-ink-900">{ingredient.name}</p>
                        <p className="text-[10px] text-ink-400">
                          {ingredient.supplier_id ? 'Proveedor asignado' : 'Sin proveedor'}
                        </p>
                      </td>
                      <td className="px-1 py-2.5">
                        <StockInput
                          ingredient={ingredient}
                          onCommit={(quantity) => void setStock(ingredient.id, quantity)}
                        />
                      </td>
                      <td className="px-1 py-2.5 text-xs text-ink-500">
                        {formatNumber(ingredient.min_stock)} {ingredient.unit}
                      </td>
                      <td className="px-1 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => void adjustStock(ingredient.id, -step)}
                            className="h-7 w-7 rounded-lg border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-100"
                            aria-label={`Restar a ${ingredient.name}`}
                          >
                            −
                          </button>
                          <button
                            onClick={() => void adjustStock(ingredient.id, step)}
                            className="h-7 w-7 rounded-lg border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-100"
                            aria-label={`Sumar a ${ingredient.name}`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-2.5 text-xs text-ink-500">
                        {formatCOP(ingredient.cost_per_unit)}
                      </td>
                      <td className="px-1 py-2.5 text-right text-xs font-semibold">
                        {formatCOP(ingredient.stock_qty * ingredient.cost_per_unit)}
                      </td>
                      <td className="px-1 py-2.5 text-right">
                        {low ? (
                          <Badge variant="danger">Crítico</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                      Sin insumos para ese filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <p className="mt-3 rounded-xl bg-ink-100/70 px-3 py-2 text-[11px] text-ink-500">
        BOM: al insertar una línea en <code className="text-ink-700">order_items</code>, el trigger
        descuenta <code className="text-ink-700">recipes_bom.qty × cantidad</code> de cada insumo y
        genera una alerta cuando el stock cae bajo el mínimo. Las adiciones también pueden consumir
        insumos si envían <code className="text-ink-700">ingredient_id</code> en el JSON de toppings.
      </p>
    </div>
  )
}
