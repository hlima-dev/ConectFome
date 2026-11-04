import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportsPage } from '../src/pages/reports/ReportsPage'

const useRates = vi.hoisted(() => vi.fn())
const downloadCsv = vi.hoisted(() => vi.fn())
const empty = { data: [], isLoading: false }

vi.mock('../src/hooks/useReports', () => ({
  useRates,
  useMonthlyKg: () => empty,
  useByDonor: () => empty,
  useByRecipient: () => empty,
}))
vi.mock('../src/hooks/useDonors', () => ({ useDonors: () => ({ data: [] }) }))
vi.mock('../src/hooks/useRecipients', () => ({ useRecipients: () => ({ data: [] }) }))
vi.mock('../src/services/reports', () => ({ downloadDonationsCsv: downloadCsv }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: () => null, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}))

const rates = {
  registered: 10, rescued: 6, delivered: 4, expired: 2, canceled: 1,
  rescueRate: 0.6, lossRate: 0.2, deliveryRate: 0.667, rescuedKg: 100.5, lostKg: 15.5, avgHoursToCollect: 18.3, peopleServed: 126,
}

describe('ReportsPage — indicadores do período', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRates.mockReturnValue({ data: rates })
  })

  it('mostra as taxas, o kg resgatado, o tempo até a coleta e as pessoas atendidas', () => {
    render(<ReportsPage />)
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('66,7%')).toBeInTheDocument()
    expect(screen.getByText('100,5 kg')).toBeInTheDocument()
    expect(screen.getByText('18,3 h')).toBeInTheDocument()
    expect(screen.getByText('126')).toBeInTheDocument()
    expect(screen.getByText(/2 vencidas · 15,5 kg/)).toBeInTheDocument()
  })

  it('taxas sem base de cálculo aparecem como traço, não como 0%', () => {
    useRates.mockReturnValue({ data: { ...rates, rescueRate: null, lossRate: null, deliveryRate: null, avgHoursToCollect: null } })
    render(<ReportsPage />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('envia o período escolhido à consulta e à exportação', async () => {
    const user = userEvent.setup()
    downloadCsv.mockResolvedValue(undefined)
    render(<ReportsPage />)

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-31' } })
    expect(useRates).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31' })

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))
    expect(downloadCsv).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31' })
  })

  it('período invertido: avisa, não consulta e bloqueia a exportação', () => {
    render(<ReportsPage />)
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/não pode ser depois da final/i)
    expect(useRates).toHaveBeenLastCalledWith(undefined)
    expect(screen.getByRole('button', { name: /exportar csv/i })).toBeDisabled()
  })

  it('falha na exportação mostra o erro', async () => {
    const user = userEvent.setup()
    downloadCsv.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Sem permissão' } } })
    render(<ReportsPage />)
    await user.click(screen.getByRole('button', { name: /exportar csv/i }))
    await waitFor(() => expect(screen.getByText('Sem permissão')).toBeInTheDocument())
  })
})
