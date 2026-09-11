import { isAxiosError } from 'axios'

// A API sempre responde erro como { message: string } (ver errorHandler.ts
// no backend) — este helper evita repetir a mesma checagem em cada catch.
export function getErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return fallback
}

// Erros 422 do Zod vêm com { message, errors: { campo: [mensagens] } }.
export function getFieldErrors(err: unknown): Record<string, string[]> | undefined {
  if (isAxiosError(err)) {
    return err.response?.data?.errors as Record<string, string[]> | undefined
  }
  return undefined
}
