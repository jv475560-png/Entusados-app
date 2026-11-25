import { useState } from 'react'
import { Megaphone, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { usePromotions } from '@/modules/ordering/hooks/usePromotions'
import type { Promotion } from '@/shared/types'
import { formatCOP } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Textarea } from '@/shared/ui/Input'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

const EMPTY = {
  title: '',
  description: '',
  price: '',
  emoji: '🍔',
  image_url: '',
  badge: 'Combo de la noche',
  cta_label: 'Pedir ahora',
  only_at_store: false,
  is_active: true,
  sort_order: '1',
}

export function PromotionsPage() {
  const {
    promotions,
    activePromotions,
    addPromotion,
    updatePromotion,
    removePromotion,
    togglePromotion,
  } = usePromotions()

  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const reset = () => {
    setForm(EMPTY)
    setEditingId(null)
  }

  const startEdit = (promotion: Promotion) => {
    setEditingId(promotion.id)
    setForm({
      title: promotion.title,
      description: promotion.description,
      price: String(promotion.price),
      emoji: promotion.emoji,
      image_url: promotion.image_url ?? '',
      badge: promotion.badge,
      cta_label: promotion.cta_label,
      only_at_store: promotion.only_at_store,
      is_active: promotion.is_active,
      sort_order: String(promotion.sort_order),
    })
  }

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFeedback('Completa título y descripción del combo.')
      return
    }
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) {
      setFeedback('Indica un precio válido.')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      emoji: form.emoji || '🍔',
      image_url: form.image_url.trim() || null,
      badge: form.badge.trim(),
      cta_label: form.cta_label.trim() || 'Pedir ahora',
      only_at_store: form.only_at_store,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    }

    if (editingId) {
      await updatePromotion(editingId, payload)
      setFeedback('Combo actualizado.')
    } else {
      await addPromotion(payload)
      setFeedback('Combo agregado a la página principal.')
    }
    reset()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contenido de la tienda"
        title="PROMOCIONES Y COMBOS"
        description="Edita los combos que ven los clientes en la página principal. Los cambios se reflejan de inmediato; puedes pausar, cambiar precio o marcar un combo como solo punto físico."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Combos activos" value={activePromotions.length} icon={Megaphone} tone="brand" />
        <StatCard label="Total configurados" value={promotions.length} icon={Megaphone} tone="blue" />
        <StatCard
          label="Solo punto físico"
          value={promotions.filter((promotion) => promotion.only_at_store).length}
          hint="No disponibles para domicilio"
          icon={Store}
          tone="ink"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          {promotions
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((promotion) => (
              <div
                key={promotion.id}
                className={`rounded-2xl border p-3 ${
                  promotion.is_active
                    ? 'border-ink-100 bg-white'
                    : 'border-dashed border-ink-200 bg-ink-50 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-2xl">
                      {promotion.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{promotion.title}</p>
                      <p className="text-xs text-ink-500">{promotion.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-extrabold text-emerald-500">
                          {formatCOP(promotion.price)}
                        </span>
                        <Badge variant="outline">{promotion.badge}</Badge>
                        {promotion.only_at_store && (
                          <Badge variant="warning">Solo punto físico</Badge>
                        )}
                        <Badge variant={promotion.is_active ? 'success' : 'neutral'}>
                          {promotion.is_active ? 'Activo' : 'Pausado'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant={promotion.is_active ? 'outline' : 'secondary'}
                      onClick={() => void togglePromotion(promotion.id)}
                    >
                      {promotion.is_active ? 'Pausar' : 'Activar'}
                    </Button>
                    <button
                      onClick={() => startEdit(promotion)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                      aria-label={`Editar ${promotion.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void removePromotion(promotion.id)}
                      className="rounded-lg p-1.5 text-ink-300 hover:bg-accent-50 hover:text-accent-600"
                      aria-label={`Eliminar ${promotion.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {promotions.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-xs text-ink-400">
              Sin combos. Agrega el primero desde el formulario.
            </p>
          )}
        </div>

        <SectionCard title={editingId ? 'Editar combo' : 'Nuevo combo'}>
          <div className="space-y-2">
            <Field label="Título">
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Combo Parrandero"
              />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Hamburguesa + espiropapa + bebida"
                className="min-h-16"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Precio (COP)">
                <Input
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="18000"
                />
              </Field>
              <Field label="Emoji">
                <Input
                  value={form.emoji}
                  onChange={(event) => setForm({ ...form, emoji: event.target.value })}
                  placeholder="🍔"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Etiqueta">
                <Input
                  value={form.badge}
                  onChange={(event) => setForm({ ...form, badge: event.target.value })}
                  placeholder="Combo de la noche"
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Imagen del combo (URL)">
              <Input
                value={form.image_url}
                onChange={(event) => setForm({ ...form, image_url: event.target.value })}
                placeholder="/assets/promo-parrandero.jpg"
              />
            </Field>
            <Field label="Texto del botón">
              <Input
                value={form.cta_label}
                onChange={(event) => setForm({ ...form, cta_label: event.target.value })}
                placeholder="Pedir ahora"
              />
            </Field>

            <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700">
              <input
                type="checkbox"
                checked={form.only_at_store}
                onChange={(event) =>
                  setForm({ ...form, only_at_store: event.target.checked })
                }
                className="h-4 w-4 accent-brand-500"
              />
              Solo disponible en punto físico (bloquear en domicilio)
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              Visible en la página principal
            </label>

            {feedback && (
              <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-700">
                {feedback}
              </p>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void submit()}>
                <Plus className="h-4 w-4" />
                {editingId ? 'Guardar cambios' : 'Crear combo'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={reset}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
