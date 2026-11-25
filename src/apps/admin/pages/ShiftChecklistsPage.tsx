import { useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LockKeyhole,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react'
import { useShiftChecklists } from '@/modules/shift-checklist/hooks/useShiftChecklists'
import {
  ClosingChecklistModal,
  OpeningChecklistModal,
} from '@/modules/shift-checklist/components/ChecklistModals'
import { checklistProgress } from '@/modules/shift-checklist/types'
import type { ShiftChecklist } from '@/modules/shift-checklist/types'
import { ROLES } from '@/shared/types'
import { formatDateTime } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

function ProgressBar({ checklist }: { checklist: ShiftChecklist }) {
  const progress = checklistProgress(checklist)
  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span className="text-ink-400">
          {checklist.items_checked.length}/{checklist.items_total}
        </span>
        <span className={progress === 100 ? 'text-emerald-500' : 'text-brand-500'}>
          {progress}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ShiftChecklistsPage() {
  const {
    checklists,
    todayChecklists,
    lastOpening,
    lastClosing,
    shiftOpen,
    openingComplete,
    closingComplete,
  } = useShiftChecklists()
  const [openOpening, setOpenOpening] = useState(false)
  const [openClosing, setOpenClosing] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Operación de turno"
        title="CHECKLISTS DE APERTURA Y CIERRE"
        description="Control obligatorio antes de vender y antes del arqueo. Cada registro guarda fecha, hora, usuario y rol; el POS queda bloqueado hasta completar la apertura."
        actions={
          <Badge variant={shiftOpen ? 'success' : 'danger'}>
            {shiftOpen ? 'Turno abierto' : 'Turno no iniciado'}
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estado del turno"
          value={shiftOpen ? 'Abierto' : 'Cerrado'}
          hint={shiftOpen ? 'POS habilitado' : 'POS bloqueado'}
          icon={shiftOpen ? Sun : Moon}
          tone={shiftOpen ? 'green' : 'red'}
        />
        <StatCard
          label="Checklists hoy"
          value={todayChecklists.length}
          hint="Apertura + cierre"
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Última apertura"
          value={lastOpening ? lastOpening.user_name : '—'}
          hint={lastOpening ? formatDateTime(lastOpening.created_at) : 'Sin registrar'}
          icon={Sun}
          tone="brand"
        />
        <StatCard
          label="Último cierre"
          value={lastClosing ? lastClosing.user_name : '—'}
          hint={lastClosing ? formatDateTime(lastClosing.created_at) : 'Sin registrar'}
          icon={Moon}
          tone="ink"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Apertura de turno"
          action={
            <Badge variant={openingComplete ? 'success' : 'warning'}>
              {openingComplete ? 'Completado' : 'Pendiente'}
            </Badge>
          }
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-brand-100 p-2.5 text-brand-700">
              <Sun className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">
                Verificación de insumos y equipos
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Baterías, neveras, freidoras, estación de elotes, empaques y base de
                efectivo. Sin apertura completa no se puede cobrar en POS.
              </p>
              {lastOpening && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-400">
                  <UserRound className="h-3.5 w-3.5" />
                  {lastOpening.user_name} ·{' '}
                  {lastOpening.user_role ? ROLES[lastOpening.user_role]?.label : 'Staff'} ·{' '}
                  {formatDateTime(lastOpening.created_at)}
                </p>
              )}
            </div>
          </div>
          <Button
            className="mt-3 w-full bg-brand-500 text-ink-950 hover:bg-brand-400"
            onClick={() => setOpenOpening(true)}
            disabled={openingComplete}
          >
            <ClipboardCheck className="h-4 w-4" />
            {openingComplete ? 'Apertura ya registrada' : 'Abrir checklist de apertura'}
          </Button>
        </SectionCard>

        <SectionCard
          title="Cierre de turno"
          action={
            <Badge variant={closingComplete ? 'success' : 'warning'}>
              {closingComplete ? 'Completado' : 'Pendiente'}
            </Badge>
          }
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-ink-100 p-2.5 text-ink-600">
              <Moon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">Limpieza y apagado seguro</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Sobrantes críticos, limpieza de neveras/freidoras, apagado de planchas y
                carga de terminales. Habilita el cierre y arqueo de caja.
              </p>
              {lastClosing && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-400">
                  <UserRound className="h-3.5 w-3.5" />
                  {lastClosing.user_name} ·{' '}
                  {lastClosing.user_role ? ROLES[lastClosing.user_role]?.label : 'Staff'} ·{' '}
                  {formatDateTime(lastClosing.created_at)}
                </p>
              )}
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => setOpenClosing(true)}
            disabled={closingComplete}
          >
            <LockKeyhole className="h-4 w-4" />
            {closingComplete ? 'Cierre ya registrado' : 'Abrir checklist de cierre'}
          </Button>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 text-xs text-ink-500 sm:grid-cols-3">
        <p className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          El turno se considera abierto solo si la última apertura es posterior al último
          cierre del día.
        </p>
        <p className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          El registro incluye los ítems verificados, observaciones y la firma del usuario
          con su rol.
        </p>
        <p className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          El cierre de caja permanece bloqueado hasta completar el checklist de cierre al
          100%.
        </p>
      </div>

      <SectionCard className="mt-4" title={`Historial · ${checklists.length}`}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                <th className="px-1 pb-2 font-semibold">Fecha</th>
                <th className="px-1 pb-2 font-semibold">Tipo</th>
                <th className="px-1 pb-2 font-semibold">Responsable</th>
                <th className="px-1 pb-2 font-semibold">Rol</th>
                <th className="px-1 pb-2 font-semibold">Progreso</th>
                <th className="px-1 pb-2 font-semibold">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {checklists.map((checklist) => (
                <tr key={checklist.id}>
                  <td className="px-1 py-2.5 text-[11px] text-ink-500">
                    {formatDateTime(checklist.created_at)}
                  </td>
                  <td className="px-1 py-2.5">
                    <Badge variant={checklist.shift_type === 'OPENING' ? 'brand' : 'info'}>
                      {checklist.shift_type === 'OPENING' ? 'Apertura' : 'Cierre'}
                    </Badge>
                  </td>
                  <td className="px-1 py-2.5 text-xs font-semibold text-ink-800">
                    {checklist.user_name}
                  </td>
                  <td className="px-1 py-2.5 text-xs text-ink-500">
                    {checklist.user_role ? ROLES[checklist.user_role]?.label ?? checklist.user_role : '—'}
                  </td>
                  <td className="px-1 py-2.5">
                    <ProgressBar checklist={checklist} />
                  </td>
                  <td className="max-w-[260px] truncate px-1 py-2.5 text-[11px] text-ink-400">
                    {checklist.notes ?? '—'}
                  </td>
                </tr>
              ))}
              {checklists.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-ink-400">
                    Aún no hay checklists registrados. Empieza con la apertura.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <OpeningChecklistModal open={openOpening} onClose={() => setOpenOpening(false)} />
      <ClosingChecklistModal open={openClosing} onClose={() => setOpenClosing(false)} />
    </div>
  )
}
