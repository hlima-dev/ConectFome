export interface MonthlyKgRow {
  month: string
  totalKg: number
  donationCount: number
}

export interface ByDonorRow {
  donorId: string
  donorName: string
  totalKg: number
  donationCount: number
}

export interface ByRecipientRow {
  recipientId: string
  recipientName: string
  totalKg: number
  donationCount: number
}

export interface ReportSummary {
  totalKgRescued: number
  totalDonationsRescued: number
  deliveredDonations: number
  completedRoutes: number
  activeDonors: number
  activeRecipients: number
}
