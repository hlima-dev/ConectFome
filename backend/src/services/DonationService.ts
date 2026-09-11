import { DonationStatus, FoodCategory, Role } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'

interface CreateDonationInput {
  donorId?: string
  category?: FoodCategory
  description: string
  estimatedQuantityKg: number
  bestBeforeDate?: Date
  pickupWindowStart: Date
  pickupWindowEnd: Date
  notes?: string
}

type UpdateDonationInput = Partial<Omit<CreateDonationInput, 'donorId'>>

interface ListDonationsFilter {
  status?: DonationStatus
  donorId?: string
  recipientId?: string
  category?: FoodCategory
}

interface Requester {
  id: string
  role: Role
}

export class DonationService {
  // DOADOR sempre doa em nome do próprio cadastro (nunca de um donorId no
  // corpo da requisição); ADMIN pode criar em nome de qualquer doador,
  // passando donorId explicitamente.
  async create(input: CreateDonationInput, requester: Requester) {
    const donorId = await this.resolveDonorId(input.donorId, requester)

    return prisma.donation.create({
      data: {
        donorId,
        category: input.category,
        description: input.description,
        estimatedQuantityKg: input.estimatedQuantityKg,
        bestBeforeDate: input.bestBeforeDate,
        pickupWindowStart: input.pickupWindowStart,
        pickupWindowEnd: input.pickupWindowEnd,
        notes: input.notes,
      },
    })
  }

  async findAll(filter: ListDonationsFilter, pagination: PaginationParams, requester: Requester) {
    const scope = await this.scopeFilter(requester)

    const where = {
      ...scope,
      ...(filter.status && { status: filter.status }),
      ...(filter.donorId && { donorId: filter.donorId }),
      ...(filter.recipientId && { recipientId: filter.recipientId }),
      ...(filter.category && { category: filter.category }),
    }

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { donor: true, recipient: true, route: true },
      }),
      prisma.donation.count({ where }),
    ])

    return paginate(donations, total, pagination)
  }

  async findById(id: string, requester: Requester) {
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: { donor: true, recipient: true, route: true },
    })
    if (!donation) {
      throw new NotFoundError('Doação')
    }

    await this.assertAccess(donation, requester)
    return donation
  }

  // Só pode editar detalhes enquanto ninguém ainda se comprometeu com a
  // doação — depois de RESERVADA, mudar quantidade/janela seria enganar
  // quem já foi casado com ela.
  async update(id: string, input: UpdateDonationInput, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    if (donation.status !== DonationStatus.DISPONIVEL) {
      throw new ValidationError('Só é possível editar uma doação enquanto ela está disponível')
    }

    return prisma.donation.update({ where: { id: donation.id }, data: input })
  }

  async match(id: string, recipientId: string, requester: Requester) {
    const donation = await this.getOrThrow(id)

    if (donation.status !== DonationStatus.DISPONIVEL) {
      throw new ValidationError('Só é possível casar uma doação que esteja disponível')
    }

    const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } })
    if (!recipient || !recipient.active) {
      throw new NotFoundError('Receptor')
    }

    return prisma.donation.update({
      where: { id },
      data: { status: DonationStatus.RESERVADA, recipientId, matchedAt: new Date() },
    })
  }

  async cancel(id: string, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    const cancelableFrom: DonationStatus[] = [DonationStatus.DISPONIVEL, DonationStatus.RESERVADA]
    if (!cancelableFrom.includes(donation.status)) {
      throw new ValidationError('Essa doação não pode mais ser cancelada')
    }

    return prisma.donation.update({
      where: { id },
      data: { status: DonationStatus.CANCELADA, canceledAt: new Date() },
    })
  }

  async markExpired(id: string, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    const expirableFrom: DonationStatus[] = [DonationStatus.DISPONIVEL, DonationStatus.RESERVADA]
    if (!expirableFrom.includes(donation.status)) {
      throw new ValidationError('Só é possível vencer uma doação disponível ou reservada')
    }

    return prisma.donation.update({ where: { id }, data: { status: DonationStatus.VENCIDA } })
  }

  // Ação do receptor: confirma que recebeu de fato o que o voluntário
  // coletou. Só existe a partir de COLETADA — chega nesse estado quando a
  // rota de coleta (Fase 4) é concluída.
  async confirmReceipt(id: string, requester: Requester) {
    const donation = await this.getOrThrow(id)
    await this.assertRecipientAccess(donation, requester)

    if (donation.status !== DonationStatus.COLETADA) {
      throw new ValidationError('Só é possível confirmar recebimento de uma doação já coletada')
    }

    return prisma.donation.update({
      where: { id },
      data: { status: DonationStatus.ENTREGUE, confirmedAt: new Date() },
    })
  }

  private async getOrThrow(id: string) {
    const donation = await prisma.donation.findUnique({ where: { id } })
    if (!donation) {
      throw new NotFoundError('Doação')
    }
    return donation
  }

  // Usado pelas ações que só o doador dono (ou ADMIN) pode fazer:
  // editar, cancelar, vencer.
  private async findByIdForOwnerAction(id: string, requester: Requester) {
    const donation = await this.getOrThrow(id)

    if (requester.role === Role.ADMIN) return donation

    if (requester.role === Role.DOADOR) {
      const donor = await prisma.donor.findUnique({ where: { userId: requester.id } })
      if (donor && donation.donorId === donor.id) return donation
    }

    throw new ForbiddenError('Você só pode agir sobre as próprias doações')
  }

  private async assertRecipientAccess(donation: { recipientId: string | null }, requester: Requester) {
    if (requester.role === Role.ADMIN) return

    if (requester.role === Role.RECEPTOR) {
      const recipient = await prisma.recipient.findUnique({ where: { userId: requester.id } })
      if (recipient && donation.recipientId === recipient.id) return
    }

    throw new ForbiddenError('Você só pode agir sobre as próprias doações')
  }

  private async assertAccess(
    donation: { donorId: string; recipientId: string | null },
    requester: Requester,
  ) {
    if (requester.role === Role.ADMIN) return

    if (requester.role === Role.DOADOR) {
      const donor = await prisma.donor.findUnique({ where: { userId: requester.id } })
      if (donor && donation.donorId === donor.id) return
    }

    if (requester.role === Role.RECEPTOR) {
      const recipient = await prisma.recipient.findUnique({ where: { userId: requester.id } })
      if (recipient && donation.recipientId === recipient.id) return
    }

    throw new ForbiddenError('Você não tem acesso a essa doação')
  }

  private async resolveDonorId(inputDonorId: string | undefined, requester: Requester): Promise<string> {
    if (requester.role === Role.ADMIN) {
      if (!inputDonorId) {
        throw new ValidationError('Informe o doador (donorId) ao criar em nome de alguém')
      }
      return inputDonorId
    }

    if (requester.role === Role.DOADOR) {
      const donor = await prisma.donor.findUnique({ where: { userId: requester.id } })
      if (!donor || !donor.active) {
        throw new ForbiddenError('Cadastro de doador não encontrado ou inativo')
      }
      return donor.id
    }

    throw new ForbiddenError('Apenas doadores ou administradores podem cadastrar doações')
  }

  private async scopeFilter(requester: Requester) {
    if (requester.role === Role.ADMIN) return {}

    if (requester.role === Role.DOADOR) {
      const donor = await prisma.donor.findUnique({ where: { userId: requester.id } })
      return { donorId: donor?.id ?? '__none__' }
    }

    const recipient = await prisma.recipient.findUnique({ where: { userId: requester.id } })
    return { recipientId: recipient?.id ?? '__none__' }
  }
}
