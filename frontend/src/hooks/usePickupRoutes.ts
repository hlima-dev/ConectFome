import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  attachDonationToRoute,
  cancelPickupRoute,
  completePickupRoute,
  createPickupRoute,
  detachDonationFromRoute,
  getPickupRoute,
  listPickupRoutes,
  startPickupRoute,
  updatePickupRoute,
} from '../services/pickupRoutes'
import type { PickupRouteInput, PickupRouteStatus } from '../types/logistics'

export function usePickupRoutes(filters?: { status?: PickupRouteStatus; vehicleId?: string; volunteerId?: string }) {
  return useQuery({
    queryKey: ['pickup-routes', filters],
    queryFn: () => listPickupRoutes(filters),
  })
}

export function usePickupRoute(id: string | undefined) {
  return useQuery({
    queryKey: ['pickup-routes', id],
    queryFn: () => getPickupRoute(id!),
    enabled: !!id,
  })
}

export function useCreatePickupRoute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PickupRouteInput) => createPickupRoute(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pickup-routes'] }),
  })
}

export function useUpdatePickupRoute(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<PickupRouteInput>) => updatePickupRoute(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pickup-routes'] }),
  })
}

function useRouteAction(mutationFn: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-routes'] })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

export function useAttachDonation(routeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donationId: string) => attachDonationToRoute(routeId, donationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-routes'] })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

export function useDetachDonation(routeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (donationId: string) => detachDonationFromRoute(routeId, donationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-routes'] })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
  })
}

export function useStartRoute(id: string) {
  return useRouteAction(() => startPickupRoute(id))
}

export function useCompleteRoute(id: string) {
  return useRouteAction(() => completePickupRoute(id))
}

export function useCancelRoute(id: string) {
  return useRouteAction(() => cancelPickupRoute(id))
}
