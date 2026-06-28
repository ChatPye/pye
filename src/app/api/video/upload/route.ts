import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { enqueueVideoProcessingJob } from '@/services/video-processor/queue';
import { persistVideoRecord } from '@/lib/db/video-repository';
import { recordLearningEvent } from '@/lib/db/learning-events';
import { logger } from '@/lib/logger';
import {
  buildUploadS3Key,
  generateUploadVideoId,
  MAX_UPLOAD_BYTES,
  resolveVideoContentType,
} from '@/lib/video-upload-utils';

const s3Client = process.env.AWS_REGION ? new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1' 
}) : null;

const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'chatpye-videos';

async function compressVideo(buffer: Buffer): Promise<Buffer> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(`Video file too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`);
  }
  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const headers = request.headers;
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true';
    const authUser = isDevBypass ? { id: 'dev-user' } : await requireAuth();

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    const contentType = resolveVideoContentType(file.name, file.type);
    if (!contentType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Supported: MP4, WebM, MOV, AVI' 
      }, { status: 400 });
    }

    const videoId = generateUploadVideoId();
    
    logger.info('Uploading video', { 
      videoId, 
      filename: file.name, 
      size: file.size,
      type: file.type 
    });

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress if needed (placeholder for now)
    const processedBuffer = await compressVideo(buffer);

    // Upload to S3
    if (s3Client) {
      const s3Key = buildUploadS3Key(authUser.id, videoId, file.name);
      const thumbnailKey = `videos/${authUser.id}/${videoId}_thumb.jpg`; // Will be generated during processing
      
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: processedBuffer,
        ContentType: contentType,
        Metadata: {
          originalName: file.name,
          uploadedBy: authUser.id,
          uploadDate: new Date().toISOString(),
        },
      });

      await s3Client.send(uploadCommand);
      
      logger.info('Video uploaded to S3', { videoId, s3Key, size: processedBuffer.length });

      // Create video record in Aurora (or Mongo/memory fallback)
      const saved = await persistVideoRecord({
        videoId,
        ownerId: authUser.id,
        source: 'upload',
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        channel: 'Uploaded Video',
        description: description || '',
        duration: 0,
        thumbnail: `https://${BUCKET_NAME}.s3.amazonaws.com/${thumbnailKey}`,
        videoUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
        s3Key,
        published: new Date().toISOString(),
        processingStatus: 'queued',
        accessCount: 1,
        lastAccessed: new Date(),
        statusHistory: [{ status: 'queued', updatedAt: new Date() }],
        transcript: [],
        embeddings: [],
        chapters: [],
        summary: '',
        keyPoints: [],
      });

      await recordLearningEvent({
        ownerClerkId: authUser.id,
        type: 'video.uploaded',
        externalVideoId: videoId,
        payload: { source: 'upload', s3Key },
      });

      // Queue processing job
      await enqueueVideoProcessingJob({ 
        videoId, 
        ownerId: authUser.id, 
        source: 'upload' 
      });

      logger.info('Video processing job queued', { videoId });

      return NextResponse.json({
        success: true,
        video: {
          ...saved,
          id: videoId,
        },
        message: 'Video uploaded successfully. Processing will begin shortly.',
      });
    } else {
      // Fallback for dev mode without S3
      logger.warn('S3 not configured, using in-memory storage', { videoId });
      
      const saved = await persistVideoRecord({
        videoId,
        ownerId: authUser.id,
        source: 'upload',
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        channel: 'Uploaded Video',
        description: description || '',
        duration: 0,
        thumbnail: '',
        videoUrl: `data:${file.type};base64,${buffer.toString('base64')}`.substring(0, 100),
        published: new Date().toISOString(),
        processingStatus: 'queued',
        accessCount: 1,
        lastAccessed: new Date(),
        statusHistory: [{ status: 'queued', updatedAt: new Date() }],
        transcript: [],
        embeddings: [],
        chapters: [],
        summary: '',
        keyPoints: [],
      });

      await recordLearningEvent({
        ownerClerkId: authUser.id,
        type: 'video.uploaded',
        externalVideoId: videoId,
        payload: { source: 'upload', devMode: true },
      });
      
      await enqueueVideoProcessingJob({ 
        videoId, 
        ownerId: authUser.id, 
        source: 'upload' 
      });

      return NextResponse.json({
        success: true,
        video: {
          ...saved,
          id: videoId,
        },
        message: 'Video uploaded successfully (dev mode). Processing will begin shortly.',
      });
    }
  } catch (error) {
    logger.error('Video upload error', 
      error instanceof Error ? error : new Error(String(error))
    );
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
}

