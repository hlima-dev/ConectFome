import { DonationAction, DonationStatus, FoodCategory, Role, StorageCondition } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError'
import { paginate, PaginationParams } from '../utils/pagination'
import { donationTransition } from './donationTransition'

interface CreateDonationInput {
  donorId?: string
  category?: FoodCategory
  description: string
  estimatedQuantityKg: number
  bestBeforeDate?: Date
  pickupWindowStart: Date
  pickupWindowEnd: Date
  storageCondition?: StorageCondition
  // Declaração do doador de que o alimento está próprio para consumo.
  acceptTerms: boolean
  notes?: string
}

// Perecível e preparado precisam de escolha explícita da condição de
// armazenamento; nas demais categorias o padrão (ambiente) é aceitável.
const STORAGE_REQUIRED_FOR: FoodCategory[] = [FoodCategory.PERECIVEL, FoodCategory.PREPARADO]

function assertStorageCondition(category: FoodCategory | undefined, storageCondition: StorageCondition | undefined) {
  if (category && STORAGE_REQUIRED_FOR.includes(category) && !storageCondition) {
    throw new ValidationError('Informe a condição de armazenamento para alimentos perecíveis ou preparados')
  }
}

type UpdateDonationInput = Partial<Omit<CreateDonationInput, 'donorId' | 'acceptTerms'>>

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

    if (input.acceptTerms !== true) {
      throw new ValidationError('É necessário declarar que o alimento está próprio para consumo')
    }
    assertStorageCondition(input.category, input.storageCondition)

    return prisma.donation.create({
      data: {
        donorId,
        category: input.category,
        storageCondition: input.storageCondition,
        termsAcceptedAt: new Date(),
        events: {
          create: { action: DonationAction.CRIADA, fromStatus: null, toStatus: DonationStatus.DISPONIVEL, actorId: requester.id },
        },
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

  // Histórico da doação, do mais antigo ao mais recente. Quem pode ver a
  // doação pode ver o histórico (mesma regra de acesso do findById).
  async findEvents(id: string, requester: Requester) {
    const donation = await this.getOrThrow(id)
    await this.assertAccess(donation, requester)

    return prisma.donationEvent.findMany({
      where: { donationId: id },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true, role: true } } },
    })
  }

  // Só pode editar detalhes enquanto ninguém ainda se comprometeu com a
  // doação — depois de RESERVADA, mudar quantidade/janela seria enganar
  // quem já foi casado com ela.
  async update(id: string, input: UpdateDonationInput, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    if (donation.status !== DonationStatus.DISPONIVEL) {
      throw new ValidationError('Só é possível editar uma doação enquanto ela está disponível')
    }

    if (input.category !== undefined && input.storageCondition === undefined) {
      assertStorageCondition(input.category, undefined)
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

    const [updated] = await prisma.$transaction([
      ...donationTransition(
        donation,
        DonationAction.CASADA,
        { status: DonationStatus.RESERVADA, recipientId, matchedAt: new Date() },
        requester.id,
      ),
    ])
    return updated
  }

  async cancel(id: string, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    const cancelableFrom: DonationStatus[] = [DonationStatus.DISPONIVEL, DonationStatus.RESERVADA]
    if (!cancelableFrom.includes(donation.status)) {
      throw new ValidationError('Essa doação não pode mais ser cancelada')
    }

    const [updated] = await prisma.$transaction([
      ...donationTransition(
        donation,
        DonationAction.CANCELADA,
        { status: DonationStatus.CANCELADA, canceledAt: new Date() },
        requester.id,
      ),
    ])
    return updated
  }

  async markExpired(id: string, requester: Requester) {
    const donation = await this.findByIdForOwnerAction(id, requester)

    const expirableFrom: DonationStatus[] = [DonationStatus.DISPONIVEL, DonationStatus.RESERVADA]
    if (!expirableFrom.includes(donation.status)) {
      throw new ValidationError('Só é possível vencer uma doação disponível ou reservada')
    }

    const [updated] = await prisma.$transaction([
      ...donationTransition(
        donation,
        DonationAction.VENCIDA,
        { status: DonationStatus.VENCIDA, expiredAt: new Date() },
        requester.id,
      ),
    ])
    return updated
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

    const [updated] = await prisma.$transaction([
      ...donationTransition(
        donation,
        DonationAction.CONFIRMADA,
        { status: DonationStatus.ENTREGUE, confirmedAt: new Date() },
        requester.id,
      ),
    ])
    return updated
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
