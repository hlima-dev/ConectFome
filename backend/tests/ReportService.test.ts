import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportService } from '../src/services/ReportService'

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  donation: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
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

  describe('rates', () => {
    const groups = (rows: Record<string, number>) => Object.entries(rows).map(([status, n]) => ({ status, _count: n }))

    function givenData({ counts, kg = [], avg = null, delivered = [] }: { counts: Record<string, number>; kg?: unknown[]; avg?: number | null; delivered?: unknown[] }) {
      // 1ª chamada de groupBy = contagem por status; 2ª = soma de kg
      mockPrisma.donation.groupBy.mockResolvedValueOnce(groups(counts)).mockResolvedValueOnce(kg)
      mockPrisma.$queryRaw.mockResolvedValue([{ avg_hours: avg }])
      mockPrisma.donation.findMany.mockResolvedValue(delivered)
    }

    it('calcula as taxas de resgate, perda e entrega e arredonda a 3 casas', async () => {
      givenData({
        counts: { DISPONIVEL: 1, COLETADA: 2, ENTREGUE: 4, VENCIDA: 2, CANCELADA: 1 },
        kg: [
          { status: 'COLETADA', _sum: { collectedQuantityKg: 20, estimatedQuantityKg: 25 } },
          { status: 'ENTREGUE', _sum: { collectedQuantityKg: 80.456, estimatedQuantityKg: 90 } },
          { status: 'VENCIDA', _sum: { collectedQuantityKg: null, estimatedQuantityKg: 15.5 } },
        ],
        avg: 18.26,
        delivered: [{ recipient: { peopleServed: 120 } }, { recipient: { peopleServed: 6 } }, { recipient: { peopleServed: null } }, { recipient: null }],
      })

      const result = await service.rates()

      expect(result).toMatchObject({
        registered: 10,
        rescued: 6,
        delivered: 4,
        expired: 2,
        canceled: 1,
        rescueRate: 0.6,
        lossRate: 0.2,
        deliveryRate: 0.667, // 4 entregues de 6 coletadas
        rescuedKg: 100.46,
        lostKg: 15.5,
        avgHoursToCollect: 18.3,
        peopleServed: 126,
      })
    })

    it('sem doações no período: taxas nulas (não 0 nem NaN) e zeros nas contagens', async () => {
      givenData({ counts: {} })
      const result = await service.rates()
      expect(result).toMatchObject({
        registered: 0, rescued: 0, rescueRate: null, lossRate: null, deliveryRate: null,
        rescuedKg: 0, lostKg: 0, avgHoursToCollect: null, peopleServed: 0,
      })
    })

    it('nenhuma coletada: taxa de entrega é nula (evita dividir por zero)', async () => {
      givenData({ counts: { DISPONIVEL: 3, VENCIDA: 1 } })
      const result = await service.rates()
      expect(result.deliveryRate).toBeNull()
      expect(result.rescueRate).toBe(0)
      expect(result.lossRate).toBe(0.25)
    })

    it('aplica o período (inclusive o último dia) em todas as consultas', async () => {
      givenData({ counts: {} })
      await service.rates({ from: '2026-11-01', to: '2026-11-30' })

      const expected = { createdAt: { gte: new Date('2026-11-01T00:00:00.000Z'), lt: new Date('2026-12-01T00:00:00.000Z') } }
      expect(mockPrisma.donation.groupBy.mock.calls[0][0].where).toEqual(expected)
      expect(mockPrisma.donation.groupBy.mock.calls[1][0].where).toMatchObject(expected)
      expect(mockPrisma.donation.findMany.mock.calls[0][0].where).toMatchObject(expected)
    })

    it('sem período não filtra por data', async () => {
      givenData({ counts: {} })
      await service.rates()
      expect(mockPrisma.donation.groupBy.mock.calls[0][0].where).toEqual({})
    })
  })

  describe('donationsCsv', () => {
    it('gera cabeçalho e uma linha por doação, com decimal em vírgula e datas de Brasília', async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          id: 'abc', donor: { name: 'Padaria' }, recipient: { name: 'ONG' }, category: 'PADARIA', description: 'Pães',
          storageCondition: 'AMBIENTE', estimatedQuantityKg: '10.5', collectedQuantityKg: '9', status: 'ENTREGUE',
          createdAt: new Date('2026-11-01T15:00:00Z'), collectedAt: new Date('2026-11-02T15:00:00Z'),
          confirmedAt: new Date('2026-11-03T15:00:00Z'), expiredAt: null, canceledAt: null,
        },
      ])
      const csv = await service.donationsCsv()
      const [header, row] = csv.replace('\uFEFF', '').split('\r\n')

      expect(csv.startsWith('\uFEFF')).toBe(true)
      expect(header).toBe('Código;Doador;Receptor;Categoria;Descrição;Armazenamento;Kg estimado;Kg coletado;Status;Registrada em;Coletada em;Entregue em;Vencida em;Cancelada em')
      expect(row).toBe('abc;Padaria;ONG;PADARIA;Pães;AMBIENTE;10,5;9;ENTREGUE;01/11/2026 12:00;02/11/2026 12:00;03/11/2026 12:00;;')
    })

    it('neutraliza fórmula digitada em campo livre', async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          id: 'x', donor: { name: '=HYPERLINK("http://mau")' }, recipient: null, category: 'OUTRO', description: '+cmd|calc',
          storageCondition: 'AMBIENTE', estimatedQuantityKg: '1', collectedQuantityKg: null, status: 'DISPONIVEL',
          createdAt: new Date(), collectedAt: null, confirmedAt: null, expiredAt: null, canceledAt: null,
        },
      ])
      const csv = await service.donationsCsv()
      expect(csv).not.toMatch(/;=HYPERLINK/)
      expect(csv).toContain(`"'=HYPERLINK(""http://mau"")"`)
      expect(csv).toContain(";'+cmd|calc;")
    })

    it('período vazio: só o cabeçalho', async () => {
      mockPrisma.donation.findMany.mockResolvedValue([])
      const csv = await service.donationsCsv({ from: '2026-01-01' })
      expect(csv.trim().split('\r\n')).toHaveLength(1)
      expect(mockPrisma.donation.findMany.mock.calls[0][0].where).toEqual({ createdAt: { gte: new Date('2026-01-01T00:00:00.000Z') } })
    })
  })
})
