import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useDeactivateVehicle, useVehicles } from '../../hooks/useVehicles'
import type { Vehicle } from '../../types/logistics'
import { VehicleFormModal } from './VehicleFormModal'
import { getErrorMessage } from '../../utils/errors'

export function VehiclesPage() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState<Vehicle | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: vehicles, isLoading } = useVehicles({ includeInactive })
  const deactivateVehicle = useDeactivateVehicle()

  async function confirmDeactivate() {
    if (!deactivating) return
    setError(null)
    try {
      await deactivateVehicle.mutateAsync(deactivating.id)
      setDeactivating(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const columns: DataTableColumn<Vehicle>[] = [
    { header: 'Placa', cell: (v) => <span className="font-medium text-slate-900">{v.plate}</span> },
    { header: 'Modelo', cell: (v) => v.model },
    { header: 'Capacidade', cell: (v) => (v.capacityKg ? `${v.capacityKg} kg` : '—') },
    {
      header: 'Status',
      cell: (v) => <StatusBadge label={v.active ? 'Ativo' : 'Inativo'} tone={v.active ? 'green' : 'neutral'} />,
    },
    {
      header: '',
      className: 'text-right',
      cell: (v) => (
        <div className="flex justify-end gap-3 text-sm">
          <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setEditing(v)}>
            Editar
          </button>
          {v.active && (
            <button type="button" className="text-red-600 hover:text-red-800" onClick={() => setDeactivating(v)}>
              Desativar
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Veículos</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Novo veículo
        </button>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Incluir inativos
        </label>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={isLoading}
        rowKey={(v) => v.id}
        emptyMessage="Nenhum veículo cadastrado."
      />

      {creating && <VehicleFormModal onClose={() => setCreating(false)} />}
      {editing && <VehicleFormModal vehicle={editing} onClose={() => setEditing(null)} />}
      {deactivating && (
        <ConfirmDialog
          title="Desativar veículo"
          message={`Tem certeza que deseja desativar "${deactivating.plate}"?`}
          confirmLabel="Desativar"
          danger
          isLoading={deactivateVehicle.isPending}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </div>
  )
}
