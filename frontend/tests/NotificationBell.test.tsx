import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NotificationBell } from '../src/components/NotificationBell'

const useNotifications = vi.hoisted(() => vi.fn())
const markRead = vi.hoisted(() => vi.fn())
const markAll = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock('../src/hooks/useNotifications', () => ({
  useNotifications,
  useMarkNotificationRead: () => ({ mutate: markRead }),
  useMarkAllNotificationsRead: () => ({ mutate: markAll }),
}))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

const items = [
  { id: 'n1', donationId: 'don1', action: 'CRIADA', message: 'Nova doação disponível: "Pães".', readAt: null, createdAt: '2026-11-01T10:00:00Z' },
  { id: 'n2', donationId: 'don2', action: 'COLETADA', message: '"Bolo" foi coletada.', readAt: '2026-11-01T11:00:00Z', createdAt: '2026-11-01T09:00:00Z' },
]

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotifications.mockReturnValue({ data: { items, unreadCount: 1 } })
  })

  it('mostra a contagem de não lidas no sino', () => {
    renderBell()
    expect(screen.getByRole('button', { name: /1 não lidas/i })).toBeInTheDocument()
  })

  it('sem não lidas, não mostra contador', () => {
    useNotifications.mockReturnValue({ data: { items, unreadCount: 0 } })
    renderBell()
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument()
  })

  it('abre a lista e, ao clicar numa não lida, marca como lida e vai para a doação', async () => {
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notificações/i }))
    await user.click(screen.getByText('Nova doação disponível: "Pães".'))

    expect(markRead).toHaveBeenCalledWith('n1')
    expect(navigate).toHaveBeenCalledWith('/doacoes/don1')
  })

  it('clicar numa já lida só navega, sem marcar de novo', async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(screen.getByRole('button', { name: /notificações/i }))
    await user.click(screen.getByText('"Bolo" foi coletada.'))
    expect(markRead).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/doacoes/don2')
  })

  it('"Marcar todas como lidas" só aparece havendo não lidas e dispara a ação', async () => {
    const user = userEvent.setup()
    renderBell()
    await user.click(screen.getByRole('button', { name: /notificações/i }))
    await user.click(screen.getByRole('button', { name: /marcar todas como lidas/i }))
    expect(markAll).toHaveBeenCalled()
  })

  it('lista vazia explica que não há notificações', async () => {
    const user = userEvent.setup()
    useNotifications.mockReturnValue({ data: { items: [], unreadCount: 0 } })
    renderBell()
    await user.click(screen.getByRole('button', { name: /notificações/i }))
    expect(screen.getByText(/nenhuma notificação/i)).toBeInTheDocument()
    expect(screen.queryByText(/marcar todas/i)).not.toBeInTheDocument()
  })
})
