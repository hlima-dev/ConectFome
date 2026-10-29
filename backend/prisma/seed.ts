import { DonationAction, DonationStatus, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { resolveSeedPlan } from './seedMode'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const plan = resolveSeedPlan(process.env)

  if (plan.mode === 'admin-only') {
    // Produção: só o administrador, com credenciais do ambiente. `update: {}`
    // garante que reiniciar o serviço nunca sobrescreve uma senha já trocada.
    const admin = await prisma.user.upsert({
      where: { email: plan.email },
      update: {},
      create: { name: plan.name, email: plan.email, password: await bcrypt.hash(plan.password, 12), role: 'ADMIN' },
    })
    console.log(`✅ Administrador: ${admin.email} (sem dados de demonstração)`)
    return
  }

  const passwordHash = await bcrypt.hash('Conect@123', 10)

  // ── ADMIN — nunca nasce de cadastro público, só por aqui ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@conectfome.org' },
    update: {},
    create: {
      name: 'Administrador ConectFome',
      email: 'admin@conectfome.org',
      password: passwordHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin: ${admin.email}`)

  // ── Doadores (com login) ──
  const doador1 = await prisma.user.upsert({
    where: { email: 'mercado@conectfome.org' },
    update: {},
    create: {
      name: 'Mercado Bom Preço',
      email: 'mercado@conectfome.org',
      password: passwordHash,
      role: 'DOADOR',
      donorProfile: {
        create: {
          name: 'Mercado Bom Preço',
          type: 'MERCADO',
          contactName: 'Seu João',
          phone: '(11) 3333-1111',
          address: 'Rua das Flores, 100',
          city: 'São Paulo',
          state: 'SP',
        },
      },
    },
  })

  const doador2 = await prisma.user.upsert({
    where: { email: 'restaurante@conectfome.org' },
    update: {},
    create: {
      name: 'Restaurante Sabor Caseiro',
      email: 'restaurante@conectfome.org',
      password: passwordHash,
      role: 'DOADOR',
      donorProfile: {
        create: {
          name: 'Restaurante Sabor Caseiro',
          type: 'RESTAURANTE',
          contactName: 'Dona Marta',
          phone: '(11) 3333-2222',
          address: 'Av. Central, 500',
          city: 'São Paulo',
          state: 'SP',
        },
      },
    },
  })
  console.log(`✅ Doadores: ${doador1.email}, ${doador2.email}`)

  // ── Receptores (com login) ──
  const receptor1 = await prisma.user.upsert({
    where: { email: 'ong@conectfome.org' },
    update: {},
    create: {
      name: 'ONG Mesa Solidária',
      email: 'ong@conectfome.org',
      password: passwordHash,
      role: 'RECEPTOR',
      recipientProfile: {
        create: {
          name: 'ONG Mesa Solidária',
          type: 'ONG',
          contactName: 'Carla Souza',
          phone: '(11) 3333-3333',
          address: 'Rua da Esperança, 20',
          city: 'São Paulo',
          state: 'SP',
          peopleServed: 80,
        },
      },
    },
  })

  const receptor2 = await prisma.user.upsert({
    where: { email: 'familia@conectfome.org' },
    update: {},
    create: {
      name: 'Lar da Vovó Joana',
      email: 'familia@conectfome.org',
      password: passwordHash,
      role: 'RECEPTOR',
      recipientProfile: {
        create: {
          name: 'Lar da Vovó Joana',
          type: 'FAMILIA',
          contactName: 'Joana Pereira',
          phone: '(11) 3333-4444',
          address: 'Travessa das Acácias, 45',
          city: 'São Paulo',
          state: 'SP',
          peopleServed: 6,
        },
      },
    },
  })
  console.log(`✅ Receptores: ${receptor1.email}, ${receptor2.email}`)

  // ── Voluntários e veículos (sem login — gerenciados pelo admin) ──
  const voluntario1 = await prisma.volunteer.upsert({
    where: { document: '111.111.111-11' },
    update: {},
    create: { name: 'Carlos Andrade', document: '111.111.111-11', phone: '(11) 98888-1111' },
  })
  await prisma.volunteer.upsert({
    where: { document: '222.222.222-22' },
    update: {},
    create: { name: 'Fernanda Lima', document: '222.222.222-22', phone: '(11) 98888-2222' },
  })

  const veiculo1 = await prisma.vehicle.upsert({
    where: { plate: 'ABC1D23' },
    update: {},
    create: { plate: 'ABC1D23', model: 'Fiorino', capacityKg: 500 },
  })
  await prisma.vehicle.upsert({
    where: { plate: 'XYZ9E88' },
    update: {},
    create: { plate: 'XYZ9E88', model: 'Van Sprinter', capacityKg: 1200 },
  })

  // ── Doações de exemplo, cobrindo os principais estados do ciclo ──
  // (ids fixos só pra deixar o seed idempotente — em produção nasceriam
  // como cuid normalmente).
  const donor1 = await prisma.donor.findUniqueOrThrow({ where: { userId: doador1.id } })
  const donor2 = await prisma.donor.findUniqueOrThrow({ where: { userId: doador2.id } })
  const recipient1 = await prisma.recipient.findUniqueOrThrow({ where: { userId: receptor1.id } })

  const now = new Date()
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 14, 0, 0))

  // Já resgatada e entregue mês passado — dá histórico pro gráfico mensal.
  const route1 = await prisma.pickupRoute.upsert({
    where: { id: 'seed-route-historico' },
    update: {},
    create: {
      id: 'seed-route-historico',
      vehicleId: veiculo1.id,
      volunteerId: voluntario1.id,
      status: 'CONCLUIDA',
      scheduledFor: lastMonth,
      departedAt: lastMonth,
      completedAt: lastMonth,
    },
  })
  await prisma.donation.upsert({
    where: { id: 'seed-donation-historico' },
    update: {},
    create: {
      id: 'seed-donation-historico',
      donorId: donor2.id,
      category: 'PREPARADO',
      storageCondition: 'REFRIGERADO',
      termsAcceptedAt: lastMonth,
      description: 'Marmitas do almoço executivo',
      estimatedQuantityKg: 35,
      collectedQuantityKg: 32,
      pickupWindowStart: lastMonth,
      pickupWindowEnd: lastMonth,
      status: 'ENTREGUE',
      recipientId: recipient1.id,
      matchedAt: lastMonth,
      routeId: route1.id,
      collectedAt: lastMonth,
      confirmedAt: lastMonth,
    },
  })

  // Disponível — ainda sem receptor, pronta pra ser casada pelo admin.
  await prisma.donation.upsert({
    where: { id: 'seed-donation-disponivel' },
    update: {},
    create: {
      id: 'seed-donation-disponivel',
      donorId: donor1.id,
      category: 'HORTIFRUTI',
      termsAcceptedAt: now,
      description: 'Caixas de verduras e legumes fora do padrão estético',
      estimatedQuantityKg: 18,
      pickupWindowStart: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      pickupWindowEnd: new Date(now.getTime() + 30 * 60 * 60 * 1000),
      status: 'DISPONIVEL',
    },
  })

  // Reservada — já casada, pronta pra entrar numa rota.
  await prisma.donation.upsert({
    where: { id: 'seed-donation-reservada' },
    update: {},
    create: {
      id: 'seed-donation-reservada',
      donorId: donor2.id,
      category: 'PADARIA',
      termsAcceptedAt: now,
      description: 'Pães e bolos do dia anterior',
      estimatedQuantityKg: 12,
      pickupWindowStart: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      pickupWindowEnd: new Date(now.getTime() + 30 * 60 * 60 * 1000),
      status: 'RESERVADA',
      recipientId: recipient1.id,
      matchedAt: now,
    },
  })

  // Vencida — perdida antes de ser coletada, contraste "resgatado vs perdido".
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  await prisma.donation.upsert({
    where: { id: 'seed-donation-vencida' },
    update: {},
    create: {
      id: 'seed-donation-vencida',
      donorId: donor1.id,
      category: 'PERECIVEL',
      storageCondition: 'REFRIGERADO',
      termsAcceptedAt: twoDaysAgo,
      expiredAt: now,
      description: 'Iogurtes perto do vencimento',
      estimatedQuantityKg: 8,
      pickupWindowStart: twoDaysAgo,
      pickupWindowEnd: twoDaysAgo,
      status: 'VENCIDA',
    },
  })

  // Histórico de cada doação de exemplo (idempotente: só grava se ainda não houver).
  type Step = [action: DonationAction, from: DonationStatus | null, to: DonationStatus, actorId: string, at: Date]
  async function seedEvents(donationId: string, steps: Step[]) {
    if ((await prisma.donationEvent.count({ where: { donationId } })) > 0) return
    await prisma.donationEvent.createMany({
      data: steps.map(([action, fromStatus, toStatus, actorId, createdAt]) => ({ donationId, action, fromStatus, toStatus, actorId, createdAt })),
    })
  }
  const dayBefore = new Date(lastMonth.getTime() - 24 * 60 * 60 * 1000)
  await seedEvents('seed-donation-historico', [
    ['CRIADA', null, 'DISPONIVEL', doador2.id, dayBefore],
    ['CASADA', 'DISPONIVEL', 'RESERVADA', admin.id, dayBefore],
    ['AGENDADA', 'RESERVADA', 'AGENDADA', admin.id, lastMonth],
    ['COLETADA', 'AGENDADA', 'COLETADA', admin.id, lastMonth],
    ['CONFIRMADA', 'COLETADA', 'ENTREGUE', receptor1.id, lastMonth],
  ])
  await seedEvents('seed-donation-disponivel', [['CRIADA', null, 'DISPONIVEL', doador1.id, now]])
  await seedEvents('seed-donation-reservada', [
    ['CRIADA', null, 'DISPONIVEL', doador2.id, now],
    ['CASADA', 'DISPONIVEL', 'RESERVADA', admin.id, now],
  ])
  await seedEvents('seed-donation-vencida', [
    ['CRIADA', null, 'DISPONIVEL', doador1.id, twoDaysAgo],
    ['VENCIDA', 'DISPONIVEL', 'VENCIDA', doador1.id, now],
  ])

  console.log('✅ Doações de exemplo: disponível, reservada, vencida e uma já entregue (mês passado)')

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('   Senha de todas as contas: Conect@123')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
