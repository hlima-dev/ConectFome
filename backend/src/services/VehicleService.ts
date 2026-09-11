import { prisma } from '../config/prisma'
import { NotFoundError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'

interface CreateVehicleInput {
  plate: string
  model: string
  capacityKg?: number
}

type UpdateVehicleInput = Partial<CreateVehicleInput>

interface ListVehiclesFilter {
  includeInactive?: boolean
  search?: string
}

export class VehicleService {
  async create(input: CreateVehicleInput) {
    return prisma.vehicle.create({ data: input })
  }

  async findAll(filter: ListVehiclesFilter, pagination: PaginationParams) {
    const where = {
      ...(filter.includeInactive ? {} : { active: true }),
      ...(filter.search && {
        OR: [
          { plate: { contains: filter.search, mode: 'insensitive' as const } },
          { model: { contains: filter.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({ where, skip: pagination.skip, take: pagination.limit, orderBy: { plate: 'asc' } }),
      prisma.vehicle.count({ where }),
    ])

    return paginate(vehicles, total, pagination)
  }

  async findById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      throw new NotFoundError('Veículo')
    }
    return vehicle
  }

  async update(id: string, input: UpdateVehicleInput) {
    await this.findById(id)
    return prisma.vehicle.update({ where: { id }, data: input })
  }

  async deactivate(id: string) {
    await this.findById(id)
    await prisma.vehicle.update({ where: { id }, data: { active: false } })
  }
}
