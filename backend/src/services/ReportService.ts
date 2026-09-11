import { DonationStatus, PickupRouteStatus, Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'

interface MonthlyKgFilter {
  year?: number
  donorId?: string
  recipientId?: string
}

interface ByGroupFilter {
  year?: number
}

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
