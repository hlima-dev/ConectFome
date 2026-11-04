import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VehicleService } from '../src/services/VehicleService'
import { NotFoundError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  vehicle: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
}))
vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const page = { page: 1, limit: 10, skip: 0 }

describe('VehicleService', () => {
  let service: VehicleService
  beforeEach(() => {
    vi.clearAllMocks()
    service = new VehicleService()
  })

  it('cria um veículo com ou sem capacidade', async () => {
    mockPrisma.vehicle.create.mockResolvedValue({ id: 'v1' })
    await service.create({ plate: 'ABC1D23', model: 'Fiorino', capacityKg: 500 })
    expect(mockPrisma.vehicle.create).toHaveBeenCalledWith({ data: { plate: 'ABC1D23', model: 'Fiorino', capacityKg: 500 } })
    await service.create({ plate: 'XYZ9E88', model: 'Moto' })
    expect(mockPrisma.vehicle.create).toHaveBeenLastCalledWith({ data: { plate: 'XYZ9E88', model: 'Moto' } })
  })

  it('lista só os ativos, ordenados por placa', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([])
    mockPrisma.vehicle.count.mockResolvedValue(0)
    await service.findAll({}, page)
    expect(mockPrisma.vehicle.findMany).toHaveBeenCalledWith({ where: { active: true }, skip: 0, take: 10, orderBy: { plate: 'asc' } })
  })

  it('a busca procura na placa e no modelo', async () => {
    mockPrisma.vehicle.findMany.mockResolvedValue([])
    mockPrisma.vehicle.count.mockResolvedValue(0)
    await service.findAll({ search: 'fior' }, page)
    expect(mockPrisma.vehicle.findMany.mock.calls[0][0].where).toEqual({
      active: true,
      OR: [
        { plate: { contains: 'fior', mode: 'insensitive' } },
        { model: { contains: 'fior', mode: 'insensitive' } },
      ],
    })
  })

  it('findById, update e deactivate exigem que o veículo exista', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(null)
    await expect(service.findById('x')).rejects.toThrow(NotFoundError)
    await expect(service.update('x', { model: 'a' })).rejects.toThrow(NotFoundError)
    await expect(service.deactivate('x')).rejects.toThrow(NotFoundError)
    expect(mockPrisma.vehicle.update).not.toHaveBeenCalled()
  })

  it('update altera só o que veio; deactivate faz exclusão lógica', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1' })
    mockPrisma.vehicle.update.mockResolvedValue({ id: 'v1' })
    await service.update('v1', { capacityKg: 800 })
    expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { capacityKg: 800 } })
    await service.deactivate('v1')
    expect(mockPrisma.vehicle.update).toHaveBeenLastCalledWith({ where: { id: 'v1' }, data: { active: false } })
  })
})
