import { Queue } from 'bullmq';
import { redis } from './redis';

const queueCache = new Map<string, Queue>();

export function getCampaignQueue(campaignId: string): Queue {
  if (!queueCache.has(campaignId)) {
    queueCache.set(
      campaignId,
      new Queue(`tasks:${campaignId}`, {
        connection: redis,
      }),
    );
  }
  return queueCache.get(campaignId)!;
}
