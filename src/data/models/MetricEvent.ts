import mongoose, { Schema, Model } from 'mongoose'

export interface MetricEventDocument {
  eventType: string
  userId?: string
  videoId?: string
  tenantId?: string
  properties?: Record<string, any>
  createdAt: Date
}

const MetricEventSchema = new Schema<MetricEventDocument>(
  {
    eventType: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    videoId: { type: String, index: true },
    tenantId: { type: String, index: true },
    properties: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

MetricEventSchema.index({ createdAt: -1 })

export const MetricEvent: Model<MetricEventDocument> =
  mongoose.models.MetricEvent || mongoose.model<MetricEventDocument>('MetricEvent', MetricEventSchema)
