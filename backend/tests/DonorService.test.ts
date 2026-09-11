import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'
import { DonorService } from '../src/services/DonorService'
import { ForbiddenError, NotFoundError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  donor: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const admin = { id: 'admin_1', role: Role.ADMIN }
const donorUser = { id: 'user_1', role: Role.DOADOR }
const otherDonorUser = { id: 'user_2', role: Role.DOADOR }

describe('DonorService', () => {
  let service: DonorService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DonorService()
  })

  it('cria um doador', async () => {
    mockPrisma.donor.create.mockResolvedValue({ id: 'd1', name: 'Mercado X' })
    const result = await service.create({ name: 'Mercado X' })
    expect(result).toEqual({ id: 'd1', name: 'Mercado X' })
    expect(mockPrisma.donor.create).toHaveBeenCalledWith({ data: { name: 'Mercado X' } })
  })

  it('findAll filtra por ativo por padrão (não inclui inativos)', async () => {
    mockPrisma.donor.findMany.mockResolvedValue([])
    mockPrisma.donor.count.mockResolvedValue(0)

    await service.findAll({}, { page: 1, limit: 20, skip: 0 })

    expect(mockPrisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } }),
    )
  })

  it('findAll com includeInactive não filtra por active', async () => {
    mockPrisma.donor.findMany.mockResolvedValue([])
    mockPrisma.donor.count.mockResolvedValue(0)

    await service.findAll({ includeInactive: true }, { page: 1, limit: 20, skip: 0 })

    expect(mockPrisma.donor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })

  it('ADMIN acessa qualquer doador', async () => {
    mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', userId: 'user_1' })
    const donor = await service.findById('d1', admin)
    expect(donor.id).toBe('d1')
  })

  it('DOADOR acessa o próprio cadastro', async () => {
    mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', userId: donorUser.id })
    const donor = await service.findById('d1', donorUser)
    expect(donor.id).toBe('d1')
  })

  it('DOADOR não acessa o cadastro de outro doador', async () => {
    mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', userId: donorUser.id })
    await expect(service.findById('d1', otherDonorUser)).rejects.toThrow(ForbiddenError)
  })

  it('lança NotFoundError pra id inexistente', async () => {
    mockPrisma.donor.findUnique.mockResolvedValue(null)
    await expect(service.findById('inexistente', admin)).rejects.toThrow(NotFoundError)
  })

  it('deactivate marca active=false', async () => {
    mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', active: true })
    await service.deactivate('d1')
    expect(mockPrisma.donor.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { active: false } })
  })
})
