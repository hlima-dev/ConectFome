import { prisma } from '../config/prisma'
import { NotFoundError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'

interface CreateVolunteerInput {
  name: string
  document: string
  phone?: string
}

type UpdateVolunteerInput = Partial<CreateVolunteerInput>

interface ListVolunteersFilter {
  includeInactive?: boolean
  search?: string
}

// Voluntários não têm login (ver nota no schema/plano) — CRUD é
// inteiramente gerenciado pelo ADMIN, sem conceito de "dono".
export class VolunteerService {
  async create(input: CreateVolunteerInput) {
    return prisma.volunteer.create({ data: input })
  }

  async findAll(filter: ListVolunteersFilter, pagination: PaginationParams) {
    const where = {
      ...(filter.includeInactive ? {} : { active: true }),
      ...(filter.search && {
        name: { contains: filter.search, mode: 'insensitive' as const },
      }),
    }

    const [volunteers, total] = await Promise.all([
      prisma.volunteer.findMany({ where, skip: pagination.skip, take: pagination.limit, orderBy: { name: 'asc' } }),
      prisma.volunteer.count({ where }),
    ])

    return paginate(volunteers, total, pagination)
  }

  async findById(id: string) {
    const volunteer = await prisma.volunteer.findUnique({ where: { id } })
    if (!volunteer) {
      throw new NotFoundError('Voluntário')
    }
    return volunteer
  }

  async update(id: string, input: UpdateVolunteerInput) {
    await this.findById(id)
    return prisma.volunteer.update({ where: { id }, data: input })
  }

  async deactivate(id: string) {
    await this.findById(id)
    await prisma.volunteer.update({ where: { id }, data: { active: false } })
  }
}
