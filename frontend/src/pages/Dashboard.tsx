import { getStoredUser } from '../services/auth'
import { ROLE_LABELS } from '../types/auth'

// Painel inicial — nesta fase só dá boas-vindas; os cards de KPI (kg
// resgatado, doações entregues, rotas concluídas) entram na Fase 5, quando
// o endpoint de relatórios existir.
export function Dashboard() {
  const user = getStoredUser()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Painel</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bem-vindo(a), {user?.name} — {user ? ROLE_LABELS[user.role] : ''}
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Os indicadores de doações, rotas e alimento resgatado aparecerão
        aqui conforme os módulos forem ficando prontos.
      </div>
    </div>
  )
}
