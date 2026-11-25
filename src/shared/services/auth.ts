import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSupabaseEnabled, supabase } from './supabase'
import type { UserRole } from '@/shared/types'
import { ROLES } from '@/shared/types'
import { uid } from '@/shared/lib/format'

interface AuthState {
  userId: string | null
  role: UserRole
  fullName: string
  phone: string
  isAnonymous: boolean
  setRole: (role: UserRole) => void
  setProfile: (patch: { fullName?: string; phone?: string }) => void
  enterAsRole: (role: UserRole, fullName?: string) => void
  hydrateSession: (payload: { userId: string; role: UserRole; fullName: string }) => void
  signOut: () => Promise<void>
}

export interface StaffLoginResult {
  ok: boolean
  role?: UserRole
  error?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      role: 'customer',
      fullName: 'Cliente ENTUSADOS',
      phone: '',
      isAnonymous: true,
      setRole: (role) => set({ role }),
      setProfile: (patch) =>
        set((state) => ({
          fullName: patch.fullName ?? state.fullName,
          phone: patch.phone ?? state.phone,
        })),
      enterAsRole: (role, fullName) =>
        set((state) => ({
          role,
          fullName:
            fullName ??
            (role === 'customer' ? 'Cliente ENTUSADOS' : `Equipo ${ROLES[role]?.label ?? role}`),
          userId: state.userId ?? uid('demo-user'),
          isAnonymous: !isSupabaseEnabled,
        })),
      hydrateSession: ({ userId, role, fullName }) =>
        set({ userId, role, fullName, isAnonymous: false }),
      signOut: async () => {
        if (isSupabaseEnabled && supabase) {
          await supabase.auth.signOut()
        }
        set({ userId: null, role: 'customer', fullName: 'Cliente ENTUSADOS', phone: '' })
      },
    }),
    { name: 'entusados-auth-v2' },
  ),
)

export function homeForRole(role: UserRole): string {
  return ROLES[role]?.home ?? '/'
}

/** Login de staff (cajero, cocina, admin) contra Supabase Auth. */
export async function signInStaff(email: string, password: string): Promise<StaffLoginResult> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase no está configurado (modo demo).' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Credenciales inválidas.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    return { ok: false, error: 'El usuario no tiene perfil asignado.' }
  }

  const role = (profile as { role: UserRole }).role
  const fullName = (profile as { full_name: string }).full_name
  useAuthStore.getState().hydrateSession({ userId: data.user.id, role, fullName })

  return { ok: true, role }
}

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!isSupabaseEnabled || !supabase) return null
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) return data.session.user.id
  const { data: created, error } = await supabase.auth.signInAnonymously()
  if (error) return null
  return created.user?.id ?? null
}
