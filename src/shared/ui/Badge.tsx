import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/format'

type Variant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'dark'

const variants: Record<Variant, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-accent-100 text-accent-700',
  info: 'bg-sky-100 text-sky-700',
  outline: 'border border-ink-200 text-ink-600',
  dark: 'bg-ink-800 text-brand-300',
}

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
