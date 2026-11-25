import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Plus,
  ReceiptText,
  Wallet,
} from 'lucide-react'
import { useCashClosure } from '@/modules/accounting/hooks/useCashClosure'
import { useOrders } from '@/modules/ordering/hooks/useOrders'
import { useShiftChecklists } from '@/modules/shift-checklist/hooks/useShiftChecklists'
import { ClosingChecklistModal } from '@/modules/shift-checklist/components/ChecklistModals'
import { formatCOP, formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Select } from '@/shared/ui/Input'
import { Badge } from '@/shared/ui/Badge'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

export function CashClosurePage() {
  const {
    closures,
    activeClosure,
    activeExpenses,
    openClosure,
    addExpense,
    closeClosure,
  } = useCashClosure()
  const { orders } = useOrders()
  const { closingComplete, lastClosing } = useShiftChecklists()

  const [openClosingChecklist, setOpenClosingChecklist] = useState(false)
  const [openingCash, setOpeningCash] = useState('150000')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('operativo')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const live = useMemo(() => {
    if (!activeClosure) {
      return { cash: 0, digital: 0, expenses: 0, expected: 0, orderCount: 0 }
    }
    const since = new Date(activeClosure.opened_at).getTime()
    const inRange = orders.filter(
      (order) =>
        order.payment_status === 'confirmed' && new Date(order.created_at).getTime() >= since,
    )
    const cash = inRange
      .filter((order) => order.payment_method === 'cash')
      .reduce((sum, order) => sum + order.total, 0)
    const digital = inRange
      .filter((order) => order.payment_method !== 'cash')
      .reduce((sum, order) => sum + order.total, 0)
    const expenses = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    return {
      cash,
      digital,
      expenses,
      expected: activeClosure.opening_cash + cash - expenses,
      orderCount: inRange.length,
    }
  }, [activeClosure, activeExpenses, orders])

  const difference = Number(closingCash || 0) - live.expected

  const submitExpense = async () => {
    if (!activeClosure) return
    const value = Number(amount)
    if (!concept.trim() || !Number.isFinite(value) || value <= 0) {
      setFeedback('Describe el gasto y un monto válido.')
      return
    }
    await addExpense(activeClosure.id, concept.trim(), value, category)
    setConcept('')
    setAmount('')
    setFeedback('Gasto registrado en el libro diario.')
  }

  const submitClose = async () => {
    if (!activeClosure) return
    const value = Number(closingCash)
    if (!Number.isFinite(value) || value < 0) {
      setFeedback('Ingresa el efectivo contado al cierre.')
      return
    }
    await closeClosure(activeClosure.id, value, notes.trim() || undefined)
    setFeedback('Turno cerrado y arqueo calculado.')
    setClosingCash('')
    setNotes('')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contabilidad"
        title="CAJA Y ARQUEOS"
        description="Apertura y cierre de turno, gastos menores y utilidad neta. Los ingresos digitales se toman de los pedidos con pago confirmado."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Efectivo inicial"
          value={formatCOP(activeClosure?.opening_cash ?? 0)}
          hint={activeClosure ? `Turno desde ${formatDateTime(activeClosure.opened_at)}` : 'Sin turno abierto'}
          icon={Wallet}
          tone="ink"
        />
        <StatCard
          label="Ingresos efectivo"
          value={formatCOP(live.cash)}
          hint={`${live.orderCount} pedidos confirmados`}
          icon={ArrowUpRight}
          tone="green"
        />
        <StatCard
          label="Ingresos digitales"
          value={formatCOP(live.digital)}
          hint="Bre-B / Nequi / bancos"
          icon={ArrowUpRight}
          tone="blue"
        />
        <StatCard
          label="Gastos del turno"
          value={formatCOP(live.expenses)}
          hint="Libro diario de gastos"
          icon={ArrowDownRight}
          tone="red"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {activeClosure ? (
            <>
              <SectionCard
                title="Arqueo del turno activo"
                action={<Badge variant="warning">Abierto</Badge>}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-ink-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      Efectivo esperado
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink-900">
                      {formatCOP(live.expected)}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Inicial {formatCOP(activeClosure.opening_cash)} + efectivo{" "}
                      {formatCOP(live.cash)} − gastos {formatCOP(live.expenses)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ink-900 p-3 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brand-300">
                      Utilidad neta estimada
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-brand-300">
                      {formatCOP(live.cash + live.digital - live.expenses)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/50">
                      Efectivo + digital − gastos del turno
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-dashed border-ink-200 pt-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-50 p-3">
                    <div className="flex items-center gap-2">
                      {closingComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ClipboardCheck className="h-5 w-5 text-brand-500" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-ink-800">
                          Checklist de cierre{' '}
                          {closingComplete ? 'completado' : 'pendiente'}
                        </p>
                        <p className="text-[11px] text-ink-400">
                          {closingComplete
                            ? `Registrado ${lastClosing ? formatDateTime(lastClosing.created_at) : ''} · ${lastClosing?.user_name ?? ''}`
                            : 'Limpieza y apagado obligatorios antes del arqueo.'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={closingComplete ? 'outline' : 'secondary'}
                      onClick={() => setOpenClosingChecklist(true)}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {closingComplete ? 'Ver checklist' : 'Completar checklist'}
                    </Button>
                  </div>

                  <p className="text-xs font-bold text-ink-800">Cerrar turno</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Field label="Efectivo contado (COP)">
                      <Input
                        type="number"
                        value={closingCash}
                        onChange={(event) => setClosingCash(event.target.value)}
                        placeholder={String(live.expected)}
                      />
                    </Field>
                    <Field label="Notas del arqueo">
                      <Input
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Faltante, sobrante, observaciones…"
                      />
                    </Field>
                  </div>
                  {closingCash !== '' && (
                    <p
                      className={`mt-2 text-xs font-bold ${
                        Math.abs(difference) < 1 ? 'text-emerald-600' : 'text-accent-600'
                      }`}
                    >
                      Diferencia: {formatCOP(difference)}{" "}
                      {Math.abs(difference) < 1
                        ? '(cuadra)'
                        : difference > 0
                          ? '(sobrante)'
                          : '(faltante)'}
                    </p>
                  )}
                  <Button
                    className="mt-3"
                    disabled={!closingComplete}
                    onClick={() => void submitClose()}
                  >
                    <Lock className="h-4 w-4" />
                    Cerrar caja y calcular arqueo
                  </Button>
                  {!closingComplete && (
                    <p className="mt-1.5 text-[11px] text-brand-300">
                      Completa el checklist de cierre para habilitar el arqueo.
                    </p>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Libro diario de gastos">
                <div className="grid gap-2 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end">
                  <Field label="Concepto">
                    <Input
                      value={concept}
                      onChange={(event) => setConcept(event.target.value)}
                      placeholder="Ej: domicilio, hielo, aseo…"
                    />
                  </Field>
                  <Field label="Monto">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Categoría">
                    <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                      <option value="operativo">Operativo</option>
                      <option value="insumos">Insumos</option>
                      <option value="domicilio">Domicilio</option>
                      <option value="nomina">Nómina</option>
                      <option value="otro">Otro</option>
                    </Select>
                  </Field>
                  <Button variant="secondary" onClick={() => void submitExpense()}>
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>

                <div className="mt-3 divide-y divide-ink-100">
                  {activeExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-semibold text-ink-800">{expense.concept}</p>
                        <p className="text-[10px] uppercase text-ink-400">
                          {expense.category} · {formatDateTime(expense.created_at)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-accent-600">
                        −{formatCOP(expense.amount)}
                      </span>
                    </div>
                  ))}
                  {activeExpenses.length === 0 && (
                    <p className="py-4 text-center text-xs text-ink-400">
                      Sin gastos registrados en este turno.
                    </p>
                  )}
                </div>
                {feedback && (
                  <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                    {feedback}
                  </p>
                )}
              </SectionCard>
            </>
          ) : (
            <SectionCard title="Abrir turno de caja">
              <p className="text-xs text-ink-500">
                No hay un turno abierto. Registra el efectivo inicial para empezar a calcular el
                arqueo.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label="Efectivo inicial (COP)" className="w-48">
                  <Input
                    type="number"
                    value={openingCash}
                    onChange={(event) => setOpeningCash(event.target.value)}
                  />
                </Field>
                <Button
                  onClick={() => {
                    const value = Number(openingCash)
                    if (Number.isFinite(value)) void openClosure(value)
                  }}
                >
                  <Calculator className="h-4 w-4" />
                  Abrir caja
                </Button>
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard title="Cómo se calcula">
            <ul className="space-y-2 text-xs text-ink-500">
              <li>
                <strong className="text-ink-800">Ingresos digitales:</strong> pedidos con pago
                confirmado por Bre-B/Nequi/bancos dentro del turno.
              </li>
              <li>
                <strong className="text-ink-800">Efectivo esperado:</strong> apertura + ventas en
                efectivo − gastos.
              </li>
              <li>
                <strong className="text-ink-800">Diferencia:</strong> efectivo contado − esperado
                (faltante o sobrante).
              </li>
              <li>
                <strong className="text-ink-800">Utilidad neta:</strong> ingresos totales − gastos
                del turno.
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard className="mt-4" title="Historial de cierres">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                <th className="px-1 pb-2 font-semibold">Apertura</th>
                <th className="px-1 pb-2 font-semibold">Cierre</th>
                <th className="px-1 pb-2 text-right font-semibold">Efectivo</th>
                <th className="px-1 pb-2 text-right font-semibold">Digital</th>
                <th className="px-1 pb-2 text-right font-semibold">Gastos</th>
                <th className="px-1 pb-2 text-right font-semibold">Utilidad</th>
                <th className="px-1 pb-2 text-right font-semibold">Diferencia</th>
                <th className="px-1 pb-2 text-right font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {closures.map((closure) => (
                <tr key={closure.id}>
                  <td className="px-1 py-2.5 text-[11px] text-ink-500">
                    {formatDateTime(closure.opened_at)}
                  </td>
                  <td className="px-1 py-2.5 text-[11px] text-ink-500">
                    {closure.closed_at ? formatDateTime(closure.closed_at) : '—'}
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs">
                    {formatCOP(closure.cash_income)}
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs">
                    {formatCOP(closure.digital_income)}
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs">
                    {formatCOP(closure.expenses_total)}
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs font-bold">
                    {formatCOP(closure.net_profit)}
                  </td>
                  <td
                    className={`px-1 py-2.5 text-right text-xs font-bold ${
                      closure.difference === null
                        ? 'text-ink-400'
                        : Math.abs(closure.difference) < 1
                          ? 'text-emerald-600'
                          : 'text-accent-600'
                    }`}
                  >
                    {closure.difference === null ? '—' : formatCOP(closure.difference)}
                  </td>
                  <td className="px-1 py-2.5 text-right">
                    <Badge variant={closure.closed_at ? 'success' : 'warning'}>
                      {closure.closed_at ? 'Cerrado' : 'Abierto'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {closures.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-ink-400">
                    Sin cierres registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="mt-3 flex items-start gap-2 rounded-xl bg-ink-100/70 px-3 py-2 text-[11px] text-ink-500">
        <ReceiptText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        En Supabase el trigger <code>fn_cash_closure_compute</code> recalcula ingresos, gastos,
        diferencia y utilidad al abrir/cerrar el turno, evitando manipulación desde el cliente.
      </p>

      <ClosingChecklistModal
        open={openClosingChecklist}
        onClose={() => setOpenClosingChecklist(false)}
      />
    </div>
  )
}
