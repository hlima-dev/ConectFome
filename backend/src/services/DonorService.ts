import { DonorType, Role } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ForbiddenError, NotFoundError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'

interface CreateDonorInput {
  name: string
  type?: DonorType
  document?: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

type UpdateDonorInput = Partial<CreateDonorInput>

interface ListDonorsFilter {
  includeInactive?: boolean
  search?: string
}

interface Requester {
  id: string
  role: Role
}

export class DonorService {
  // Cadastro pelo admin — o outro jeito de virar doador é o cadastro
  // público (AuthService.register), que já vincula um User.
  async create(input: CreateDonorInput) {
    return prisma.donor.create({ data: input })
  }

  async findAll(filter: ListDonorsFilter, pagination: PaginationParams) {
    const where = {
      ...(filter.includeInactive ? {} : { active: true }),
      ...(filter.search && {
        name: { contains: filter.search, mode: 'insensitive' as const },
      }),
    }

    const [donors, total] = await Promise.all([
      prisma.donor.findMany({ where, skip: pagination.skip, take: pagination.limit, orderBy: { name: 'asc' } }),
      prisma.donor.count({ where }),
    ])

    return paginate(donors, total, pagination)
  }

  async findById(id: string, requester: Requester) {
    const donor = await prisma.donor.findUnique({ where: { id } })
    if (!donor) {
      throw new NotFoundError('Doador')
    }

    this.assertAccess(donor, requester)
    return donor
  }

  async update(id: string, input: UpdateDonorInput, requester: Requester) {
    const donor = await this.findById(id, requester)
    return prisma.donor.update({ where: { id: donor.id }, data: input })
  }

  async deactivate(id: string) {
    const donor = await prisma.donor.findUnique({ where: { id } })
    if (!donor) {
      throw new NotFoundError('Doador')
    }
    await prisma.donor.update({ where: { id }, data: { active: false } })
  }

  // ADMIN acessa qualquer doador; DOADOR só o próprio cadastro (vinculado
  // via userId, obtido do próprio login — nunca de um id passado no body).
  private assertAccess(donor: { userId: string | null }, requester: Requester) {
    if (requester.role === Role.ADMIN) return
    if (requester.role === Role.DOADOR && donor.userId === requester.id) return
    throw new ForbiddenError('Você só pode acessar seu próprio cadastro de doador.')
  }
}
