import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { homeForRole, signInStaff, useAuthStore } from '@/shared/services/auth'
import { isSupabaseEnabled } from '@/shared/services/supabase'
import { Logo } from '@/shared/ui/Brand'
import { Button } from '@/shared/ui/Button'
import { Field, Input } from '@/shared/ui/Input'
import { Badge } from '@/shared/ui/Badge'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const enterAsRole = useAuthStore((state) => state.enterAsRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escribe un correo válido.')
      return
    }
    if (password.trim().length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    setLoading(true)

    if (!isSupabaseEnabled) {
      const name = email.split('@')[0] || 'Administrador'
      enterAsRole('admin', name.charAt(0).toUpperCase() + name.slice(1))
      setLoading(false)
      navigate('/admin')
      return
    }

    const result = await signInStaff(email.trim(), password)
    setLoading(false)

    if (!result.ok || !result.role) {
      setError(result.error ?? 'No pudimos iniciar sesión.')
      return
    }

    navigate(homeForRole(result.role))
  }

  return (
    <div className="theme-dark bg-art flex min-h-dvh flex-col px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-brand-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>

        <div className="rounded-3xl border border-white/10 bg-ink-950/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Logo className="h-12 w-auto" />
            <Badge variant={isSupabaseEnabled ? 'success' : 'warning'}>
              {isSupabaseEnabled ? 'Supabase Auth' : 'Demo local'}
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-3xl leading-none text-white">
            ACCESO ADMIN / GERENCIA
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">
            Área privada para editar combos, cobertura, inventario, pagos y caja. Inicia
            sesión con tu correo corporativo.
          </p>

          <div className="mt-5 space-y-3">
            <Field label="Correo electrónico">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@entusados.co"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void submit()
                  }}
                  placeholder="••••••••"
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </Field>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-accent-500/10 px-3 py-2 text-xs font-medium text-accent-300">
              {error}
            </p>
          )}

          <Button
            className="mt-4 w-full bg-brand-500 text-ink-950 hover:bg-brand-400"
            size="lg"
            loading={loading}
            onClick={() => void submit()}
          >
            <ShieldCheck className="h-4 w-4" />
            Entrar al panel
          </Button>

          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-white/30">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            {isSupabaseEnabled
              ? 'El rol se toma de la tabla profiles. Crea los usuarios staff en Supabase Auth.'
              : 'Modo demo: usa cualquier correo y una contraseña de 4+ caracteres para entrar como administrador.'}
          </p>
        </div>
      </div>
    </div>
  )
}
