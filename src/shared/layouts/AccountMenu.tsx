import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { ROLES } from '@/shared/types'
import { useAuthStore } from '@/shared/services/auth'
import { Button } from '@/shared/ui/Button'

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const role = useAuthStore((state) => state.role)
  const fullName = useAuthStore((state) => state.fullName)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <div className="hidden items-end text-right sm:block">
          <p className="max-w-[180px] truncate text-xs font-bold text-white">{fullName}</p>
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
            <ShieldCheck className="h-3 w-3" />
            {ROLES[role]?.label ?? role}
          </p>
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => {
          void signOut().then(() => navigate('/admin'))
        }}
      >
        <LogOut className="h-3.5 w-3.5" />
        Salir
      </Button>
    </div>
  )
}
