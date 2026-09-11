import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { StatusBadge } from '../../components/StatusBadge'
import { usePickupRoutes } from '../../hooks/usePickupRoutes'
import {
  PICKUP_ROUTE_STATUS_LABELS,
  PICKUP_ROUTE_STATUS_TONES,
  type PickupRoute,
  type PickupRouteStatus,
} from '../../types/logistics'

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function PickupRoutesPage() {
  const [status, setStatus] = useState<PickupRouteStatus | ''>('')
  const { data: routes, isLoading } = usePickupRoutes(status ? { status } : undefined)

  const columns: DataTableColumn<PickupRoute>[] = [
    {
      header: 'Rota',
      cell: (r) => (
        <Link to={`/rotas/${r.id}`} className="font-medium text-emerald-700 hover:underline">
          #{r.routeNumber}
        </Link>
      ),
    },
    { header: 'Veículo', cell: (r) => `${r.vehicle.plate} — ${r.vehicle.model}` },
    { header: 'Voluntário', cell: (r) => r.volunteer.name },
    { header: 'Doações', cell: (r) => r.donations.length },
    { header: 'Agendada para', cell: (r) => formatDate(r.scheduledFor) },
    {
      header: 'Status',
      cell: (r) => (
        <StatusBadge label={PICKUP_ROUTE_STATUS_LABELS[r.status]} tone={PICKUP_ROUTE_STATUS_TONES[r.status]} />
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Rotas de coleta</h1>
        <Link
          to="/rotas/nova"
          className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Nova rota
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="route-status-filter" className="text-sm text-slate-600">
          Status
        </label>
        <select
          id="route-status-filter"
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as PickupRouteStatus | '')}
        >
          <option value="">Todos</option>
          {Object.entries(PICKUP_ROUTE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={routes}
        isLoading={isLoading}
        rowKey={(r) => r.id}
        emptyMessage="Nenhuma rota de coleta cadastrada."
      />
    </div>
  )
}
