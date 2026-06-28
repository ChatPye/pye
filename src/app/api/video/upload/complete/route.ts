import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { requireAuth } from '@/lib/auth';
import { persistVideoRecord } from '@/lib/db/video-repository';
import { recordLearningEvent } from '@/lib/db/learning-events';
import { enqueueVideoProcessingJob } from '@/services/video-processor/queue';
import { logger } from '@/lib/logger';
import {
  getFileExtension,
  isUploadVideoId,
  resolveVideoContentType,
} from '@/lib/video-upload-utils';

const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'chatpye-videos';
const s3Client = process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID ? new S3Client({ region }) : null;

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const s3Key = typeof body.s3Key === 'string' ? body.s3Key.trim() : '';
    const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;

    if (!videoId || !s3Key || !filename) {
      return NextResponse.json(
        { success: false, error: 'videoId, s3Key, and filename are required' },
        { status: 400 }
      );
    }

    if (!isUploadVideoId(videoId)) {
      return NextResponse.json({ success: false, error: 'Invalid upload video ID' }, { status: 400 });
    }

    const expectedPrefix = `videos/${authUser.id}/`;
    if (!s3Key.startsWith(expectedPrefix)) {
      return NextResponse.json({ success: false, error: 'Invalid upload path' }, { status: 403 });
    }

    const contentType = resolveVideoContentType(filename, body.contentType);
    if (!contentType) {
      return NextResponse.json(
        { success: false, error: 'Unsupported video type. Use MP4, WebM, MOV, or AVI.' },
        { status: 400 }
      );
    }

    if (!s3Client) {
      return NextResponse.json(
        { success: false, error: 'S3 is not configured on the server' },
        { status: 503 }
      );
    }

    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
    } catch {
      return NextResponse.json(
        { success: false, error: 'Upload not found in storage. Please try uploading again.' },
        { status: 400 }
      );
    }

    const ext = getFileExtension(filename);
    const thumbnailKey = `videos/${authUser.id}/${videoId}_thumb.jpg`;
    const displayTitle = title || filename.replace(/\.[^/.]+$/, '');

    const saved = await persistVideoRecord({
      videoId,
      ownerId: authUser.id,
      source: 'upload',
      title: displayTitle,
      channel: 'Uploaded Video',
      description: '',
      duration: 0,
      thumbnail: `https://${bucket}.s3.amazonaws.com/${thumbnailKey}`,
      videoUrl: `https://${bucket}.s3.amazonaws.com/${s3Key}`,
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
      payload: { source: 'upload', s3Key, contentType, extension: ext },
    });

    await enqueueVideoProcessingJob({
      videoId,
      ownerId: authUser.id,
      source: 'upload',
    });

    logger.info('Direct S3 upload completed', { videoId, s3Key, ownerId: authUser.id });

    return NextResponse.json({
      success: true,
      video: { ...saved, id: videoId },
      message: 'Video uploaded successfully. Processing will begin shortly.',
    });
  } catch (error) {
    logger.error('Complete upload error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}
