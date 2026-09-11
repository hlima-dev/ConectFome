import { useQuery } from '@tanstack/react-query'
import { getByDonor, getByRecipient, getMonthlyKg, getSummary } from '../services/reports'

export function useMonthlyKg(filters?: { year?: number; donorId?: string; recipientId?: string }) {
  return useQuery({
    queryKey: ['reports', 'monthly-kg', filters],
    queryFn: () => getMonthlyKg(filters),
  })
}

export function useByDonor(filters?: { year?: number }) {
  return useQuery({
    queryKey: ['reports', 'by-donor', filters],
    queryFn: () => getByDonor(filters),
  })
}

export function useByRecipient(filters?: { year?: number }) {
  return useQuery({
    queryKey: ['reports', 'by-recipient', filters],
    queryFn: () => getByRecipient(filters),
  })
}

export function useReportSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => getSummary(),
    enabled: options?.enabled ?? true,
  })
}
