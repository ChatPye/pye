import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { getFileExtension, resolveVideoContentType } from '@/lib/video-upload-utils';

const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'chatpye-videos';
const s3Client =
  process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID
    ? new S3Client({ region })
    : null;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const authUser = await requireAuth();
    const video = await findVideoByExternalId(id);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.ownerId && video.ownerId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!s3Client || !video.s3Key) {
      if (video.videoUrl?.startsWith('http')) {
        return NextResponse.redirect(video.videoUrl);
      }
      return NextResponse.json({ error: 'Video stream unavailable' }, { status: 404 });
    }

    const range = request.headers.get('range') ?? undefined;
    const filename = video.s3Key.split('/').pop() || `${id}.mp4`;
    const contentType = resolveVideoContentType(filename) || 'video/mp4';

    let totalSize = 0;
    try {
      const head = await s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: video.s3Key })
      );
      totalSize = head.ContentLength ?? 0;
    } catch {
      /* head optional */
    }

    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: video.s3Key,
        Range: range ?? undefined,
      })
    );

    if (!object.Body) {
      return NextResponse.json({ error: 'Empty video object' }, { status: 500 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.ContentType || contentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');

    if (object.ContentLength != null) {
      headers.set('Content-Length', String(object.ContentLength));
    }

    const isPartial = Boolean(range && object.ContentRange);
    if (object.ContentRange) {
      headers.set('Content-Range', object.ContentRange);
    } else if (totalSize > 0) {
      headers.set('Content-Length', String(totalSize));
    }

    const body =
      typeof (object.Body as { transformToWebStream?: () => ReadableStream }).transformToWebStream ===
      'function'
        ? (object.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
        : object.Body;

    return new NextResponse(body as BodyInit, {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error('Video stream error:', error);
    const message = error instanceof Error ? error.message : 'Stream failed';
    const status = message.includes('Authentication') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
