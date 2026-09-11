import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createVolunteer,
  deactivateVolunteer,
  getVolunteer,
  listVolunteers,
  updateVolunteer,
} from '../services/volunteers'
import type { VolunteerInput } from '../types/logistics'

export function useVolunteers(filters?: { includeInactive?: boolean; search?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['volunteers', filters],
    queryFn: () => listVolunteers(filters),
    enabled: options?.enabled ?? true,
  })
}

export function useVolunteer(id: string | undefined) {
  return useQuery({
    queryKey: ['volunteers', id],
    queryFn: () => getVolunteer(id!),
    enabled: !!id,
  })
}

export function useCreateVolunteer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VolunteerInput) => createVolunteer(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteers'] }),
  })
}

export function useUpdateVolunteer(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VolunteerInput) => updateVolunteer(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteers'] }),
  })
}

export function useDeactivateVolunteer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateVolunteer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteers'] }),
  })
}
