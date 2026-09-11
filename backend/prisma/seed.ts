import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

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
  console.log(`✅ Receptor: ${receptor1.email}`)

  // ── Voluntários e veículos (sem login — gerenciados pelo admin) ──
  await prisma.volunteer.upsert({
    where: { document: '111.111.111-11' },
    update: {},
    create: { name: 'Carlos Andrade', document: '111.111.111-11', phone: '(11) 98888-1111' },
  })
  await prisma.volunteer.upsert({
    where: { document: '222.222.222-22' },
    update: {},
    create: { name: 'Fernanda Lima', document: '222.222.222-22', phone: '(11) 98888-2222' },
  })

  await prisma.vehicle.upsert({
    where: { plate: 'ABC1D23' },
    update: {},
    create: { plate: 'ABC1D23', model: 'Fiorino', capacityKg: 500 },
  })
  await prisma.vehicle.upsert({
    where: { plate: 'XYZ9E88' },
    update: {},
    create: { plate: 'XYZ9E88', model: 'Van Sprinter', capacityKg: 1200 },
  })

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
