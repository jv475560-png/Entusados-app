import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/format'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  tone = 'light',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl',
          tone === 'dark'
            ? 'theme-dark border border-white/10 bg-ink-900 text-white'
            : 'bg-white',
          widths[size],
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b px-5 py-4',
            tone === 'dark' ? 'border-white/10' : 'border-ink-100',
          )}
        >
          <div>
            <h2
              className={cn(
                'text-lg font-semibold',
                tone === 'dark' ? 'text-white' : 'text-ink-900',
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  tone === 'dark' ? 'text-white/50' : 'text-ink-500',
                )}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className={cn(
              'rounded-lg p-1.5 transition',
              tone === 'dark'
                ? 'text-white/40 hover:bg-white/10 hover:text-white'
                : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className={cn(
              'border-t px-5 py-3',
              tone === 'dark'
                ? 'border-white/10 bg-ink-950/60'
                : 'border-ink-100 bg-ink-50/60',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
