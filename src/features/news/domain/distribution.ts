export type DistributionChannel = 'whatsapp' | 'push' | 'email'
export type DeliveryStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled'

export type WhatsAppSubscriber = {
  id: string
  whatsappId: string
  phoneNumber?: string
  userId?: string
  contributionId: string
  marketingOptIn: boolean
  newsNotificationsEnabled: boolean
  optInAt?: string
  optOutAt?: string
  createdAt: string
  updatedAt: string
}

export type NewsDelivery = {
  id: string
  newsId: string
  subscriberId: string
  channel: DistributionChannel
  status: DeliveryStatus
  queuedAt: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  providerMessageId?: string
  error?: string
  attemptCount: number
}

export const deliveryId = (newsId: string, subscriberId: string, channel: DistributionChannel) => `${newsId}__${subscriberId}__${channel}`
export const canReceiveNews = (subscriber: WhatsAppSubscriber) => Boolean(subscriber.contributionId && subscriber.marketingOptIn && subscriber.newsNotificationsEnabled && !subscriber.optOutAt)
