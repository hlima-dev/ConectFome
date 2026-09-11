import { z } from 'zod'

// Campo de e-mail opcional que tolera string vazia ("") vindo de formulários
// do frontend — sem isso, z.string().email().optional() rejeita "" porque
// .optional() só aceita ausência/undefined, não string vazia.
export const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().email().optional(),
)

// Coerção de data que tolera string vazia — usada em campos opcionais de
// data (ex: validade de uma doação).
export const optionalDate = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.coerce.date().optional(),
)
