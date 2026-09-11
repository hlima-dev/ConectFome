import { api } from './api'
import type { ByDonorRow, ByRecipientRow, MonthlyKgRow, ReportSummary } from '../types/reports'

export async function getMonthlyKg(params?: { year?: number; donorId?: string; recipientId?: string }): Promise<MonthlyKgRow[]> {
  const response = await api.get('/reports/monthly-kg', { params })
  return response.data.data
}

export async function getByDonor(params?: { year?: number }): Promise<ByDonorRow[]> {
  const response = await api.get('/reports/by-donor', { params })
  return response.data.data
}

export async function getByRecipient(params?: { year?: number }): Promise<ByRecipientRow[]> {
  const response = await api.get('/reports/by-recipient', { params })
  return response.data.data
}

export async function getSummary(): Promise<ReportSummary> {
  const response = await api.get('/reports/summary')
  return response.data.data
}
