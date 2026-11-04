import { StatusBadge } from './StatusBadge'
import { formatTimeLeft } from '../utils/time'
import type { Urgency } from '../types/donations'

// Só destaca o que exige atenção: urgente (<24 h) e prazo encerrado. Prazo
// normal não ganha selo, para o selo continuar significando alguma coisa.
export function UrgencyBadge({ urgency }: { urgency: Urgency | null | undefined }) {
  if (!urgency || urgency.level === 'NORMAL') return null
  if (urgency.level === 'EXPIRED') return <StatusBadge label="Prazo encerrado" tone="red" />
  return <StatusBadge label={`Urgente · ${formatTimeLeft(urgency.hoursLeft)}`} tone="amber" />
}
