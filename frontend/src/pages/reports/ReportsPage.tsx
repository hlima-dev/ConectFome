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
import { Download } from 'lucide-react'
import { useByDonor, useByRecipient, useMonthlyKg, useRates } from '../../hooks/useReports'
import { downloadDonationsCsv } from '../../services/reports'
import { getErrorMessage } from '../../utils/errors'
import { useDonors } from '../../hooks/useDonors'
import { useRecipients } from '../../hooks/useRecipients'
import { formatKg } from '../../utils/format'

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2]

const percent = (value: number | null) => (value === null ? '—' : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
const kg = formatKg

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function ReportsPage() {
  const [year, setYear] = useState<number | ''>(currentYear)
  const [donorId, setDonorId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  // Período dos indicadores e da exportação (AAAA-MM-DD); vazio = tudo.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const yearFilter = year === '' ? undefined : year
  const { data: monthlyKg, isLoading: loadingMonthly } = useMonthlyKg({
    year: yearFilter,
    donorId: donorId || undefined,
    recipientId: recipientId || undefined,
  })
  const { data: byDonor, isLoading: loadingByDonor } = useByDonor({ year: yearFilter })
  const { data: byRecipient, isLoading: loadingByRecipient } = useByRecipient({ year: yearFilter })
  const period = { from: from || undefined, to: to || undefined }
  const invalidPeriod = !!from && !!to && from > to
  const { data: rates } = useRates(invalidPeriod ? undefined : period)
  const { data: donors } = useDonors()
  const { data: recipients } = useRecipients()

  async function handleExport() {
    setExportError(null)
    setExporting(true)
    try {
      await downloadDonationsCsv(period)
    } catch (error) {
      setExportError(getErrorMessage(error))
    } finally {
      setExporting(false)
    }
  }

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

      <section className="mb-6" aria-labelledby="rates-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="rates-title" className="text-base font-semibold text-slate-900">
              Indicadores do período
            </h2>
            <p className="text-xs text-slate-500">Considera as doações registradas no período. Sem datas, todo o histórico.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-sm font-medium text-slate-700">
                De
              </label>
              <input id="report-from" type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-sm font-medium text-slate-700">
                Até
              </label>
              <input id="report-to" type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || invalidPeriod}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        {invalidPeriod && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            A data inicial não pode ser depois da final.
          </p>
        )}
        {exportError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p>}

        {rates && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Doações registradas" value={String(rates.registered)} />
            <Kpi label="Kg resgatado" value={kg(rates.rescuedKg)} hint={`${rates.rescued} doações coletadas ou entregues`} />
            <Kpi label="Taxa de resgate" value={percent(rates.rescueRate)} hint="coletadas ou entregues ÷ registradas" />
            <Kpi label="Perda antes da coleta" value={percent(rates.lossRate)} hint={`${rates.expired} vencidas · ${kg(rates.lostKg)}`} />
            <Kpi label="Entrega confirmada" value={percent(rates.deliveryRate)} hint="entregues ÷ coletadas" />
            <Kpi
              label="Tempo até a coleta"
              value={rates.avgHoursToCollect === null ? '—' : `${rates.avgHoursToCollect.toLocaleString('pt-BR')} h`}
              hint="média entre o registro e a coleta"
            />
            <Kpi label="Pessoas atendidas" value={rates.peopleServed.toLocaleString('pt-BR')} hint="das instituições com entrega no período" />
            <Kpi label="Canceladas" value={String(rates.canceled)} />
          </div>
        )}
      </section>

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
                  formatter={(value: number, name) => [name === 'totalKg' ? formatKg(value) : value, name === 'totalKg' ? 'Total resgatado' : 'Doações']}
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
                    <td className="py-2 text-right font-medium">{formatKg(row.totalKg)}</td>
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
                    <td className="py-2 text-right font-medium">{formatKg(row.totalKg)}</td>
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
