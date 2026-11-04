import type { DonationAction } from './donations'

export interface AppNotification {
  id: string
  donationId: string
  action: DonationAction
  message: string
  readAt: string | null
  createdAt: string
}

export interface NotificationList {
  items: AppNotification[]
  unreadCount: number
}
