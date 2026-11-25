import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCheck, ClipboardCheck, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import type { ShiftType } from '../types'
import { checklistItems } from '../types'
import { useShiftChecklists } from '../hooks/useShiftChecklists'
import { useAuthStore } from '@/shared/services/auth'
import { ROLES } from '@/shared/types'
import { formatDateTime } from '@/shared/lib/format'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { Textarea } from '@/shared/ui/Input'
import { Badge } from '@/shared/ui/Badge'

export function ChecklistModal({
  shiftType,
  open,
  onClose,
  onCompleted,
}: {
  shiftType: ShiftType
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}) {
  const items = useMemo(() => checklistItems(shiftType), [shiftType])
  const { register, error } = useShiftChecklists()
  const fullName = useAuthStore((state) => state.fullName)
  const role = useAuthStore((state) => state.role)

  const [checked, setChecked] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setChecked([])
      setNotes('')
      setSaving(false)
      setSaved(false)
      setLocalError(null)
    }
  }, [open])

  const progress = Math.round((checked.length / items.length) * 100)
  const complete = checked.length === items.length
  const isOpening = shiftType === 'OPENING'

  const toggle = (id: string) =>
    setChecked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )

  const submit = async () => {
    if (!complete) return
    setSaving(true)
    setLocalError(null)
    const ok = await register(shiftType, checked, notes)
    setSaving(false)
    if (!ok) {
      setLocalError('No pudimos guardar el checklist. Revisa tu sesión de staff.')
      return
    }
    setSaved(true)
    onCompleted?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="dark"
      title={isOpening ? 'Checklist de apertura' : 'Checklist de cierre'}
      description={
        isOpening
          ? 'Antes de iniciar ventas · verificación obligatoria de insumos y equipos'
          : 'Antes del arqueo · limpieza y apagado seguro'
      }
      footer={
        saved ? (
          <Button
            className="w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
            onClick={onClose}
          >
            <CheckCheck className="h-4 w-4" />
            Continuar
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40"
              size="lg"
              disabled={!complete}
              loading={saving}
              onClick={() => void submit()}
            >
              {saving ? 'Registrando…' : `Registrar ${isOpening ? 'apertura' : 'cierre'} (${checked.length}/${items.length})`}
            </Button>
            {!complete && (
              <p className="text-center text-[11px] text-white/40">
                Completa el 100% de la lista para habilitar el registro.
              </p>
            )}
          </div>
        )
      }
    >
      {saved ? (
        <div className="py-4 text-center">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/15" />
            <span className="absolute inset-3 rounded-full border border-emerald-400/30 bg-emerald-500/20" />
            <span className="relative flex h-14 w-14 animate-check-pop items-center justify-center rounded-full bg-emerald-500 text-ink-950 shadow-[0_0_40px_rgba(16,185,129,.55)]">
              <Check className="h-8 w-8 stroke-[3]" />
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-white">
            {isOpening ? 'Apertura registrada' : 'Cierre registrado'}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {formatDateTime(new Date().toISOString())} · {fullName} ·{' '}
            {ROLES[role]?.label ?? role}
          </p>
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-left text-[11px] text-emerald-200/80">
            {isOpening
              ? 'El turno quedó habilitado. Ya puedes operar el POS y registrar ventas.'
              : 'Se habilitó el cierre y arqueo de caja. Continúa en el módulo de contabilidad.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-brand-400" />
              {fullName} · {ROLES[role]?.label ?? role}
            </span>
            <span>{formatDateTime(new Date().toISOString())}</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/70">Progreso</span>
              <span className={progress === 100 ? 'font-bold text-emerald-400' : 'text-brand-300'}>
                {progress}% · {checked.length}/{items.length}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            {items.map((item) => {
              const active = checked.includes(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-emerald-400/40 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      active
                        ? 'border-emerald-400 bg-emerald-500 text-ink-950'
                        : 'border-white/25 bg-transparent'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white/85">
                      {item.label}
                      {item.critical && (
                        <Badge variant="danger" className="text-[9px]">
                          Crítico
                        </Badge>
                      )}
                    </span>
                    {item.hint && (
                      <span className="mt-0.5 block text-[10px] text-white/40">{item.hint}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setChecked(complete ? [] : items.map((item) => item.id))}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-300 hover:text-brand-200"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {complete ? 'Limpiar selección' : 'Marcar todo'}
          </button>

          <div>
            <p className="label-overline mb-1.5 text-white/40">Observaciones</p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Novedades de insumos, equipos o aseo…"
              maxLength={300}
            />
          </div>

          {(localError || error) && (
            <p className="rounded-lg bg-accent-500/10 px-3 py-2 text-xs text-accent-300">
              {localError ?? error}
            </p>
          )}

          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-white/30">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            Se guarda fecha, hora, usuario y rol. El POS queda bloqueado hasta registrar la
            apertura al 100%.
          </p>
        </div>
      )}
    </Modal>
  )
}

export function OpeningChecklistModal(props: {
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}) {
  return <ChecklistModal shiftType="OPENING" {...props} />
}

export function ClosingChecklistModal(props: {
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}) {
  return <ChecklistModal shiftType="CLOSING" {...props} />
}

export function ChecklistSaving() {
  return <Loader2 className="h-4 w-4 animate-spin" />
}
