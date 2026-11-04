import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OpportunitiesPage } from '../src/pages/donations/OpportunitiesPage'

const useOpportunities = vi.hoisted(() => vi.fn())
const reserveAsync = vi.hoisted(() => vi.fn())
vi.mock('../src/hooks/useDonations', () => ({
  useOpportunities,
  useReserveDonation: () => ({ mutateAsync: reserveAsync, isPending: false }),
}))

const opportunity = (over: Record<string, unknown> = {}) => ({
  id: 'don1',
  description: 'Pães do dia',
  category: 'PADARIA',
  estimatedQuantityKg: '8',
  storageCondition: 'AMBIENTE',
  pickupWindowEnd: '2026-11-01T18:00:00Z',
  urgency: { level: 'URGENT', hoursLeft: 4, deadline: '2026-11-01T18:00:00Z' },
  donor: { id: 'd1', name: 'Padaria Central', city: 'Sorocaba', state: 'SP' },
  ...over,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <OpportunitiesPage />
    </MemoryRouter>,
  )
}

describe('OpportunitiesPage', () => {
  beforeEach(() => {
    useOpportunities.mockReset()
    reserveAsync.mockReset()
    useOpportunities.mockReturnValue({ data: [opportunity()], isLoading: false })
  })

  it('mostra a doação com doador, cidade, urgência e armazenamento', () => {
    renderPage()
    expect(screen.getByText('Pães do dia')).toBeInTheDocument()
    expect(screen.getByText(/Padaria Central · Sorocaba\/SP/)).toBeInTheDocument()
    expect(screen.getByText('Urgente · 4 h')).toBeInTheDocument()
    expect(screen.getByText('Temperatura ambiente')).toBeInTheDocument()
  })

  it('mostra o estado vazio quando não há oportunidades', () => {
    useOpportunities.mockReturnValue({ data: [], isLoading: false })
    renderPage()
    expect(screen.getByText(/nenhuma doação disponível/i)).toBeInTheDocument()
  })

  it('reserva só depois de confirmar no diálogo e avisa o sucesso', async () => {
    const user = userEvent.setup()
    reserveAsync.mockResolvedValue({})
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reservar' }))
    expect(reserveAsync).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reservar' }))

    await waitFor(() => expect(reserveAsync).toHaveBeenCalledWith('don1'))
    expect(await screen.findByText(/foi reservada para você/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar o diálogo não reserva', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Reservar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(reserveAsync).not.toHaveBeenCalled()
  })

  it('conflito (outra instituição reservou antes) mostra o erro e fecha o diálogo', async () => {
    const user = userEvent.setup()
    reserveAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Esta doação não está mais disponível' } },
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reservar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reservar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/não está mais disponível/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('os filtros são enviados à consulta', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Cidade do doador'), 'Soro')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'PADARIA')

    await waitFor(() =>
      expect(useOpportunities).toHaveBeenLastCalledWith({ city: 'Soro', category: 'PADARIA' }),
    )
  })
})
