import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '@/lib/auth';
import {
  buildUploadS3Key,
  generateUploadVideoId,
  MAX_UPLOAD_BYTES,
  resolveVideoContentType,
} from '@/lib/video-upload-utils';

const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'chatpye-videos';
const s3Client = process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID ? new S3Client({ region }) : null;

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : undefined;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename is required' }, { status: 400 });
    }

    const contentType = resolveVideoContentType(filename, body.contentType);
    if (!contentType) {
      return NextResponse.json(
        { success: false, error: 'Unsupported video type. Use MP4, WebM, MOV, or AVI.' },
        { status: 400 }
      );
    }

    if (fileSize !== undefined && fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: `Video file too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!s3Client) {
      return NextResponse.json(
        { success: false, error: 'S3 is not configured on the server' },
        { status: 503 }
      );
    }

    const videoId = generateUploadVideoId();
    const s3Key = buildUploadS3Key(authUser.id, videoId, filename);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        originalName: filename,
        uploadedBy: authUser.id,
        uploadDate: new Date().toISOString(),
        title: title || filename.replace(/\.[^/.]+$/, ''),
      },
    });

    const uploadUrl = await getSignedUrl(
      s3Client as unknown as Parameters<typeof getSignedUrl>[0],
      command,
      { expiresIn: 3600 }
    );

    return NextResponse.json({
      success: true,
      videoId,
      s3Key,
      uploadUrl,
      contentType,
      bucket,
    });
  } catch (error) {
    console.error('Presign upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to prepare upload' },
      { status: 500 }
    );
  }
}
