import { DonationStatus } from '@prisma/client'

// Abaixo desse número de horas até o prazo, a doação é "urgente".
export const URGENT_HOURS = 24

export type UrgencyLevel = 'EXPIRED' | 'URGENT' | 'NORMAL'

export interface Urgency {
  level: UrgencyLevel
  // O que vencer primeiro entre a validade (até o fim do dia) e o fim da janela de coleta.
  deadline: Date
  hoursLeft: number
}

// Só faz sentido falar de urgência enquanto o alimento ainda não foi coletado.
const OPEN_STATUSES: DonationStatus[] = [DonationStatus.DISPONIVEL, DonationStatus.RESERVADA, DonationStatus.AGENDADA]

interface UrgencyInput {
  status: DonationStatus
  bestBeforeDate: Date | null
  pickupWindowEnd: Date
}

// A validade é uma data sem hora: o alimento vale até o fim desse dia (UTC).
function endOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export function computeUrgency(donation: UrgencyInput, now: Date = new Date()): Urgency | null {
  if (!OPEN_STATUSES.includes(donation.status)) return null

  const pickupEnd = new Date(donation.pickupWindowEnd)
  const shelfLife = donation.bestBeforeDate ? endOfDayUtc(new Date(donation.bestBeforeDate)) : null
  const deadline = shelfLife && shelfLife < pickupEnd ? shelfLife : pickupEnd

  const hoursLeft = Math.round(((deadline.getTime() - now.getTime()) / 3_600_000) * 10) / 10
  const level: UrgencyLevel = hoursLeft <= 0 ? 'EXPIRED' : hoursLeft < URGENT_HOURS ? 'URGENT' : 'NORMAL'

  return { level, deadline, hoursLeft }
}

export function withUrgency<T extends UrgencyInput>(donation: T, now?: Date) {
  return { ...donation, urgency: computeUrgency(donation, now) }
}
