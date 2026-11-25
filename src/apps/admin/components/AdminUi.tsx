import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/format'

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-400">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl leading-none text-ink-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-accent-100 text-accent-700',
  blue: 'bg-sky-100 text-sky-700',
  ink: 'bg-ink-100 text-ink-700',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'ink',
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: keyof typeof TONES
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
        {Icon && (
          <span className={cn('rounded-lg p-1.5', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
    </div>
  )
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-ink-100 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
