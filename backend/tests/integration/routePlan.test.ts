import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { DonationStatus, Role } from '@prisma/client'
import { prisma } from '../../src/config/prisma'
import { GeocodingService } from '../../src/services/GeocodingService'
import { PickupRouteService } from '../../src/services/PickupRouteService'
import { DonorService } from '../../src/services/DonorService'

const routes = new PickupRouteService()
const hours = (h: number) => new Date(Date.now() + h * 3_600_000)

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE notifications, donation_events, donations, pickup_routes, vehicles, volunteers, donors, recipients, users RESTART IDENTITY CASCADE',
  )
}

describe('geocodificação, plano de rota e capacidade (PostgreSQL real)', () => {
  let adminId: string
  let volunteerId: string

  beforeAll(async () => {
    await resetDatabase()
    adminId = (await prisma.user.create({ data: { name: 'Adm', email: 'adm@t.org', password: 'x', role: Role.ADMIN } })).id
    volunteerId = (await prisma.volunteer.create({ data: { name: 'Zé', document: '1' } })).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function reservedDonation(donorId: string, kg: number, windowHours: number) {
    const recipient = (await prisma.recipient.findFirst()) ?? (await prisma.recipient.create({ data: { name: 'ONG', city: 'Sorocaba', latitude: -23.4, longitude: -47.3 } }))
    return prisma.donation.create({
      data: {
        donorId,
        description: `lote ${kg} kg`,
        estimatedQuantityKg: kg,
        pickupWindowStart: new Date(),
        pickupWindowEnd: hours(windowHours),
        status: DonationStatus.RESERVADA,
        recipientId: recipient.id,
      },
    })
  }

  it('grava as coordenadas no cadastro a partir de um servidor de geocodificação (HTTP local)', async () => {
    const server = http.createServer((_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify([{ lat: '-23.5015', lon: '-47.4526' }]))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const donor = await new DonorService().create({ name: 'Padaria Geo' })
      await prisma.donor.update({ where: { id: donor.id }, data: { address: 'Rua XV, 1', city: 'Sorocaba' } })

      const geocoder = new GeocodingService({
        enabled: true,
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/search`,
        minIntervalMs: 0,
      })
      await geocoder.geocodeStoredProfile('donor', donor.id)

      const stored = await prisma.donor.findUniqueOrThrow({ where: { id: donor.id } })
      expect(stored.latitude).toBeCloseTo(-23.5015)
      expect(stored.longitude).toBeCloseTo(-47.4526)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('o detalhe da rota traz paradas ordenadas, a parada sem coordenadas e a carga', async () => {
    const vehicle = await prisma.vehicle.create({ data: { plate: 'AAA1A11', model: 'Fiorino', capacityKg: 100 } })
    const a = await prisma.donor.create({ data: { name: 'Urgente', address: 'Rua A', city: 'Sorocaba', latitude: -23.5, longitude: -47.45 } })
    const b = await prisma.donor.create({ data: { name: 'Perto', address: 'Rua B', city: 'Sorocaba', latitude: -23.51, longitude: -47.46 } })
    const c = await prisma.donor.create({ data: { name: 'Longe', address: 'Rua C', city: 'Votorantim', latitude: -23.6, longitude: -47.2 } })
    const d = await prisma.donor.create({ data: { name: 'Sem geo', address: 'Rua D', city: 'Sorocaba' } })

    const route = await routes.create({ vehicleId: vehicle.id, volunteerId, scheduledFor: new Date() })
    for (const [donor, kg, win] of [[c, 10, 40], [a, 20, 3], [d, 5, 30], [b, 15, 20]] as const) {
      const donation = await reservedDonation(donor.id, kg, win)
      await routes.attachDonation(route.id, donation.id, adminId)
    }

    const detail = await routes.findById(route.id)
    expect(detail.plan.stops.map((s) => s.donorName)).toEqual(['Urgente', 'Perto', 'Longe'])
    expect(detail.plan.unlocated.map((s) => s.donorName)).toEqual(['Sem geo'])
    expect(detail.plan.totalKm).toBeGreaterThan(0)
    expect(detail.plan.recipients).toHaveLength(1)
    expect(detail.load).toEqual({ totalKg: 50, capacityKg: 100, exceeds: false, remainingKg: 50 })
  })

  it('não deixa iniciar uma rota acima da capacidade do veículo, e libera depois de tirar doação', async () => {
    const vehicle = await prisma.vehicle.create({ data: { plate: 'BBB2B22', model: 'Moto', capacityKg: 30 } })
    const donor = await prisma.donor.create({ data: { name: 'Pesado', address: 'Rua P', city: 'Sorocaba', latitude: -23.5, longitude: -47.4 } })
    const route = await routes.create({ vehicleId: vehicle.id, volunteerId, scheduledFor: new Date() })
    const heavy = await reservedDonation(donor.id, 25, 10)
    const light = await reservedDonation(donor.id, 12, 10)
    await routes.attachDonation(route.id, heavy.id, adminId)
    await routes.attachDonation(route.id, light.id, adminId)

    expect((await routes.findById(route.id)).load.exceeds).toBe(true)
    await expect(routes.start(route.id)).rejects.toThrow(/excede a capacidade/)

    await routes.detachDonation(route.id, light.id, adminId)
    const started = await routes.start(route.id)
    expect(started.status).toBe('EM_ANDAMENTO')
  })
})
