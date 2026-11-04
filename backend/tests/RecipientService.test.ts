import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'
import { RecipientService } from '../src/services/RecipientService'
import { ForbiddenError, NotFoundError } from '../src/utils/AppError'

const mockPrisma = vi.hoisted(() => ({
  recipient: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const geocodeStoredProfile = vi.hoisted(() => vi.fn())
vi.mock('../src/services/GeocodingService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/GeocodingService')>()),
  geocoder: { geocodeStoredProfile },
}))

const admin = { id: 'admin_1', role: Role.ADMIN }
const recipientUser = { id: 'user_1', role: Role.RECEPTOR }
const donorUser = { id: 'user_2', role: Role.DOADOR }

describe('RecipientService', () => {
  let service: RecipientService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new RecipientService()
  })

  it('ADMIN acessa qualquer receptor', async () => {
    mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', userId: recipientUser.id })
    const recipient = await service.findById('r1', admin)
    expect(recipient.id).toBe('r1')
  })

  it('RECEPTOR acessa o próprio cadastro', async () => {
    mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', userId: recipientUser.id })
    const recipient = await service.findById('r1', recipientUser)
    expect(recipient.id).toBe('r1')
  })

  it('um DOADOR nunca acessa cadastro de receptor', async () => {
    mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', userId: recipientUser.id })
    await expect(service.findById('r1', donorUser)).rejects.toThrow(ForbiddenError)
  })

  it('lança NotFoundError pra id inexistente', async () => {
    mockPrisma.recipient.findUnique.mockResolvedValue(null)
    await expect(service.findById('inexistente', admin)).rejects.toThrow(NotFoundError)
  })

  it('deactivate marca active=false', async () => {
    mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', active: true })
    await service.deactivate('r1')
    expect(mockPrisma.recipient.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { active: false } })
  })

  describe('geocodificação do endereço', () => {
    it('criar com endereço dispara a geocodificação em segundo plano', async () => {
      mockPrisma.recipient.create.mockResolvedValue({ id: 'x1', name: 'Nome' })
      await service.create({ name: 'Nome', address: 'Rua A, 10', city: 'Sorocaba' })
      expect(geocodeStoredProfile).toHaveBeenCalledWith('recipient', 'x1')
    })

    it('criar sem endereço não geocodifica', async () => {
      mockPrisma.recipient.create.mockResolvedValue({ id: 'x1', name: 'Nome' })
      await service.create({ name: 'Nome', phone: '1' })
      expect(geocodeStoredProfile).not.toHaveBeenCalled()
    })

    it('mudar o endereço apaga as coordenadas antigas e geocodifica de novo', async () => {
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'x1', userId: 'user_1' })
      mockPrisma.recipient.update.mockResolvedValue({ id: 'x1' })
      await service.update('x1', { city: 'Votorantim' }, admin)
      expect(mockPrisma.recipient.update).toHaveBeenCalledWith({
        where: { id: 'x1' },
        data: { city: 'Votorantim', latitude: null, longitude: null },
      })
      expect(geocodeStoredProfile).toHaveBeenCalledWith('recipient', 'x1')
    })

    it('editar só o telefone mantém as coordenadas', async () => {
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'x1', userId: 'user_1' })
      mockPrisma.recipient.update.mockResolvedValue({ id: 'x1' })
      await service.update('x1', { phone: '99' }, admin)
      expect(mockPrisma.recipient.update).toHaveBeenCalledWith({ where: { id: 'x1' }, data: { phone: '99' } })
      expect(geocodeStoredProfile).not.toHaveBeenCalled()
    })
  })
})
