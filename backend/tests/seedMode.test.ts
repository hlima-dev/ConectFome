import { describe, it, expect } from 'vitest'
import { resolveSeedPlan } from '../prisma/seedMode'

describe('prisma/seedMode — resolveSeedPlan', () => {
  it('fora de produção, cria os dados de demonstração', () => {
    expect(resolveSeedPlan({ NODE_ENV: 'development' })).toEqual({ mode: 'demo' })
    expect(resolveSeedPlan({})).toEqual({ mode: 'demo' })
  })

  it('em produção sem opt-in, exige credenciais do administrador', () => {
    expect(() => resolveSeedPlan({ NODE_ENV: 'production' })).toThrow(/ADMIN_EMAIL/)
    expect(() => resolveSeedPlan({ NODE_ENV: 'production', ADMIN_EMAIL: 'a@b.org' })).toThrow(/ADMIN_PASSWORD/)
  })

  it('em produção, rejeita senha curta', () => {
    expect(() =>
      resolveSeedPlan({ NODE_ENV: 'production', ADMIN_EMAIL: 'a@b.org', ADMIN_PASSWORD: 'curta123' }),
    ).toThrow(/ao menos 12/)
  })

  it('em produção, rejeita a senha pública de demonstração', () => {
    expect(() =>
      resolveSeedPlan({ NODE_ENV: 'production', ADMIN_EMAIL: 'a@b.org', ADMIN_PASSWORD: 'Conect@123' }),
    ).toThrow(/pública/)
  })

  it('em produção, com credenciais válidas, cria só o administrador', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'production',
      ADMIN_EMAIL: ' admin@org.br ',
      ADMIN_PASSWORD: 'uma-senha-bem-longa-9',
      ADMIN_NAME: 'Coordenação',
    })
    expect(plan).toEqual({ mode: 'admin-only', name: 'Coordenação', email: 'admin@org.br', password: 'uma-senha-bem-longa-9' })
  })

  it('SEED_DEMO=true em produção é opt-in explícito para demonstração', () => {
    expect(resolveSeedPlan({ NODE_ENV: 'production', SEED_DEMO: 'true' })).toEqual({ mode: 'demo' })
    expect(() => resolveSeedPlan({ NODE_ENV: 'production', SEED_DEMO: 'yes' })).toThrow()
  })
})
