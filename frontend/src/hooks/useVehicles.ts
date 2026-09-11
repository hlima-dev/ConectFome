import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createVehicle, deactivateVehicle, getVehicle, listVehicles, updateVehicle } from '../services/vehicles'
import type { VehicleInput } from '../types/logistics'

export function useVehicles(filters?: { includeInactive?: boolean; search?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => listVehicles(filters),
    enabled: options?.enabled ?? true,
  })
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicle(id!),
    enabled: !!id,
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VehicleInput) => createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VehicleInput) => updateVehicle(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useDeactivateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}
