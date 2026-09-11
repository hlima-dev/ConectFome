import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { AuthService } from '../src/services/AuthService'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  donor: {
    create: vi.fn(),
  },
  recipient: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

// A mesma senha em hash real (bcrypt), usada em vários testes.
const PLAIN_PASSWORD = 'Senha@1234'
const PASSWORD_HASH = bcrypt.hashSync(PLAIN_PASSWORD, 4)

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'doador@empresa.com',
    password: PASSWORD_HASH,
    name: 'Doador Teste',
    role: Role.DOADOR,
    active: true,
    refreshToken: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  }
}

describe('AuthService.login', () => {
  let authService: InstanceType<typeof AuthService>

  beforeEach(() => {
    vi.clearAllMocks()
    authService = new AuthService()
    mockPrisma.user.update.mockResolvedValue({})
  })

  it('rejeita e-mail inexistente com mensagem genérica (evita user enumeration)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(
      authService.login({ email: 'ninguem@empresa.com', password: 'qualquer' }),
    ).rejects.toThrow('E-mail ou senha inválidos')
  })

  it('senha errada incrementa failedLoginAttempts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ failedLoginAttempts: 1 }))

    await expect(
      authService.login({ email: 'doador@empresa.com', password: 'senha-errada' }),
    ).rejects.toThrow('E-mail ou senha inválidos')

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { failedLoginAttempts: 2, lockedUntil: null },
    })
  })

  it('bloqueia a conta na 5ª tentativa errada seguida', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ failedLoginAttempts: 4 }))

    await expect(
      authService.login({ email: 'doador@empresa.com', password: 'senha-errada' }),
    ).rejects.toThrow('E-mail ou senha inválidos')

    const call = mockPrisma.user.update.mock.calls[0][0]
    expect(call.data.failedLoginAttempts).toBe(0)
    expect(call.data.lockedUntil).toBeInstanceOf(Date)
    expect(call.data.lockedUntil.getTime()).toBeGreaterThan(Date.now())
  })

  it('rejeita login de conta já bloqueada mesmo com a senha certa', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 10)
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ lockedUntil: future }))

    await expect(
      authService.login({ email: 'doador@empresa.com', password: PLAIN_PASSWORD }),
    ).rejects.toThrow(/bloqueada/)
  })

  it('rejeita conta inativa', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ active: false }))

    await expect(
      authService.login({ email: 'doador@empresa.com', password: PLAIN_PASSWORD }),
    ).rejects.toThrow('Conta inativa')
  })

  it('login correto emite sessão com accessToken/refreshToken', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser())

    const result = await authService.login({ email: 'doador@empresa.com', password: PLAIN_PASSWORD })

    expect(result.user.role).toBe(Role.DOADOR)
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    // Nunca devolve o hash da senha pro cliente
    expect((result.user as Record<string, unknown>).password).toBeUndefined()
  })

  it('login correto zera failedLoginAttempts que estavam acumulados', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser({ failedLoginAttempts: 3 }))

    await authService.login({ email: 'doador@empresa.com', password: PLAIN_PASSWORD })

    // Primeira chamada de update zera as tentativas; a segunda (issueSession)
    // grava o novo refreshToken.
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
  })
})

describe('AuthService.register', () => {
  let authService: InstanceType<typeof AuthService>

  beforeEach(() => {
    vi.clearAllMocks()
    authService = new AuthService()
    mockPrisma.user.update.mockResolvedValue({})
    // Simula prisma.$transaction(async (tx) => ...) chamando o callback
    // com o próprio mockPrisma como "tx" (mesmos métodos mockados).
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
      callback(mockPrisma),
    )
  })

  it('rejeita e-mail já cadastrado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser())

    await expect(
      authService.register({
        name: 'Novo',
        email: 'doador@empresa.com',
        password: PLAIN_PASSWORD,
        role: 'DOADOR',
        donor: { name: 'Mercado X', type: 'MERCADO' },
      }),
    ).rejects.toThrow('E-mail já cadastrado')
  })

  it('exige dados do doador quando role=DOADOR', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(
      authService.register({
        name: 'Novo',
        email: 'novo@empresa.com',
        password: PLAIN_PASSWORD,
        role: 'DOADOR',
      }),
    ).rejects.toThrow('Dados do doador são obrigatórios')
  })

  it('exige dados do receptor quando role=RECEPTOR', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(
      authService.register({
        name: 'Novo',
        email: 'novo@empresa.com',
        password: PLAIN_PASSWORD,
        role: 'RECEPTOR',
      }),
    ).rejects.toThrow('Dados do receptor são obrigatórios')
  })

  it('cria User + Donor na mesma transação quando role=DOADOR', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue(baseUser({ id: 'user_2' }))

    await authService.register({
      name: 'Mercado Novo',
      email: 'mercado@empresa.com',
      password: PLAIN_PASSWORD,
      role: 'DOADOR',
      donor: { name: 'Mercado Novo', type: 'MERCADO' },
    })

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.donor.create).toHaveBeenCalledWith({
      data: { name: 'Mercado Novo', type: 'MERCADO', userId: 'user_2' },
    })
    expect(mockPrisma.recipient.create).not.toHaveBeenCalled()
  })
})
