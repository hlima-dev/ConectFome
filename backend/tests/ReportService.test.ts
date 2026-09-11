import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportService } from '../src/services/ReportService'

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  donation: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  donor: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  recipient: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  pickupRoute: {
    count: vi.fn(),
  },
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

describe('ReportService', () => {
  let service: ReportService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ReportService()
  })

  describe('monthlyKg', () => {
    it('mapeia o resultado do SQL cru pro formato de resposta', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { month: new Date('2026-01-01T00:00:00Z'), total_kg: 42.5, donation_count: 3 },
        { month: new Date('2026-02-01T00:00:00Z'), total_kg: 10, donation_count: 1 },
      ])

      const result = await service.monthlyKg()

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1)
      expect(result).toEqual([
        { month: new Date('2026-01-01T00:00:00Z'), totalKg: 42.5, donationCount: 3 },
        { month: new Date('2026-02-01T00:00:00Z'), totalKg: 10, donationCount: 1 },
      ])
    })

    it('lida com resultado vazio', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      const result = await service.monthlyKg({ year: 2026, donorId: 'd1' })
      expect(result).toEqual([])
    })
  })

  describe('byDonor', () => {
    it('agrupa por doador e junta o nome', async () => {
      mockPrisma.donation.groupBy.mockResolvedValue([
        { donorId: 'd1', _sum: { collectedQuantityKg: 30 }, _count: 2 },
        { donorId: 'd2', _sum: { collectedQuantityKg: 50 }, _count: 1 },
      ])
      mockPrisma.donor.findMany.mockResolvedValue([
        { id: 'd1', name: 'Mercado X' },
        { id: 'd2', name: 'Restaurante Y' },
      ])

      const result = await service.byDonor()

      expect(result).toEqual([
        { donorId: 'd2', donorName: 'Restaurante Y', totalKg: 50, donationCount: 1 },
        { donorId: 'd1', donorName: 'Mercado X', totalKg: 30, donationCount: 2 },
      ])
    })
  })

  describe('byRecipient', () => {
    it('agrupa por receptor, ignora recipientId nulo e ordena por kg desc', async () => {
      mockPrisma.donation.groupBy.mockResolvedValue([
        { recipientId: 'r1', _sum: { collectedQuantityKg: 12 }, _count: 4 },
      ])
      mockPrisma.recipient.findMany.mockResolvedValue([{ id: 'r1', name: 'ONG Mesa Solidária' }])

      const result = await service.byRecipient({ year: 2026 })

      expect(result).toEqual([
        { recipientId: 'r1', recipientName: 'ONG Mesa Solidária', totalKg: 12, donationCount: 4 },
      ])
    })
  })

  describe('summary', () => {
    it('agrega kg resgatado e contagens pros cards de KPI', async () => {
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { collectedQuantityKg: 100 }, _count: 7 })
      mockPrisma.donor.count.mockResolvedValue(5)
      mockPrisma.recipient.count.mockResolvedValue(3)
      mockPrisma.pickupRoute.count.mockResolvedValue(4)
      mockPrisma.donation.count.mockResolvedValue(6)

      const result = await service.summary()

      expect(result).toEqual({
        totalKgRescued: 100,
        totalDonationsRescued: 7,
        deliveredDonations: 6,
        completedRoutes: 4,
        activeDonors: 5,
        activeRecipients: 3,
      })
    })
  })
})
