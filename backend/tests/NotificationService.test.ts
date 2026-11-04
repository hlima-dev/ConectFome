import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DonationAction } from '@prisma/client'
import { NotificationService } from '../src/services/NotificationService'
import { NotFoundError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  donation: { findUnique: vi.fn() },
  user: { findMany: vi.fn() },
  recipient: { findMany: vi.fn() },
  notification: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))
vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const donation = {
  id: 'don1',
  description: 'Pães',
  donor: { name: 'Padaria', city: 'Sorocaba', userId: 'u-donor' },
  recipient: null,
}

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new NotificationService()
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u-admin' }])
  })

  describe('onDonationEvent', () => {
    it('CRIADA: avisa receptores ativos da mesma cidade (sem diferenciar maiúsculas) e administradores', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue(donation)
      mockPrisma.recipient.findMany.mockResolvedValue([{ userId: 'u-rec' }, { userId: null }])

      await service.onDonationEvent(DonationAction.CRIADA, 'don1', 'u-donor')

      expect(mockPrisma.recipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true, userId: { not: null }, city: { equals: 'Sorocaba', mode: 'insensitive' } },
        }),
      )
      const data = mockPrisma.notification.createMany.mock.calls[0][0].data
      expect(data.map((n: { userId: string }) => n.userId).sort()).toEqual(['u-admin', 'u-rec'])
      expect(data[0]).toMatchObject({ donationId: 'don1', action: DonationAction.CRIADA })
    })

    it('CRIADA com doador sem cidade avisa todos os receptores ativos', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ ...donation, donor: { ...donation.donor, city: null } })
      mockPrisma.recipient.findMany.mockResolvedValue([])
      await service.onDonationEvent(DonationAction.CRIADA, 'don1', 'u-donor')
      expect(mockPrisma.recipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, userId: { not: null } } }),
      )
    })

    it('outros eventos não consultam receptores da região', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ ...donation, recipient: { name: 'ONG', userId: 'u-rec' } })
      await service.onDonationEvent(DonationAction.COLETADA, 'don1', 'u-admin')
      expect(mockPrisma.recipient.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.notification.createMany).toHaveBeenCalled()
    })

    it('não grava nada quando não há a quem avisar', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ ...donation, donor: { ...donation.donor, userId: null } })
      await service.onDonationEvent(DonationAction.CONFIRMADA, 'don1', 'u-rec')
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    })

    it('é melhor esforço: falha ao notificar não propaga erro', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockPrisma.donation.findUnique.mockRejectedValue(new Error('banco fora'))
      await expect(service.onDonationEvent(DonationAction.CRIADA, 'don1')).resolves.toBeUndefined()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('doação que sumiu: ignora', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue(null)
      await service.onDonationEvent(DonationAction.CRIADA, 'x')
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('lista só as do usuário, mais recentes primeiro, com a contagem de não lidas', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }])
      mockPrisma.notification.count.mockResolvedValue(3)

      const result = await service.list('u1', { unreadOnly: true, limit: 10 })

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', readAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'u1', readAt: null } })
      expect(result).toEqual({ items: [{ id: 'n1' }], unreadCount: 3 })
    })

    it('limita o tamanho da página a 50', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([])
      mockPrisma.notification.count.mockResolvedValue(0)
      await service.list('u1', { limit: 9999 })
      expect(mockPrisma.notification.findMany.mock.calls[0][0].take).toBe(50)
    })
  })

  describe('markRead', () => {
    it('marca como lida uma notificação do próprio usuário', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1', readAt: null })
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1' })
      await service.markRead('n1', 'u1')
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u1' } })
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { readAt: expect.any(Date) } })
    })

    it('notificação de outro usuário é tratada como inexistente', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null)
      await expect(service.markRead('n1', 'intruso')).rejects.toThrow(NotFoundError)
      expect(mockPrisma.notification.update).not.toHaveBeenCalled()
    })

    it('já lida: não regrava a data', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1', readAt: new Date() })
      await service.markRead('n1', 'u1')
      expect(mockPrisma.notification.update).not.toHaveBeenCalled()
    })
  })

  it('markAllRead marca só as não lidas do usuário', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 })
    expect(await service.markAllRead('u1')).toEqual({ updated: 4 })
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})
