import { Navigate, useLocation } from 'react-router-dom'
import { hasStoredSession } from '../services/auth'

type PrivateRouteProps = {
  children: React.ReactNode
}

// O token de verdade vive num cookie httpOnly que o JS não consegue ler —
// isso aqui é só um sinal do lado do cliente para decidir a rota sem
// esperar uma chamada à API. Se o cookie tiver expirado mesmo com esse
// sinal presente, a primeira chamada autenticada volta 401 e o
// interceptor da API redireciona pro login.
export function PrivateRoute({ children }: PrivateRouteProps) {
  const location = useLocation()

  if (!hasStoredSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
