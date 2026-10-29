import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DonationAction, DonationStatus, FoodCategory, Role, StorageCondition } from '@prisma/client'
import { prisma } from '../../src/config/prisma'
import { DonationService } from '../../src/services/DonationService'
import { PickupRouteService } from '../../src/services/PickupRouteService'
import { ReportService } from '../../src/services/ReportService'

const donations = new DonationService()
const routes = new PickupRouteService()
const reports = new ReportService()

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE donation_events, donations, pickup_routes, vehicles, volunteers, donors, recipients, users RESTART IDENTITY CASCADE',
  )
}

describe('ciclo de vida da doação (PostgreSQL real)', () => {
  beforeAll(resetDatabase)
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('percorre disponível → reservada → agendada → coletada → entregue e registra cada passo com o usuário', async () => {
    const admin = await prisma.user.create({ data: { name: 'Adm', email: 'adm@t.org', password: 'x', role: Role.ADMIN } })
    const donorUser = await prisma.user.create({
      data: { name: 'Mercado', email: 'm@t.org', password: 'x', role: Role.DOADOR, donorProfile: { create: { name: 'Mercado' } } },
    })
    const recipientUser = await prisma.user.create({
      data: { name: 'ONG', email: 'o@t.org', password: 'x', role: Role.RECEPTOR, recipientProfile: { create: { name: 'ONG' } } },
    })
    const recipient = await prisma.recipient.findUniqueOrThrow({ where: { userId: recipientUser.id } })
    const vehicle = await prisma.vehicle.create({ data: { plate: 'ABC1D23', model: 'Fiorino' } })
    const volunteer = await prisma.volunteer.create({ data: { name: 'Zé', document: '123' } })

    const donor = { id: donorUser.id, role: Role.DOADOR }
    const adm = { id: admin.id, role: Role.ADMIN }
    const rec = { id: recipientUser.id, role: Role.RECEPTOR }

    const donation = await donations.create(
      {
        category: FoodCategory.PERECIVEL,
        storageCondition: StorageCondition.REFRIGERADO,
        description: 'Iogurtes',
        estimatedQuantityKg: 35,
        pickupWindowStart: new Date(),
        pickupWindowEnd: new Date(Date.now() + 3_600_000),
        acceptTerms: true,
      },
      donor,
    )
    expect(donation.storageCondition).toBe(StorageCondition.REFRIGERADO)
    expect(donation.termsAcceptedAt).toBeInstanceOf(Date)

    await donations.match(donation.id, recipient.id, adm)

    const route = await routes.create({ vehicleId: vehicle.id, volunteerId: volunteer.id, scheduledFor: new Date() })
    await routes.attachDonation(route.id, donation.id, adm.id)
    await routes.start(route.id)
    await routes.complete(route.id, [{ donationId: donation.id, collectedQuantityKg: 32 }], adm.id)
    const delivered = await donations.confirmReceipt(donation.id, rec)
    expect(delivered.status).toBe(DonationStatus.ENTREGUE)

    const events = await donations.findEvents(donation.id, adm)
    expect(events.map((e) => [e.action, e.fromStatus, e.toStatus, e.actorId])).toEqual([
      [DonationAction.CRIADA, null, DonationStatus.DISPONIVEL, donorUser.id],
      [DonationAction.CASADA, DonationStatus.DISPONIVEL, DonationStatus.RESERVADA, admin.id],
      [DonationAction.AGENDADA, DonationStatus.RESERVADA, DonationStatus.AGENDADA, admin.id],
      [DonationAction.COLETADA, DonationStatus.AGENDADA, DonationStatus.COLETADA, admin.id],
      [DonationAction.CONFIRMADA, DonationStatus.COLETADA, DonationStatus.ENTREGUE, recipientUser.id],
    ])
    expect(events[0].actor?.name).toBe('Mercado')

    // a consulta SQL crua do relatório mensal, agora contra o banco de verdade
    const monthly = await reports.monthlyKg()
    expect(monthly).toHaveLength(1)
    expect(monthly[0]).toMatchObject({ totalKg: 32, donationCount: 1 })
  })

  it('cancelar uma rota planejada devolve a doação a reservada e registra o evento', async () => {
    const donor = await prisma.donor.findFirstOrThrow()
    const recipient = await prisma.recipient.findFirstOrThrow()
    const admin = await prisma.user.findFirstOrThrow({ where: { role: Role.ADMIN } })
    const vehicle = await prisma.vehicle.findFirstOrThrow()
    const volunteer = await prisma.volunteer.findFirstOrThrow()

    const donation = await prisma.donation.create({
      data: {
        donorId: donor.id,
        description: 'Pães',
        estimatedQuantityKg: 5,
        pickupWindowStart: new Date(),
        pickupWindowEnd: new Date(Date.now() + 3_600_000),
        status: DonationStatus.RESERVADA,
        recipientId: recipient.id,
      },
    })
    const route = await routes.create({ vehicleId: vehicle.id, volunteerId: volunteer.id, scheduledFor: new Date() })
    await routes.attachDonation(route.id, donation.id, admin.id)
    await routes.cancel(route.id, admin.id)

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })
    expect(after.status).toBe(DonationStatus.RESERVADA)
    expect(after.routeId).toBeNull()

    const events = await prisma.donationEvent.findMany({ where: { donationId: donation.id }, orderBy: { createdAt: 'asc' } })
    expect(events.map((e) => e.action)).toEqual([DonationAction.AGENDADA, DonationAction.DESAGENDADA])
  })
})
