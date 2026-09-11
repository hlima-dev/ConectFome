import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { UnauthorizedError, ForbiddenError } from '../utils/AppError'
import { ACCESS_COOKIE } from '../utils/authCookies'
import { Role } from '@prisma/client'

interface JwtPayload {
  sub: string
  role: Role
  iat: number
  exp: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma padrão do TS para estender o Request do Express
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: Role
      }
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Fonte principal: cookie httpOnly (login/registro setam assim).
  // Mantemos o header Bearer como alternativa para chamadas server-to-server
  // ou uso via ferramentas tipo Postman/Insomnia.
  const cookieToken = req.cookies?.[ACCESS_COOKIE]
  const authorization = req.headers.authorization
  const headerToken = authorization?.startsWith('Bearer ') ? authorization.split(' ')[1] : undefined

  const token = cookieToken || headerToken

  if (!token) {
    throw new UnauthorizedError('Token de autenticação não fornecido')
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    }
    next()
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado')
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Acesso restrito para: ${roles.join(', ')}`)
    }

    next()
  }
}
