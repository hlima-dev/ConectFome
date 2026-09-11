import { api } from './api'
import type { PickupRoute, PickupRouteInput, PickupRouteStatus } from '../types/logistics'

export async function listPickupRoutes(params?: {
  status?: PickupRouteStatus
  vehicleId?: string
  volunteerId?: string
}): Promise<PickupRoute[]> {
  const response = await api.get('/pickup-routes', { params })
  return response.data.data.data
}

export async function getPickupRoute(id: string): Promise<PickupRoute> {
  const response = await api.get(`/pickup-routes/${id}`)
  return response.data.data
}

export async function createPickupRoute(input: PickupRouteInput): Promise<PickupRoute> {
  const response = await api.post('/pickup-routes', input)
  return response.data.data
}

export async function updatePickupRoute(id: string, input: Partial<PickupRouteInput>): Promise<PickupRoute> {
  const response = await api.patch(`/pickup-routes/${id}`, input)
  return response.data.data
}

export async function attachDonationToRoute(routeId: string, donationId: string): Promise<PickupRoute> {
  const response = await api.post(`/pickup-routes/${routeId}/donations`, { donationId })
  return response.data.data
}

export async function detachDonationFromRoute(routeId: string, donationId: string): Promise<PickupRoute> {
  const response = await api.delete(`/pickup-routes/${routeId}/donations/${donationId}`)
  return response.data.data
}

export async function startPickupRoute(id: string): Promise<PickupRoute> {
  const response = await api.patch(`/pickup-routes/${id}/start`)
  return response.data.data
}

export async function completePickupRoute(id: string): Promise<PickupRoute> {
  const response = await api.patch(`/pickup-routes/${id}/complete`, {})
  return response.data.data
}

export async function cancelPickupRoute(id: string): Promise<PickupRoute> {
  const response = await api.patch(`/pickup-routes/${id}/cancel`)
  return response.data.data
}
