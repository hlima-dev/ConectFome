import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useDeactivateVolunteer, useVolunteers } from '../../hooks/useVolunteers'
import type { Volunteer } from '../../types/logistics'
import { VolunteerFormModal } from './VolunteerFormModal'
import { getErrorMessage } from '../../utils/errors'

export function VolunteersPage() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editing, setEditing] = useState<Volunteer | null>(null)
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState<Volunteer | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: volunteers, isLoading } = useVolunteers({ includeInactive })
  const deactivateVolunteer = useDeactivateVolunteer()

  async function confirmDeactivate() {
    if (!deactivating) return
    setError(null)
    try {
      await deactivateVolunteer.mutateAsync(deactivating.id)
      setDeactivating(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const columns: DataTableColumn<Volunteer>[] = [
    { header: 'Nome', cell: (v) => <span className="font-medium text-slate-900">{v.name}</span> },
    { header: 'Documento', cell: (v) => v.document },
    { header: 'Telefone', cell: (v) => v.phone || '—' },
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
        <h1 className="text-2xl font-semibold text-slate-900">Voluntários</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus size={16} />
          Novo voluntário
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
        data={volunteers}
        isLoading={isLoading}
        rowKey={(v) => v.id}
        emptyMessage="Nenhum voluntário cadastrado."
      />

      {creating && <VolunteerFormModal onClose={() => setCreating(false)} />}
      {editing && <VolunteerFormModal volunteer={editing} onClose={() => setEditing(null)} />}
      {deactivating && (
        <ConfirmDialog
          title="Desativar voluntário"
          message={`Tem certeza que deseja desativar "${deactivating.name}"?`}
          confirmLabel="Desativar"
          danger
          isLoading={deactivateVolunteer.isPending}
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </div>
  )
}
