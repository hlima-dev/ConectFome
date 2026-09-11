import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface DataTableColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[] | undefined
  isLoading?: boolean
  rowKey: (row: T) => string
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, isLoading, rowKey, emptyMessage = 'Nada encontrado.' }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.header} className={`px-4 py-3 ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                <Loader2 className="mx-auto mb-2 animate-spin" size={20} />
                Carregando...
              </td>
            </tr>
          )}

          {!isLoading && (!data || data.length === 0) && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!isLoading &&
            data?.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.header} className={`px-4 py-3 text-slate-700 ${col.className ?? ''}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
