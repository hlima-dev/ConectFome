import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DonationStatus, Role } from '@prisma/client'
import { DonationService } from '../src/services/DonationService'
import { ForbiddenError, NotFoundError, ValidationError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  donation: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  donor: {
    findUnique: vi.fn(),
  },
  recipient: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const admin = { id: 'admin_1', role: Role.ADMIN }
const donorUser = { id: 'user_1', role: Role.DOADOR }
const otherDonorUser = { id: 'user_2', role: Role.DOADOR }
const recipientUser = { id: 'user_3', role: Role.RECEPTOR }

const baseInput = {
  description: 'Pães e frutas do dia',
  estimatedQuantityKg: 10,
  pickupWindowStart: new Date('2026-01-01T10:00:00Z'),
  pickupWindowEnd: new Date('2026-01-01T12:00:00Z'),
}

describe('DonationService', () => {
  let service: DonationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DonationService()
  })

  describe('create', () => {
    it('DOADOR cria doação vinculada ao próprio cadastro (ignora donorId do body)', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', active: true })
      mockPrisma.donation.create.mockResolvedValue({ id: 'don1' })

      await service.create({ ...baseInput, donorId: 'outro-id-qualquer' }, donorUser)

      expect(mockPrisma.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ donorId: 'd1' }) }),
      )
    })

    it('DOADOR sem cadastro de doador é rejeitado', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue(null)
      await expect(service.create(baseInput, donorUser)).rejects.toThrow(ForbiddenError)
    })

    it('ADMIN precisa informar donorId', async () => {
      await expect(service.create(baseInput, admin)).rejects.toThrow(ValidationError)
    })

    it('ADMIN cria em nome de um donorId informado', async () => {
      mockPrisma.donation.create.mockResolvedValue({ id: 'don1' })
      await service.create({ ...baseInput, donorId: 'd9' }, admin)
      expect(mockPrisma.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ donorId: 'd9' }) }),
      )
    })

    it('RECEPTOR não pode criar doação', async () => {
      await expect(service.create(baseInput, recipientUser)).rejects.toThrow(ForbiddenError)
    })
  })

  describe('match', () => {
    it('casa doação DISPONIVEL com um receptor ativo', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', status: DonationStatus.DISPONIVEL })
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', active: true })
      mockPrisma.donation.update.mockResolvedValue({ id: 'don1', status: DonationStatus.RESERVADA })

      await service.match('don1', 'r1', admin)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DonationStatus.RESERVADA, recipientId: 'r1' }),
        }),
      )
    })

    it('não casa doação que não esteja DISPONIVEL', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', status: DonationStatus.RESERVADA })
      await expect(service.match('don1', 'r1', admin)).rejects.toThrow(ValidationError)
    })

    it('rejeita receptor inexistente ou inativo', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', status: DonationStatus.DISPONIVEL })
      mockPrisma.recipient.findUnique.mockResolvedValue(null)
      await expect(service.match('don1', 'r1', admin)).rejects.toThrow(NotFoundError)
    })
  })

  describe('cancel', () => {
    it('dono DOADOR cancela a própria doação DISPONIVEL', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', status: DonationStatus.DISPONIVEL })
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1' })
      mockPrisma.donation.update.mockResolvedValue({ id: 'don1', status: DonationStatus.CANCELADA })

      await service.cancel('don1', donorUser)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: DonationStatus.CANCELADA }) }),
      )
    })

    it('outro doador não pode cancelar', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', status: DonationStatus.DISPONIVEL })
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd2' })
      await expect(service.cancel('don1', otherDonorUser)).rejects.toThrow(ForbiddenError)
    })

    it('não cancela doação já coletada', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', status: DonationStatus.COLETADA })
      await expect(service.cancel('don1', admin)).rejects.toThrow(ValidationError)
    })
  })

  describe('markExpired', () => {
    it('marca DISPONIVEL como VENCIDA', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', status: DonationStatus.DISPONIVEL })
      mockPrisma.donation.update.mockResolvedValue({ id: 'don1', status: DonationStatus.VENCIDA })
      await service.markExpired('don1', admin)
      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: DonationStatus.VENCIDA } }),
      )
    })

    it('não marca como vencida uma doação já agendada', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', status: DonationStatus.AGENDADA })
      await expect(service.markExpired('don1', admin)).rejects.toThrow(ValidationError)
    })
  })

  describe('confirmReceipt', () => {
    it('receptor dono confirma recebimento de doação COLETADA', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: 'don1',
        recipientId: 'r1',
        status: DonationStatus.COLETADA,
      })
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1' })
      mockPrisma.donation.update.mockResolvedValue({ id: 'don1', status: DonationStatus.ENTREGUE })

      await service.confirmReceipt('don1', recipientUser)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: DonationStatus.ENTREGUE }) }),
      )
    })

    it('outro receptor não pode confirmar', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: 'don1',
        recipientId: 'r1',
        status: DonationStatus.COLETADA,
      })
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r2' })
      await expect(service.confirmReceipt('don1', recipientUser)).rejects.toThrow(ForbiddenError)
    })

    it('não confirma doação que ainda não foi coletada', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: 'don1',
        recipientId: 'r1',
        status: DonationStatus.AGENDADA,
      })
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1' })
      await expect(service.confirmReceipt('don1', recipientUser)).rejects.toThrow(ValidationError)
    })
  })

  describe('findById', () => {
    it('lança NotFoundError pra id inexistente', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue(null)
      await expect(service.findById('inexistente', admin)).rejects.toThrow(NotFoundError)
    })

    it('DOADOR não acessa doação de outro doador', async () => {
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'don1', donorId: 'd1', recipientId: null })
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd2' })
      await expect(service.findById('don1', otherDonorUser)).rejects.toThrow(ForbiddenError)
    })
  })
})
