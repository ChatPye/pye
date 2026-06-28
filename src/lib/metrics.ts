import { connectDocumentDB } from '@/server/db/documentdb'
import { MetricEvent } from '@/data/models/MetricEvent'
import { logger } from '@/lib/logger'

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_METRICS__: Array<{ eventType: string; timestamp: string; properties?: Record<string, any> }> | undefined
}

function getMemoryMetricsStore() {
  if (!global.__CHATPYE_METRICS__) {
    global.__CHATPYE_METRICS__ = []
  }
  return global.__CHATPYE_METRICS__
}

interface RecordMetricParams {
  eventType: string
  userId?: string
  videoId?: string
  tenantId?: string
  properties?: Record<string, any>
}

export async function recordMetric({ eventType, userId, videoId, tenantId, properties }: RecordMetricParams) {
  try {
    const db = await connectDocumentDB()
    if (db) {
      await MetricEvent.create({ eventType, userId, videoId, tenantId, properties })
      return
    }

    const store = getMemoryMetricsStore()
    store.push({ eventType, timestamp: new Date().toISOString(), properties: { ...properties, userId, videoId, tenantId } })
  } catch (error) {
    logger.error('Failed to record metric', error instanceof Error ? error : new Error(String(error)), { eventType, videoId, userId })
  }
}

export function getInMemoryMetricsSnapshot() {
  const store = getMemoryMetricsStore()
  return [...store]
}
