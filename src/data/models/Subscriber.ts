import mongoose, { Schema, Model } from 'mongoose'

export interface SubscriberDocument {
  email: string
  source?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

const SubscriberSchema = new Schema<SubscriberDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    source: { type: String, default: 'pye-lab' },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
)

export const Subscriber: Model<SubscriberDocument> =
  mongoose.models.Subscriber || mongoose.model<SubscriberDocument>('Subscriber', SubscriberSchema)
