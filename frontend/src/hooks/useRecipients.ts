import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRecipient, deactivateRecipient, getRecipient, listRecipients, updateRecipient } from '../services/recipients'
import type { RecipientInput } from '../types/recipients'

export function useRecipients(filters?: { includeInactive?: boolean; search?: string }) {
  return useQuery({
    queryKey: ['recipients', filters],
    queryFn: () => listRecipients(filters),
  })
}

export function useRecipient(id: string | undefined) {
  return useQuery({
    queryKey: ['recipients', id],
    queryFn: () => getRecipient(id!),
    enabled: !!id,
  })
}

export function useCreateRecipient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipientInput) => createRecipient(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipients'] }),
  })
}

export function useUpdateRecipient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipientInput) => updateRecipient(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipients'] }),
  })
}

export function useDeactivateRecipient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateRecipient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipients'] }),
  })
}
