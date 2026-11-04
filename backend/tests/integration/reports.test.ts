import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DonationStatus, Role } from '@prisma/client'
import { prisma } from '../../src/config/prisma'
import { DonationService } from '../../src/services/DonationService'
import { ReportService } from '../../src/services/ReportService'

const reports = new ReportService()
const donations = new DonationService()
const at = (iso: string) => new Date(iso)

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE notifications, donation_events, donations, pickup_routes, vehicles, volunteers, donors, recipients, users RESTART IDENTITY CASCADE',
  )
}

describe('indicadores, CSV e comprovante (PostgreSQL real)', () => {
  let donorUser: { id: string; role: Role }
  let otherDonorUser: { id: string; role: Role }
  let adminUser: { id: string; role: Role }
  let deliveredId: string

  beforeAll(async () => {
    await resetDatabase()
    const admin = await prisma.user.create({ data: { name: 'Adm', email: 'a@t.org', password: 'x', role: Role.ADMIN } })
    adminUser = { id: admin.id, role: Role.ADMIN }
    const u1 = await prisma.user.create({
      data: { name: 'Padaria', email: 'p@t.org', password: 'x', role: Role.DOADOR, donorProfile: { create: { name: 'Padaria', document: '11.222.333/0001-44', address: 'Rua A, 1', city: 'Sorocaba', state: 'SP' } } },
    })
    donorUser = { id: u1.id, role: Role.DOADOR }
    const u2 = await prisma.user.create({
      data: { name: 'Mercado', email: 'm@t.org', password: 'x', role: Role.DOADOR, donorProfile: { create: { name: 'Mercado' } } },
    })
    otherDonorUser = { id: u2.id, role: Role.DOADOR }
    const donor = await prisma.donor.findUniqueOrThrow({ where: { userId: u1.id } })
    const ongA = await prisma.recipient.create({ data: { name: 'ONG A', peopleServed: 120 } })
    const ongB = await prisma.recipient.create({ data: { name: 'ONG B', peopleServed: 30 } })

    const base = { donorId: donor.id, pickupWindowStart: at('2026-10-01T00:00:00Z'), pickupWindowEnd: at('2026-10-30T00:00:00Z') }
    // outubro: 2 entregues (ONG A 2x, conta uma vez), 1 coletada (ONG B), 1 vencida, 1 cancelada, 1 disponível
    const mk = (over: Record<string, unknown>) =>
      prisma.donation.create({ data: { ...base, description: 'x', estimatedQuantityKg: 10, ...over } as never })
    deliveredId = (
      await mk({ description: 'Entregue 1', status: DonationStatus.ENTREGUE, recipientId: ongA.id, createdAt: at('2026-10-10T10:00:00Z'), collectedAt: at('2026-10-10T22:00:00Z'), confirmedAt: at('2026-10-11T10:00:00Z'), collectedQuantityKg: 8 })
    ).id
    await mk({ description: 'Entregue 2', status: DonationStatus.ENTREGUE, recipientId: ongA.id, createdAt: at('2026-10-12T10:00:00Z'), collectedAt: at('2026-10-13T10:00:00Z'), confirmedAt: at('2026-10-13T12:00:00Z'), collectedQuantityKg: 12 })
    await mk({ description: 'Coletada', status: DonationStatus.COLETADA, recipientId: ongB.id, createdAt: at('2026-10-14T10:00:00Z'), collectedAt: at('2026-10-14T16:00:00Z'), collectedQuantityKg: 5 })
    await mk({ description: 'Vencida', status: DonationStatus.VENCIDA, estimatedQuantityKg: 7.5, createdAt: at('2026-10-15T10:00:00Z'), expiredAt: at('2026-10-16T10:00:00Z') })
    await mk({ description: 'Cancelada', status: DonationStatus.CANCELADA, createdAt: at('2026-10-16T10:00:00Z'), canceledAt: at('2026-10-16T12:00:00Z') })
    await mk({ description: 'Disponível', status: DonationStatus.DISPONIVEL, createdAt: at('2026-10-17T10:00:00Z') })
    // novembro: 1 entregue (fora do período de outubro)
    await mk({ description: 'Entregue nov', status: DonationStatus.ENTREGUE, recipientId: ongB.id, createdAt: at('2026-11-02T10:00:00Z'), collectedAt: at('2026-11-02T12:00:00Z'), confirmedAt: at('2026-11-02T13:00:00Z'), collectedQuantityKg: 3 })
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('calcula as taxas, kg, tempo médio e pessoas atendidas de outubro', async () => {
    const r = await reports.rates({ from: '2026-10-01', to: '2026-10-31' })

    expect(r).toMatchObject({ registered: 6, rescued: 3, delivered: 2, expired: 1, canceled: 1 })
    expect(r.rescueRate).toBe(0.5)
    expect(r.lossRate).toBeCloseTo(0.167, 3)
    expect(r.deliveryRate).toBeCloseTo(0.667, 3)
    expect(r.rescuedKg).toBe(25)
    expect(r.lostKg).toBe(7.5)
    // (12 h + 24 h + 6 h) / 3 = 14 h entre registro e coleta
    expect(r.avgHoursToCollect).toBe(14)
    // só ONG A recebeu entrega em outubro (2 entregas, conta uma vez): 120 pessoas
    expect(r.peopleServed).toBe(120)
  })

  it('ignora doações com coleta anterior ao registro (dado inconsistente) no tempo médio', async () => {
    const donor = await prisma.donor.findFirstOrThrow()
    const bad = await prisma.donation.create({
      data: {
        donorId: donor.id, description: 'incoerente', estimatedQuantityKg: 1, collectedQuantityKg: 1,
        pickupWindowStart: at('2026-09-01T00:00:00Z'), pickupWindowEnd: at('2026-09-30T00:00:00Z'),
        status: DonationStatus.COLETADA, createdAt: at('2026-09-10T10:00:00Z'), collectedAt: at('2026-09-01T10:00:00Z'),
      },
    })
    const r = await reports.rates({ from: '2026-09-01', to: '2026-09-30' })
    expect(r.registered).toBe(1)
    expect(r.avgHoursToCollect).toBeNull()
    await prisma.donation.delete({ where: { id: bad.id } })
  })

  it('o último dia do período é inclusivo e o período é por data de registro', async () => {
    const lastDay = await reports.rates({ from: '2026-10-17', to: '2026-10-17' })
    expect(lastDay.registered).toBe(1) // a doação disponível criada às 10:00 de 17/10
    const nov = await reports.rates({ from: '2026-11-01', to: '2026-11-30' })
    expect(nov).toMatchObject({ registered: 1, delivered: 1, peopleServed: 30, avgHoursToCollect: 2 })
  })

  it('sem período considera tudo; período sem doações devolve taxas nulas', async () => {
    expect((await reports.rates()).registered).toBe(7)
    const empty = await reports.rates({ from: '2025-01-01', to: '2025-01-31' })
    expect(empty).toMatchObject({ registered: 0, rescueRate: null, lossRate: null, deliveryRate: null, avgHoursToCollect: null, peopleServed: 0 })
  })

  it('exporta CSV só com as doações do período, na ordem de registro', async () => {
    const csv = await reports.donationsCsv({ from: '2026-10-01', to: '2026-10-31' })
    const lines = csv.replace('﻿', '').trim().split('\r\n')
    expect(lines).toHaveLength(1 + 6)
    expect(lines[1]).toContain('Entregue 1')
    expect(lines[1]).toContain('Padaria')
    expect(lines[1]).toContain('ONG A')
    expect(lines[1]).toMatch(/;8;ENTREGUE;10\/10\/2026 07:00;10\/10\/2026 19:00;11\/10\/2026 07:00;;$/)
    expect(csv).not.toContain('Entregue nov')
  })

  it('o comprovante sai para o doador dono e o administrador, e não para outro doador', async () => {
    const receipt = await donations.getReceipt(deliveredId, donorUser)
    expect(receipt.donor).toEqual({ name: 'Padaria', document: '11.222.333/0001-44', address: 'Rua A, 1, Sorocaba, SP' })
    expect(receipt.recipient?.name).toBe('ONG A')
    expect(receipt.donation).toMatchObject({ collectedQuantityKg: 8, estimatedQuantityKg: 10 })
    expect((await donations.getReceipt(deliveredId, adminUser)).number).toBe(receipt.number)
    await expect(donations.getReceipt(deliveredId, otherDonorUser)).rejects.toThrow(/próprias doações/)
  })

  it('não há comprovante para doação disponível', async () => {
    const available = await prisma.donation.findFirstOrThrow({ where: { status: DonationStatus.DISPONIVEL } })
    await expect(donations.getReceipt(available.id, adminUser)).rejects.toThrow(/depois que a doação for coletada/)
  })
})
