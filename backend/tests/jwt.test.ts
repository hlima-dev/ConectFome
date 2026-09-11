import { describe, it, expect } from 'vitest'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateTokenPair } from '../src/utils/jwt'
import { Role } from '@prisma/client'

describe('utils/jwt', () => {
  const payload = { sub: 'user_1', role: Role.DOADOR }

  it('gera um access token e um refresh token válidos', () => {
    const tokens = generateTokenPair(payload)
    expect(typeof tokens.accessToken).toBe('string')
    expect(typeof tokens.refreshToken).toBe('string')
    expect(tokens.accessToken).not.toBe(tokens.refreshToken)
  })

  it('verifyRefreshToken devolve o payload original', () => {
    const refreshToken = generateRefreshToken(payload)
    const decoded = verifyRefreshToken(refreshToken)
    expect(decoded.sub).toBe(payload.sub)
    expect(decoded.role).toBe(payload.role)
  })

  it('verifyRefreshToken rejeita um token de access (assinado com outro segredo)', () => {
    const accessToken = generateAccessToken(payload)
    expect(() => verifyRefreshToken(accessToken)).toThrow()
  })

  it('verifyRefreshToken rejeita um token corrompido', () => {
    expect(() => verifyRefreshToken('token.invalido.aqui')).toThrow()
  })
})
