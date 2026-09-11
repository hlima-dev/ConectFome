import type { BadgeTone } from '../components/StatusBadge'

export type FoodCategory = 'PERECIVEL' | 'NAO_PERECIVEL' | 'PREPARADO' | 'HORTIFRUTI' | 'PADARIA' | 'OUTRO'

export type DonationStatus =
  | 'DISPONIVEL'
  | 'RESERVADA'
  | 'AGENDADA'
  | 'COLETADA'
  | 'ENTREGUE'
  | 'CANCELADA'
  | 'VENCIDA'

export interface Donation {
  id: string
  donorId: string
  donor?: { id: string; name: string }
  category: FoodCategory
  description: string
  estimatedQuantityKg: string
  collectedQuantityKg: string | null
  bestBeforeDate: string | null
  pickupWindowStart: string
  pickupWindowEnd: string
  status: DonationStatus
  recipientId: string | null
  recipient?: { id: string; name: string } | null
  matchedAt: string | null
  routeId: string | null
  route?: { id: string; routeNumber: number } | null
  collectedAt: string | null
  confirmedAt: string | null
  canceledAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface DonationInput {
  donorId?: string
  category?: FoodCategory
  description: string
  estimatedQuantityKg: number
  bestBeforeDate?: string
  pickupWindowStart: string
  pickupWindowEnd: string
  notes?: string
}

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  PERECIVEL: 'Perecível',
  NAO_PERECIVEL: 'Não perecível',
  PREPARADO: 'Preparado',
  HORTIFRUTI: 'Hortifruti',
  PADARIA: 'Padaria',
  OUTRO: 'Outro',
}

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  DISPONIVEL: 'Disponível',
  RESERVADA: 'Reservada',
  AGENDADA: 'Agendada',
  COLETADA: 'Coletada',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida',
}

// Cinza = ainda ninguém se comprometeu, azul = em progresso rumo à coleta,
// verde = concluído com sucesso, vermelho = cancelado, âmbar = perdido
// (vencido) — mesma lógica de cores do StatusBadge em todo o app.
export const DONATION_STATUS_TONES: Record<DonationStatus, BadgeTone> = {
  DISPONIVEL: 'neutral',
  RESERVADA: 'blue',
  AGENDADA: 'blue',
  COLETADA: 'blue',
  ENTREGUE: 'green',
  CANCELADA: 'red',
  VENCIDA: 'amber',
}
