import type { BadgeTone } from '../components/StatusBadge'
import type { Donation } from './donations'

export interface Volunteer {
  id: string
  name: string
  document: string
  phone: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface VolunteerInput {
  name: string
  document: string
  phone?: string
}

export interface Vehicle {
  id: string
  plate: string
  model: string
  capacityKg: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface VehicleInput {
  plate: string
  model: string
  capacityKg?: number
}

export type PickupRouteStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export interface PickupRoute {
  id: string
  routeNumber: number
  vehicleId: string
  vehicle: Vehicle
  volunteerId: string
  volunteer: Volunteer
  status: PickupRouteStatus
  scheduledFor: string
  departedAt: string | null
  completedAt: string | null
  canceledAt: string | null
  notes: string | null
  donations: Donation[]
  createdAt: string
  updatedAt: string
}

export interface PickupRouteInput {
  vehicleId: string
  volunteerId: string
  scheduledFor: string
  notes?: string
}

export const PICKUP_ROUTE_STATUS_LABELS: Record<PickupRouteStatus, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const PICKUP_ROUTE_STATUS_TONES: Record<PickupRouteStatus, BadgeTone> = {
  PLANEJADA: 'neutral',
  EM_ANDAMENTO: 'blue',
  CONCLUIDA: 'green',
  CANCELADA: 'red',
}
