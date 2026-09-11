import { Navigate } from 'react-router-dom'
import { getStoredUser } from '../services/auth'
import type { Role } from '../types/auth'

type RoleRouteProps = {
  roles: Role[]
  children: React.ReactNode
}

// Protege rotas restritas a um ou mais papéis (ex: só ADMIN mexe em
// logística/relatórios). Generaliza a ideia do PlatformAdminRoute do
// ATHLO, que era fixo pra um único papel (isPlatformAdmin).
export function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = getStoredUser()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
