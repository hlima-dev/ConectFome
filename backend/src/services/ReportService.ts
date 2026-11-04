import { DonationStatus, PickupRouteStatus, Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { toCsv } from '../utils/csv'

interface MonthlyKgFilter {
  year?: number
  donorId?: string
  recipientId?: string
}

interface ByGroupFilter {
  year?: number
}

// Período em datas inclusivas (AAAA-MM-DD, tratadas em UTC). Vazio = sem limite.
export interface PeriodFilter {
  from?: string
  to?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

// Doações "do período" = as registradas nele (createdAt). O fim é inclusivo:
// `to` = 2026-11-30 inclui tudo até 30/11 às 23:59.
function createdAtRange(period: PeriodFilter) {
  if (!period.from && !period.to) return {}
  return {
    createdAt: {
      ...(period.from ? { gte: new Date(`${period.from}T00:00:00.000Z`) } : {}),
      ...(period.to ? { lt: new Date(new Date(`${period.to}T00:00:00.000Z`).getTime() + DAY_MS) } : {}),
    },
  }
}

const ratio = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 1000 : null)

// COLETADA e ENTREGUE contam juntas como "resgatado" em todo relatório — o
// resgate de verdade já aconteceu na coleta; ENTREGUE é só um estado
// posterior da mesma doação (ver nota no schema sobre o ciclo de status).
const RESCUED_STATUSES: DonationStatus[] = [DonationStatus.COLETADA, DonationStatus.ENTREGUE]

export class ReportService {
  // Agregação mensal precisa truncar data, o que o query builder do Prisma
  // não faz sozinho — por isso SQL cru aqui (com Prisma.sql, nunca
  // concatenação de string), enquanto os relatórios por doador/receptor
  // abaixo usam groupBy normalmente. Escolha deliberada: cada ferramenta
  // onde ela realmente é necessária, não SQL cru em tudo.
  async monthlyKg(filter: MonthlyKgFilter = {}) {
    const conditions = [Prisma.sql`status IN ('COLETADA', 'ENTREGUE')`, Prisma.sql`"collectedAt" IS NOT NULL`]

    if (filter.year) {
      conditions.push(Prisma.sql`EXTRACT(YEAR FROM "collectedAt") = ${filter.year}`)
    }
    if (filter.donorId) {
      conditions.push(Prisma.sql`"donorId" = ${filter.donorId}`)
    }
    if (filter.recipientId) {
      conditions.push(Prisma.sql`"recipientId" = ${filter.recipientId}`)
    }

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

    const rows = await prisma.$queryRaw<{ month: Date; total_kg: number; donation_count: number }[]>(Prisma.sql`
      SELECT date_trunc('month', "collectedAt") AS month,
             SUM("collectedQuantityKg")::float AS total_kg,
             COUNT(*)::int AS donation_count
      FROM donations
      ${where}
      GROUP BY month
      ORDER BY month ASC
    `)

    return rows.map((row) => ({
      month: row.month,
      totalKg: Number(row.total_kg ?? 0),
      donationCount: Number(row.donation_count ?? 0),
    }))
  }

  async byDonor(filter: ByGroupFilter = {}) {
    const grouped = await prisma.donation.groupBy({
      by: ['donorId'],
      where: { status: { in: RESCUED_STATUSES }, ...this.yearRange(filter.year) },
      _sum: { collectedQuantityKg: true },
      _count: true,
    })

    const donors = await prisma.donor.findMany({
      where: { id: { in: grouped.map((g) => g.donorId) } },
      select: { id: true, name: true },
    })
    const donorNames = new Map(donors.map((d) => [d.id, d.name]))

    return grouped
      .map((g) => ({
        donorId: g.donorId,
        donorName: donorNames.get(g.donorId) ?? 'Desconhecido',
        totalKg: Number(g._sum.collectedQuantityKg ?? 0),
        donationCount: g._count,
      }))
      .sort((a, b) => b.totalKg - a.totalKg)
  }

  async byRecipient(filter: ByGroupFilter = {}) {
    const grouped = await prisma.donation.groupBy({
      by: ['recipientId'],
      where: { status: { in: RESCUED_STATUSES }, recipientId: { not: null }, ...this.yearRange(filter.year) },
      _sum: { collectedQuantityKg: true },
      _count: true,
    })

    const ids = grouped.map((g) => g.recipientId).filter((id): id is string => !!id)
    const recipients = await prisma.recipient.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    const recipientNames = new Map(recipients.map((r) => [r.id, r.name]))

    return grouped
      .filter((g): g is typeof g & { recipientId: string } => !!g.recipientId)
      .map((g) => ({
        recipientId: g.recipientId,
        recipientName: recipientNames.get(g.recipientId) ?? 'Desconhecido',
        totalKg: Number(g._sum.collectedQuantityKg ?? 0),
        donationCount: g._count,
      }))
      .sort((a, b) => b.totalKg - a.totalKg)
  }

  // Alimenta os cards de KPI do Dashboard.
  async summary() {
    const [aggregate, activeDonors, activeRecipients, completedRoutes, deliveredDonations] = await Promise.all([
      prisma.donation.aggregate({
        where: { status: { in: RESCUED_STATUSES } },
        _sum: { collectedQuantityKg: true },
        _count: true,
      }),
      prisma.donor.count({ where: { active: true } }),
      prisma.recipient.count({ where: { active: true } }),
      prisma.pickupRoute.count({ where: { status: PickupRouteStatus.CONCLUIDA } }),
      prisma.donation.count({ where: { status: DonationStatus.ENTREGUE } }),
    ])

    return {
      totalKgRescued: Number(aggregate._sum.collectedQuantityKg ?? 0),
      totalDonationsRescued: aggregate._count,
      deliveredDonations,
      completedRoutes,
      activeDonors,
      activeRecipients,
    }
  }

  // Indicadores do período. As taxas são frações (0 a 1) ou null quando não há
  // base de cálculo. "Resgatada" = coletada ou entregue (igual ao resto dos
  // relatórios); "perda" = vencida antes da coleta.
  async rates(period: PeriodFilter = {}) {
    const where = createdAtRange(period)

    const [byStatus, kg, avg, delivered] = await Promise.all([
      prisma.donation.groupBy({ by: ['status'], where, _count: true }),
      prisma.donation.groupBy({
        by: ['status'],
        where: { ...where, status: { in: [...RESCUED_STATUSES, DonationStatus.VENCIDA] } },
        _sum: { collectedQuantityKg: true, estimatedQuantityKg: true },
      }),
      this.avgHoursToCollect(period),
      prisma.donation.findMany({
        where: { ...where, status: DonationStatus.ENTREGUE, recipientId: { not: null } },
        distinct: ['recipientId'],
        select: { recipient: { select: { peopleServed: true } } },
      }),
    ])

    const count = (status: DonationStatus) => byStatus.find((g) => g.status === status)?._count ?? 0
    const registered = byStatus.reduce((sum, g) => sum + g._count, 0)
    const rescued = RESCUED_STATUSES.reduce((sum, st) => sum + count(st), 0)
    const expired = count(DonationStatus.VENCIDA)
    const deliveredCount = count(DonationStatus.ENTREGUE)

    const rescuedKg = kg
      .filter((g) => RESCUED_STATUSES.includes(g.status))
      .reduce((sum, g) => sum + Number(g._sum.collectedQuantityKg ?? 0), 0)
    const lostKg = Number(kg.find((g) => g.status === DonationStatus.VENCIDA)?._sum.estimatedQuantityKg ?? 0)

    return {
      registered,
      rescued,
      delivered: deliveredCount,
      expired,
      canceled: count(DonationStatus.CANCELADA),
      rescueRate: ratio(rescued, registered),
      lossRate: ratio(expired, registered),
      // Entregues sobre as que chegaram a ser coletadas.
      deliveryRate: ratio(deliveredCount, rescued),
      rescuedKg: Math.round(rescuedKg * 100) / 100,
      lostKg: Math.round(lostKg * 100) / 100,
      avgHoursToCollect: avg,
      // Soma de pessoas atendidas pelas instituições que receberam ao menos uma
      // entrega no período (cada instituição conta uma vez). Famílias sem o
      // campo preenchido contam zero.
      peopleServed: delivered.reduce((sum, d) => sum + (d.recipient?.peopleServed ?? 0), 0),
    }
  }

  // Média de horas entre o registro da doação e a coleta, nas resgatadas do período.
  private async avgHoursToCollect(period: PeriodFilter): Promise<number | null> {
    // `collectedAt >= createdAt` descarta dados inconsistentes (coleta "antes" do
    // registro, p.ex. importações), que dariam média negativa.
    const conditions = [
      Prisma.sql`status IN ('COLETADA', 'ENTREGUE')`,
      Prisma.sql`"collectedAt" IS NOT NULL`,
      Prisma.sql`"collectedAt" >= "createdAt"`,
    ]
    if (period.from) conditions.push(Prisma.sql`"createdAt" >= ${new Date(`${period.from}T00:00:00.000Z`)}`)
    if (period.to) {
      conditions.push(Prisma.sql`"createdAt" < ${new Date(new Date(`${period.to}T00:00:00.000Z`).getTime() + DAY_MS)}`)
    }

    const rows = await prisma.$queryRaw<{ avg_hours: number | null }[]>(Prisma.sql`
      SELECT AVG(EXTRACT(EPOCH FROM ("collectedAt" - "createdAt")) / 3600)::float AS avg_hours
      FROM donations
      WHERE ${Prisma.join(conditions, ' AND ')}
    `)
    const value = rows[0]?.avg_hours
    return value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10
  }

  // Todas as doações registradas no período, uma por linha, para planilha
  // (prestação de contas, ESG). O texto livre é neutralizado contra injeção de fórmula.
  async donationsCsv(period: PeriodFilter = {}): Promise<string> {
    const donations = await prisma.donation.findMany({
      where: createdAtRange(period),
      include: { donor: { select: { name: true } }, recipient: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return toCsv(
      [
        'Código', 'Doador', 'Receptor', 'Categoria', 'Descrição', 'Armazenamento', 'Kg estimado', 'Kg coletado',
        'Status', 'Registrada em', 'Coletada em', 'Entregue em', 'Vencida em', 'Cancelada em',
      ],
      donations.map((d) => [
        d.id,
        d.donor.name,
        d.recipient?.name,
        d.category,
        d.description,
        d.storageCondition,
        Number(d.estimatedQuantityKg),
        d.collectedQuantityKg === null ? null : Number(d.collectedQuantityKg),
        d.status,
        d.createdAt,
        d.collectedAt,
        d.confirmedAt,
        d.expiredAt,
        d.canceledAt,
      ]),
    )
  }

  private yearRange(year?: number) {
    if (!year) return {}
    return {
      collectedAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    }
  }
}
