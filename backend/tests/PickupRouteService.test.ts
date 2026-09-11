import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DonationStatus, PickupRouteStatus } from '@prisma/client'
import { PickupRouteService } from '../src/services/PickupRouteService'
import { NotFoundError, ValidationError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  pickupRoute: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  donation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  vehicle: {
    findUnique: vi.fn(),
  },
  volunteer: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

describe('PickupRouteService', () => {
  let service: PickupRouteService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PickupRouteService()
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]))
  })

  describe('create', () => {
    it('cria uma rota com veículo e voluntário ativos', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', active: true })
      mockPrisma.volunteer.findUnique.mockResolvedValue({ id: 'vol1', active: true })
      mockPrisma.pickupRoute.create.mockResolvedValue({ id: 'r1' })

      await service.create({ vehicleId: 'v1', volunteerId: 'vol1', scheduledFor: new Date() })

      expect(mockPrisma.pickupRoute.create).toHaveBeenCalled()
    })

    it('rejeita veículo inativo/inexistente', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue(null)
      await expect(
        service.create({ vehicleId: 'v1', volunteerId: 'vol1', scheduledFor: new Date() }),
      ).rejects.toThrow(NotFoundError)
    })

    it('rejeita voluntário inativo/inexistente', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', active: true })
      mockPrisma.volunteer.findUnique.mockResolvedValue({ id: 'vol1', active: false })
      await expect(
        service.create({ vehicleId: 'v1', volunteerId: 'vol1', scheduledFor: new Date() }),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('attachDonation', () => {
    it('anexa uma doação RESERVADA e sem rota', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'd1', status: DonationStatus.RESERVADA, routeId: null })
      mockPrisma.donation.update.mockResolvedValue({})

      await service.attachDonation('r1', 'd1')

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: DonationStatus.AGENDADA, routeId: 'r1' },
      })
    })

    it('rejeita anexar numa rota que não está PLANEJADA', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.EM_ANDAMENTO })
      await expect(service.attachDonation('r1', 'd1')).rejects.toThrow(ValidationError)
    })

    it('rejeita anexar doação que já está em outra rota', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: 'd1',
        status: DonationStatus.RESERVADA,
        routeId: 'r2',
      })
      await expect(service.attachDonation('r1', 'd1')).rejects.toThrow(ValidationError)
    })

    it('rejeita anexar doação que não está RESERVADA', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: 'd1',
        status: DonationStatus.DISPONIVEL,
        routeId: null,
      })
      await expect(service.attachDonation('r1', 'd1')).rejects.toThrow(ValidationError)
    })
  })

  describe('detachDonation', () => {
    it('desanexa e devolve a doação pra RESERVADA', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'd1', routeId: 'r1' })
      mockPrisma.donation.update.mockResolvedValue({})

      await service.detachDonation('r1', 'd1')

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: DonationStatus.RESERVADA, routeId: null },
      })
    })

    it('rejeita desanexar doação que não pertence à rota', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findUnique.mockResolvedValue({ id: 'd1', routeId: 'r2' })
      await expect(service.detachDonation('r1', 'd1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('start', () => {
    it('inicia uma rota planejada com ao menos 1 doação anexada', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.count.mockResolvedValue(2)
      mockPrisma.pickupRoute.update.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.EM_ANDAMENTO })

      await service.start('r1')

      expect(mockPrisma.pickupRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PickupRouteStatus.EM_ANDAMENTO }) }),
      )
    })

    it('rejeita iniciar sem nenhuma doação anexada', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.count.mockResolvedValue(0)
      await expect(service.start('r1')).rejects.toThrow(ValidationError)
    })

    it('rejeita iniciar uma rota que não está planejada', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.CONCLUIDA })
      await expect(service.start('r1')).rejects.toThrow(ValidationError)
    })
  })

  describe('complete', () => {
    it('conclui a rota e marca as doações anexadas como COLETADA usando o estimado como padrão', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.EM_ANDAMENTO })
      mockPrisma.donation.findMany.mockResolvedValue([
        { id: 'd1', estimatedQuantityKg: 10 },
        { id: 'd2', estimatedQuantityKg: 5 },
      ])
      mockPrisma.donation.update.mockResolvedValue({})
      mockPrisma.pickupRoute.update.mockResolvedValue({})

      await service.complete('r1', [{ donationId: 'd1', collectedQuantityKg: 8 }])

      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({ status: DonationStatus.COLETADA, collectedQuantityKg: 8 }),
        }),
      )
      expect(mockPrisma.donation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd2' },
          data: expect.objectContaining({ status: DonationStatus.COLETADA, collectedQuantityKg: 5 }),
        }),
      )
    })

    it('rejeita concluir uma rota que não está em andamento', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      await expect(service.complete('r1')).rejects.toThrow(ValidationError)
    })
  })

  describe('cancel', () => {
    it('cancela a rota e devolve as doações anexadas pra RESERVADA', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.PLANEJADA })
      mockPrisma.donation.findMany.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }])
      mockPrisma.donation.update.mockResolvedValue({})
      mockPrisma.pickupRoute.update.mockResolvedValue({})

      await service.cancel('r1')

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: DonationStatus.RESERVADA, routeId: null },
      })
      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: { id: 'd2' },
        data: { status: DonationStatus.RESERVADA, routeId: null },
      })
    })

    it('rejeita cancelar uma rota que já não está mais planejada', async () => {
      mockPrisma.pickupRoute.findUnique.mockResolvedValue({ id: 'r1', status: PickupRouteStatus.CONCLUIDA })
      await expect(service.cancel('r1')).rejects.toThrow(ValidationError)
    })
  })
})
