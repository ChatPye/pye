import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProcessingStatus =
  | 'queued'
  | 'pending'
  | 'extracting'
  | 'transcribing'
  | 'embedding'
  | 'complete'
  | 'failed';

export interface StatusHistoryEntry {
  status: ProcessingStatus;
  updatedAt: Date;
}

export interface VideoProcessDocument extends Document {
  videoId: string;
  ownerId?: string | null;
  source: 'youtube' | 'upload' | 'unknown';
  title: string;
  channel: string;
  description: string;
  duration: number;
  thumbnail: string;
  s3Key?: string;
  videoUrl?: string;
  published: string;
  transcript: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  embeddings: Array<{
    text: string;
    start: number;
    duration: number;
    embedding: number[];
  }>;
  chapters: Array<{
    start: number;
    title: string;
    summary?: string;
  }>;
  summary: string;
  keyPoints: string[];
  /** JSON metadata for async jobs (transcribe job id, embedding offset, etc.) */
  transcriptRef?: string;
  processingStatus: ProcessingStatus;
  errorMessage?: string;
  statusHistory: StatusHistoryEntry[];
  processingCost?: number;
  accessCount: number;
  lastAccessed: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VideoProcessSchema = new Schema<VideoProcessDocument>(
  {
    videoId: { type: String, required: true, unique: true },
    ownerId: { type: String, default: null },
    source: {
      type: String,
      enum: ['youtube', 'upload', 'unknown'],
      default: 'unknown',
    },
    title: { type: String, required: true },
    channel: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: Number, required: true },
    thumbnail: { type: String, required: true },
    s3Key: { type: String, default: null },
    videoUrl: { type: String, default: null },
    published: { type: String, required: true },
    transcript: [
      {
        text: { type: String },
        start: { type: Number },
        duration: { type: Number },
      },
    ],
    embeddings: [
      {
        text: { type: String },
        start: { type: Number },
        duration: { type: Number },
        embedding: { type: [Number] },
      },
    ],
    chapters: {
      type: [
        {
          start: { type: Number },
          title: { type: String },
          summary: { type: String },
        },
      ],
      default: [],
    },
    summary: { type: String, default: '' },
    keyPoints: { type: [String], default: [] },
    processingStatus: {
      type: String,
      enum: ['queued', 'pending', 'extracting', 'transcribing', 'embedding', 'complete', 'failed'],
      default: 'queued',
    },
    errorMessage: { type: String, default: '' },
    processingCost: { type: Number, default: 0 },
    accessCount: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const VideoProcess: Model<VideoProcessDocument> =
  mongoose.models.VideoProcess || mongoose.model<VideoProcessDocument>('VideoProcess', VideoProcessSchema);
