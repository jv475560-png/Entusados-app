import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '@/shared/types'
import { homeForRole, useAuthStore } from '@/shared/services/auth'
import { AdminLoginPage } from '@/apps/admin/AdminLoginPage'

export function AdminGuard({
  allow,
  children,
}: {
  allow: UserRole[]
  children: ReactNode
}) {
  const role = useAuthStore((state) => state.role)
  const userId = useAuthStore((state) => state.userId)
  const isAuthenticated = role !== 'customer' && Boolean(userId)

  if (!isAuthenticated) return <AdminLoginPage />
  if (!allow.includes(role)) return <Navigate to={homeForRole(role)} replace />

  return <>{children}</>
}
