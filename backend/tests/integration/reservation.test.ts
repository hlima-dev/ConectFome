import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DonationAction, DonationStatus, FoodCategory, Role, StorageCondition } from '@prisma/client'
import { prisma } from '../../src/config/prisma'
import { DonationService } from '../../src/services/DonationService'
import { NotificationService } from '../../src/services/NotificationService'
import { ConflictError } from '../../src/utils/AppError'

const donations = new DonationService()
const notifications = new NotificationService()
const page = { page: 1, limit: 20, skip: 0 }

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE notifications, donation_events, donations, pickup_routes, vehicles, volunteers, donors, recipients, users RESTART IDENTITY CASCADE',
  )
}

const hours = (h: number) => new Date(Date.now() + h * 3_600_000)

async function makeRecipient(name: string, city: string) {
  const user = await prisma.user.create({
    data: { name, email: `${name}@t.org`, password: 'x', role: Role.RECEPTOR, recipientProfile: { create: { name, city } } },
  })
  return { user, actor: { id: user.id, role: Role.RECEPTOR as Role }, profile: await prisma.recipient.findUniqueOrThrow({ where: { userId: user.id } }) }
}

describe('reserva e notificações (PostgreSQL real)', () => {
  let donorActor: { id: string; role: Role }
  let adminActor: { id: string; role: Role }
  let ongSoro: Awaited<ReturnType<typeof makeRecipient>>
  let ongSoro2: Awaited<ReturnType<typeof makeRecipient>>
  let ongOutraCidade: Awaited<ReturnType<typeof makeRecipient>>

  beforeAll(async () => {
    await resetDatabase()
    const admin = await prisma.user.create({ data: { name: 'Adm', email: 'adm@t.org', password: 'x', role: Role.ADMIN } })
    adminActor = { id: admin.id, role: Role.ADMIN }
    const donor = await prisma.user.create({
      data: { name: 'Padaria', email: 'p@t.org', password: 'x', role: Role.DOADOR, donorProfile: { create: { name: 'Padaria', city: 'Sorocaba', state: 'SP' } } },
    })
    donorActor = { id: donor.id, role: Role.DOADOR }
    ongSoro = await makeRecipient('ongsoro', 'sorocaba')
    ongSoro2 = await makeRecipient('ongsoro2', 'Sorocaba')
    ongOutraCidade = await makeRecipient('ongoutra', 'Campinas')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  const newDonation = (description: string, windowHours = 10, category: FoodCategory = FoodCategory.PADARIA) =>
    donations.create(
      {
        category,
        storageCondition: StorageCondition.AMBIENTE,
        description,
        estimatedQuantityKg: 5,
        pickupWindowStart: new Date(),
        pickupWindowEnd: hours(windowHours),
        acceptTerms: true,
      },
      donorActor,
    )

  it('criar uma doação avisa os receptores da mesma cidade (sem diferenciar maiúsculas) e o administrador, mas não os de outra cidade nem o doador', async () => {
    await newDonation('Pães de hoje')

    const [a, b, outra, adm, doador] = await Promise.all(
      [ongSoro.user, ongSoro2.user, ongOutraCidade.user, { id: adminActor.id }, { id: donorActor.id }].map((u) =>
        notifications.list(u.id),
      ),
    )
    expect(a.items).toHaveLength(1)
    expect(a.items[0]).toMatchObject({ action: DonationAction.CRIADA })
    expect(a.items[0].message).toContain('Pães de hoje')
    expect(b.items).toHaveLength(1)
    expect(adm.items).toHaveLength(1)
    expect(outra.items).toHaveLength(0)
    expect(doador.items).toHaveLength(0)
  })

  it('duas reservas simultâneas da mesma doação: uma vence, a outra recebe conflito', async () => {
    const donation = await newDonation('Bolo único')

    const results = await Promise.allSettled([
      donations.reserve(donation.id, ongSoro.actor),
      donations.reserve(donation.id, ongSoro2.actor),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toBeInstanceOf(ConflictError)

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })
    expect(after.status).toBe(DonationStatus.RESERVADA)
    const winner = (fulfilled[0] as PromiseFulfilledResult<{ recipientId: string }>).value.recipientId
    expect(after.recipientId).toBe(winner)

    // exatamente um evento RESERVADA, e o doador foi avisado uma vez
    const events = await prisma.donationEvent.findMany({ where: { donationId: donation.id, action: DonationAction.RESERVADA } })
    expect(events).toHaveLength(1)
    const donorNotes = await prisma.notification.findMany({ where: { userId: donorActor.id, donationId: donation.id, action: DonationAction.RESERVADA } })
    expect(donorNotes).toHaveLength(1)
  })

  it('o painel lista só DISPONÍVEL e dentro do prazo, da mais urgente para a menos, com filtro de cidade', async () => {
    await prisma.donation.deleteMany()
    const longe = await newDonation('Longe', 100)
    const perto = await newDonation('Perto', 3)
    const vencida = await newDonation('Vencida de prazo', 5)
    await prisma.donation.update({ where: { id: vencida.id }, data: { pickupWindowEnd: hours(-1) } })
    const reservada = await newDonation('Já reservada', 2)
    await donations.reserve(reservada.id, ongSoro.actor)

    const result = await donations.opportunities({}, page, ongSoro2.actor)
    expect(result.data.map((d) => d.id)).toEqual([perto.id, longe.id])
    expect(result.data[0].urgency?.level).toBe('URGENT')
    expect(result.data[1].urgency?.level).toBe('NORMAL')
    expect(result.data[0].donor).toMatchObject({ name: 'Padaria', city: 'Sorocaba' })
    // o endereço completo do doador não vai no painel
    expect(result.data[0].donor).not.toHaveProperty('address')

    expect((await donations.opportunities({ city: 'soroc' }, page, ongSoro2.actor)).data).toHaveLength(2)
    expect((await donations.opportunities({ city: 'campinas' }, page, ongSoro2.actor)).data).toHaveLength(0)
    expect((await donations.opportunities({ category: FoodCategory.HORTIFRUTI }, page, ongSoro2.actor)).data).toHaveLength(0)
  })

  it('liberar devolve a doação ao painel e permite que outro receptor reserve; reatribuição pelo admin', async () => {
    await prisma.donation.deleteMany()
    const donation = await newDonation('Pão de forma')
    await donations.reserve(donation.id, ongSoro.actor)

    await donations.release(donation.id, ongSoro.actor)
    expect((await donations.opportunities({}, page, ongSoro2.actor)).data.map((d) => d.id)).toContain(donation.id)

    const second = await donations.reserve(donation.id, ongSoro2.actor)
    expect(second.recipientId).toBe(ongSoro2.profile.id)

    // admin reatribui a reserva para outra ONG, sem passar pelo painel
    await donations.match(donation.id, ongOutraCidade.profile.id, adminActor)
    const after = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })
    expect(after.recipientId).toBe(ongOutraCidade.profile.id)

    const actions = (await donations.findEvents(donation.id, adminActor)).map((e) => e.action)
    expect(actions).toEqual([
      DonationAction.CRIADA,
      DonationAction.RESERVADA,
      DonationAction.LIBERADA,
      DonationAction.RESERVADA,
      DonationAction.CASADA,
    ])
  })

  it('marcar como lida só funciona para o dono da notificação', async () => {
    const [mine] = (await notifications.list(ongSoro.user.id)).items
    await expect(notifications.markRead(mine.id, ongSoro2.user.id)).rejects.toThrow()
    await notifications.markRead(mine.id, ongSoro.user.id)
    const { unreadCount } = await notifications.list(ongSoro.user.id)
    const all = await prisma.notification.count({ where: { userId: ongSoro.user.id } })
    expect(unreadCount).toBe(all - 1)
    await notifications.markAllRead(ongSoro.user.id)
    expect((await notifications.list(ongSoro.user.id)).unreadCount).toBe(0)
  })
})
