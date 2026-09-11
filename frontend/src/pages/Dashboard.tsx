import { Link } from 'react-router-dom'
import { getStoredUser } from '../services/auth'
import { ROLE_LABELS } from '../types/auth'
import { useReportSummary } from '../hooks/useReports'

interface KpiCardProps {
  label: string
  value: string | number
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function Dashboard() {
  const user = getStoredUser()
  const isAdmin = user?.role === 'ADMIN'
  const { data: summary, isLoading } = useReportSummary({ enabled: isAdmin })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Painel</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bem-vindo(a), {user?.name} — {user ? ROLE_LABELS[user.role] : ''}
      </p>

      {!isAdmin && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Acompanhe suas doações em{' '}
          <Link to="/doacoes" className="font-medium text-emerald-700 hover:underline">
            Doações
          </Link>
          .
        </div>
      )}

      {isAdmin && isLoading && <p className="mt-6 text-sm text-slate-400">Carregando indicadores...</p>}

      {isAdmin && summary && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <KpiCard label="Kg resgatado (total)" value={`${summary.totalKgRescued} kg`} />
          <KpiCard label="Doações resgatadas" value={summary.totalDonationsRescued} />
          <KpiCard label="Doações entregues" value={summary.deliveredDonations} />
          <KpiCard label="Rotas concluídas" value={summary.completedRoutes} />
          <KpiCard label="Doadores ativos" value={summary.activeDonors} />
          <KpiCard label="Receptores ativos" value={summary.activeRecipients} />
        </div>
      )}

      {isAdmin && (
        <div className="mt-6">
          <Link to="/relatorios" className="text-sm font-medium text-emerald-700 hover:underline">
            Ver relatório completo →
          </Link>
        </div>
      )}
    </div>
  )
}
