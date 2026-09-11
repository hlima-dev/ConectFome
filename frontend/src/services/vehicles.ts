import { api } from './api'
import type { Vehicle, VehicleInput } from '../types/logistics'

export async function listVehicles(params?: { includeInactive?: boolean; search?: string }): Promise<Vehicle[]> {
  const response = await api.get('/vehicles', { params })
  return response.data.data.data
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await api.get(`/vehicles/${id}`)
  return response.data.data
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const response = await api.post('/vehicles', input)
  return response.data.data
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
  const response = await api.patch(`/vehicles/${id}`, input)
  return response.data.data
}

export async function deactivateVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`)
}
