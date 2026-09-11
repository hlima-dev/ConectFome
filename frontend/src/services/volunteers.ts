import { api } from './api'
import type { Volunteer, VolunteerInput } from '../types/logistics'

export async function listVolunteers(params?: { includeInactive?: boolean; search?: string }): Promise<Volunteer[]> {
  const response = await api.get('/volunteers', { params })
  return response.data.data.data
}

export async function getVolunteer(id: string): Promise<Volunteer> {
  const response = await api.get(`/volunteers/${id}`)
  return response.data.data
}

export async function createVolunteer(input: VolunteerInput): Promise<Volunteer> {
  const response = await api.post('/volunteers', input)
  return response.data.data
}

export async function updateVolunteer(id: string, input: VolunteerInput): Promise<Volunteer> {
  const response = await api.patch(`/volunteers/${id}`, input)
  return response.data.data
}

export async function deactivateVolunteer(id: string): Promise<void> {
  await api.delete(`/volunteers/${id}`)
}
