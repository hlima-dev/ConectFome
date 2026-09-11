import { RecipientType, Role } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ForbiddenError, NotFoundError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'

interface CreateRecipientInput {
  name: string
  type?: RecipientType
  document?: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  peopleServed?: number
}

type UpdateRecipientInput = Partial<CreateRecipientInput>

interface ListRecipientsFilter {
  includeInactive?: boolean
  search?: string
}

interface Requester {
  id: string
  role: Role
}

export class RecipientService {
  async create(input: CreateRecipientInput) {
    return prisma.recipient.create({ data: input })
  }

  async findAll(filter: ListRecipientsFilter, pagination: PaginationParams) {
    const where = {
      ...(filter.includeInactive ? {} : { active: true }),
      ...(filter.search && {
        name: { contains: filter.search, mode: 'insensitive' as const },
      }),
    }

    const [recipients, total] = await Promise.all([
      prisma.recipient.findMany({ where, skip: pagination.skip, take: pagination.limit, orderBy: { name: 'asc' } }),
      prisma.recipient.count({ where }),
    ])

    return paginate(recipients, total, pagination)
  }

  async findById(id: string, requester: Requester) {
    const recipient = await prisma.recipient.findUnique({ where: { id } })
    if (!recipient) {
      throw new NotFoundError('Receptor')
    }

    this.assertAccess(recipient, requester)
    return recipient
  }

  async update(id: string, input: UpdateRecipientInput, requester: Requester) {
    const recipient = await this.findById(id, requester)
    return prisma.recipient.update({ where: { id: recipient.id }, data: input })
  }

  async deactivate(id: string) {
    const recipient = await prisma.recipient.findUnique({ where: { id } })
    if (!recipient) {
      throw new NotFoundError('Receptor')
    }
    await prisma.recipient.update({ where: { id }, data: { active: false } })
  }

  private assertAccess(recipient: { userId: string | null }, requester: Requester) {
    if (requester.role === Role.ADMIN) return
    if (requester.role === Role.RECEPTOR && recipient.userId === requester.id) return
    throw new ForbiddenError('Você só pode acessar seu próprio cadastro de receptor.')
  }
}
