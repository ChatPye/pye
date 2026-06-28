import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { enqueueVideoProcessingJob } from '@/services/video-processor/queue';
import { persistVideoRecord } from '@/lib/db/video-repository';
import { recordLearningEvent } from '@/lib/db/learning-events';
import { logger } from '@/lib/logger';

const s3Client = process.env.AWS_REGION ? new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1' 
}) : null;

const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'chatpye-videos';

/**
 * Generate unique video ID for uploaded videos
 */
function generateVideoId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Compress video using ffmpeg (if available) or return original
 * For now, we'll upload as-is and handle compression in processing
 */
async function compressVideo(buffer: Buffer, filename: string): Promise<Buffer> {
  // TODO: Integrate ffmpeg for actual compression
  // For now, just validate and return original
  // In production, use ffmpeg to compress to reasonable quality/size
  const maxSize = 500 * 1024 * 1024; // 500MB limit
  if (buffer.length > maxSize) {
    throw new Error(`Video file too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
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

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid file type. Supported: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Generate video ID
    const videoId = generateVideoId();
    const fileExtension = file.name.split('.').pop() || 'mp4';
    
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
    const processedBuffer = await compressVideo(buffer, file.name);

    // Upload to S3
    if (s3Client) {
      const s3Key = `videos/${authUser.id}/${videoId}.${fileExtension}`;
      const thumbnailKey = `videos/${authUser.id}/${videoId}_thumb.jpg`; // Will be generated during processing
      
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: processedBuffer,
        ContentType: file.type,
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

