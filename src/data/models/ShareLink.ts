import mongoose, { Schema, Model } from 'mongoose'

export interface ShareLinkDocument {
  shareId: string
  tenantId: string
  userId: string
  videoId: string
  type: string
  content: string
  createdAt: Date
  expiresAt?: Date
}

const ShareLinkSchema = new Schema<ShareLinkDocument>(
  {
    shareId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    videoId: { type: String, required: true },
    type: { type: String, default: 'response' },
    content: { type: String, required: true },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

ShareLinkSchema.index({ tenantId: 1, createdAt: -1 })

export const ShareLink: Model<ShareLinkDocument> =
  mongoose.models.ShareLink || mongoose.model<ShareLinkDocument>('ShareLink', ShareLinkSchema)
