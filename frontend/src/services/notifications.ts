import { api } from './api'
import type { AppNotification, NotificationList } from '../types/notifications'

export async function listNotifications(): Promise<NotificationList> {
  const response = await api.get('/notifications', { params: { limit: 20 } })
  return response.data.data
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const response = await api.patch(`/notifications/${id}/read`)
  return response.data.data
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const response = await api.patch('/notifications/read-all')
  return response.data.data
}
