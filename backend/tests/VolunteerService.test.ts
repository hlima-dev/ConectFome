import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VolunteerService } from '../src/services/VolunteerService'
import { NotFoundError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  volunteer: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
}))
vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const page = { page: 1, limit: 10, skip: 0 }

describe('VolunteerService', () => {
  let service: VolunteerService
  beforeEach(() => {
    vi.clearAllMocks()
    service = new VolunteerService()
  })

  it('cria um voluntário', async () => {
    mockPrisma.volunteer.create.mockResolvedValue({ id: 'v1' })
    await service.create({ name: 'Zé', document: '111', phone: '9' })
    expect(mockPrisma.volunteer.create).toHaveBeenCalledWith({ data: { name: 'Zé', document: '111', phone: '9' } })
  })

  it('lista só os ativos por padrão, ordenados por nome, com paginação', async () => {
    mockPrisma.volunteer.findMany.mockResolvedValue([{ id: 'v1' }])
    mockPrisma.volunteer.count.mockResolvedValue(25)

    const result = await service.findAll({}, { page: 2, limit: 10, skip: 10 })

    expect(mockPrisma.volunteer.findMany).toHaveBeenCalledWith({ where: { active: true }, skip: 10, take: 10, orderBy: { name: 'asc' } })
    expect(result.meta).toMatchObject({ total: 25, totalPages: 3, hasNext: true, hasPrev: true })
  })

  it('includeInactive não filtra por ativo', async () => {
    mockPrisma.volunteer.findMany.mockResolvedValue([])
    mockPrisma.volunteer.count.mockResolvedValue(0)
    await service.findAll({ includeInactive: true }, page)
    expect(mockPrisma.volunteer.findMany.mock.calls[0][0].where).toEqual({})
  })

  it('busca por nome sem diferenciar maiúsculas', async () => {
    mockPrisma.volunteer.findMany.mockResolvedValue([])
    mockPrisma.volunteer.count.mockResolvedValue(0)
    await service.findAll({ search: 'zé' }, page)
    expect(mockPrisma.volunteer.findMany.mock.calls[0][0].where).toEqual({
      active: true,
      name: { contains: 'zé', mode: 'insensitive' },
    })
  })

  it('findById: devolve ou lança NotFoundError', async () => {
    mockPrisma.volunteer.findUnique.mockResolvedValue({ id: 'v1' })
    await expect(service.findById('v1')).resolves.toEqual({ id: 'v1' })
    mockPrisma.volunteer.findUnique.mockResolvedValue(null)
    await expect(service.findById('x')).rejects.toThrow(NotFoundError)
  })

  it('update altera só o que veio e exige que o voluntário exista', async () => {
    mockPrisma.volunteer.findUnique.mockResolvedValue({ id: 'v1' })
    mockPrisma.volunteer.update.mockResolvedValue({ id: 'v1' })
    await service.update('v1', { phone: '99' })
    expect(mockPrisma.volunteer.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { phone: '99' } })

    mockPrisma.volunteer.findUnique.mockResolvedValue(null)
    await expect(service.update('x', { phone: '1' })).rejects.toThrow(NotFoundError)
  })

  it('deactivate faz exclusão lógica (active=false), nunca apaga', async () => {
    mockPrisma.volunteer.findUnique.mockResolvedValue({ id: 'v1' })
    await service.deactivate('v1')
    expect(mockPrisma.volunteer.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { active: false } })
    mockPrisma.volunteer.findUnique.mockResolvedValue(null)
    await expect(service.deactivate('x')).rejects.toThrow(NotFoundError)
  })
})
