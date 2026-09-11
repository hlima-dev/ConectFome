import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelDonation,
  confirmReceiptDonation,
  createDonation,
  getDonation,
  listDonations,
  markExpiredDonation,
  matchDonation,
  updateDonation,
} from '../services/donations'
import type { DonationInput, DonationStatus } from '../types/donations'

export function useDonations(filters?: { status?: DonationStatus; donorId?: string; recipientId?: string }) {
  return useQuery({
    queryKey: ['donations', filters],
    queryFn: () => listDonations(filters),
  })
}

export function useDonation(id: string | undefined) {
  return useQuery({
    queryKey: ['donations', id],
    queryFn: () => getDonation(id!),
    enabled: !!id,
  })
}

export function useCreateDonation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DonationInput) => createDonation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useUpdateDonation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<DonationInput>) => updateDonation(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useMatchDonation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipientId: string) => matchDonation(id, recipientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useCancelDonation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelDonation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useMarkExpiredDonation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markExpiredDonation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}

export function useConfirmReceiptDonation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => confirmReceiptDonation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donations'] }),
  })
}
