import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useByDonor, useByRecipient, useMonthlyKg } from '../../hooks/useReports'
import { useDonors } from '../../hooks/useDonors'
import { useRecipients } from '../../hooks/useRecipients'

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2]

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function ReportsPage() {
  const [year, setYear] = useState<number | ''>(currentYear)
  const [donorId, setDonorId] = useState('')
  const [recipientId, setRecipientId] = useState('')

  const yearFilter = year === '' ? undefined : year
  const { data: monthlyKg, isLoading: loadingMonthly } = useMonthlyKg({
    year: yearFilter,
    donorId: donorId || undefined,
    recipientId: recipientId || undefined,
  })
  const { data: byDonor, isLoading: loadingByDonor } = useByDonor({ year: yearFilter })
  const { data: byRecipient, isLoading: loadingByRecipient } = useByRecipient({ year: yearFilter })
  const { data: donors } = useDonors()
  const { data: recipients } = useRecipients()

  const chartData = (monthlyKg ?? []).map((row) => ({ ...row, monthLabel: formatMonth(row.month) }))

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Relatórios</h1>
      <p className="mb-6 text-sm text-slate-500">
        Alimento resgatado por mês — o indicador central do impacto da plataforma nos ODS 2 e 12.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="report-year" className="mb-1 block text-sm font-medium text-slate-700">
            Ano
          </label>
          <select
            id="report-year"
            className="input w-auto"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="report-donor" className="mb-1 block text-sm font-medium text-slate-700">
            Doador
          </label>
          <select id="report-donor" className="input w-auto" value={donorId} onChange={(e) => setDonorId(e.target.value)}>
            <option value="">Todos</option>
            {donors?.map((donor) => (
              <option key={donor.id} value={donor.id}>
                {donor.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="report-recipient" className="mb-1 block text-sm font-medium text-slate-700">
            Receptor
          </label>
          <select
            id="report-recipient"
            className="input w-auto"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          >
            <option value="">Todos</option>
            {recipients?.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Kg resgatado por mês</h2>

        {loadingMonthly && <p className="text-sm text-slate-400">Carregando...</p>}
        {!loadingMonthly && chartData.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma doação resgatada nesse filtro ainda.</p>
        )}
        {!loadingMonthly && chartData.length > 0 && (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name) => [name === 'totalKg' ? `${value} kg` : value, name === 'totalKg' ? 'Total resgatado' : 'Doações']}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
                />
                <Bar dataKey="totalKg" fill="#047857" radius={[4, 4, 0, 0]} name="totalKg" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Por doador</h2>
          {loadingByDonor && <p className="text-sm text-slate-400">Carregando...</p>}
          {!loadingByDonor && (byDonor ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Nenhum dado nesse filtro ainda.</p>
          )}
          {!loadingByDonor && (byDonor ?? []).length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2">Doador</th>
                  <th className="py-2 text-right">Doações</th>
                  <th className="py-2 text-right">Kg resgatado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byDonor?.map((row) => (
                  <tr key={row.donorId}>
                    <td className="py-2">{row.donorName}</td>
                    <td className="py-2 text-right">{row.donationCount}</td>
                    <td className="py-2 text-right font-medium">{row.totalKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Por receptor</h2>
          {loadingByRecipient && <p className="text-sm text-slate-400">Carregando...</p>}
          {!loadingByRecipient && (byRecipient ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Nenhum dado nesse filtro ainda.</p>
          )}
          {!loadingByRecipient && (byRecipient ?? []).length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2">Receptor</th>
                  <th className="py-2 text-right">Doações</th>
                  <th className="py-2 text-right">Kg resgatado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byRecipient?.map((row) => (
                  <tr key={row.recipientId}>
                    <td className="py-2">{row.recipientName}</td>
                    <td className="py-2 text-right">{row.donationCount}</td>
                    <td className="py-2 text-right font-medium">{row.totalKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
