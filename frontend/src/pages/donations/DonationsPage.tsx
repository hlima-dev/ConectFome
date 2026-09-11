import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { StatusBadge } from '../../components/StatusBadge'
import { useDonations } from '../../hooks/useDonations'
import { getStoredUser } from '../../services/auth'
import {
  DONATION_STATUS_LABELS,
  DONATION_STATUS_TONES,
  FOOD_CATEGORY_LABELS,
  type Donation,
  type DonationStatus,
} from '../../types/donations'
import { DonationFormModal } from './DonationFormModal'

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function DonationsPage() {
  const user = getStoredUser()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'DOADOR'
  const [status, setStatus] = useState<DonationStatus | ''>('')
  const [creating, setCreating] = useState(false)

  const { data: donations, isLoading } = useDonations(status ? { status } : undefined)

  const columns: DataTableColumn<Donation>[] = [
    {
      header: 'Descrição',
      cell: (d) => (
        <Link to={`/doacoes/${d.id}`} className="font-medium text-emerald-700 hover:underline">
          {d.description}
        </Link>
      ),
    },
    { header: 'Categoria', cell: (d) => FOOD_CATEGORY_LABELS[d.category] },
    { header: 'Doador', cell: (d) => d.donor?.name ?? '—' },
    { header: 'Receptor', cell: (d) => d.recipient?.name ?? '—' },
    { header: 'Qtd. estimada', cell: (d) => `${d.estimatedQuantityKg} kg` },
    { header: 'Janela de coleta', cell: (d) => formatDate(d.pickupWindowStart) },
    {
      header: 'Status',
      cell: (d) => <StatusBadge label={DONATION_STATUS_LABELS[d.status]} tone={DONATION_STATUS_TONES[d.status]} />,
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Doações</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={16} />
            Nova doação
          </button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="donation-status-filter" className="text-sm text-slate-600">
          Status
        </label>
        <select
          id="donation-status-filter"
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as DonationStatus | '')}
        >
          <option value="">Todos</option>
          {Object.entries(DONATION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={donations}
        isLoading={isLoading}
        rowKey={(d) => d.id}
        emptyMessage="Nenhuma doação encontrada."
      />

      {creating && <DonationFormModal onClose={() => setCreating(false)} />}
    </div>
  )
}
