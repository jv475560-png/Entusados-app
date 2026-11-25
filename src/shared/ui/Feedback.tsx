import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/format'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ink-100', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatusDot({ tone }: { tone: 'green' | 'amber' | 'red' | 'neutral' }) {
  const tones = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-accent-500',
    neutral: 'bg-ink-300',
  }
  return <span className={cn('inline-block h-2 w-2 rounded-full', tones[tone])} />
}
