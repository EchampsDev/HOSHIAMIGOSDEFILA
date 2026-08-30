import type { NewsPublishedEvent } from '../domain/types'
import { canReceiveNews, deliveryId, type DistributionChannel, type NewsDelivery, type WhatsAppSubscriber } from '../domain/distribution'

export interface SubscriberRepository { listEligible(channel: DistributionChannel): Promise<WhatsAppSubscriber[]> }
export interface DeliveryRepository { createIfAbsent(delivery: NewsDelivery): Promise<boolean> }
export interface NewsDistributionQueue { enqueue(deliveryId: string): Promise<void> }

export class NewsDistributionService {
  constructor(private subscribers: SubscriberRepository, private deliveries: DeliveryRepository, private queue: NewsDistributionQueue) {}

  async handle(event: NewsPublishedEvent, channel: DistributionChannel = 'whatsapp') {
    const subscribers = (await this.subscribers.listEligible(channel)).filter(canReceiveNews)
    const queuedAt = new Date().toISOString()
    for (const subscriber of subscribers) {
      const id = deliveryId(event.newsId, subscriber.id, channel)
      const created = await this.deliveries.createIfAbsent({ id, newsId: event.newsId, subscriberId: subscriber.id, channel, status: 'queued', queuedAt, attemptCount: 0 })
      if (created) await this.queue.enqueue(id)
    }
  }
}
