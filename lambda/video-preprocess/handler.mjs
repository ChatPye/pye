/**
 * Extract audio MP3 from S3 video for faster AWS Transcribe.
 * Deploy with ffmpeg Lambda layer — set FFMPEG_PATH=/opt/bin/ffmpeg
 *
 * Event: { videoId, videoS3Key, bucket? }
 * Returns: { audioS3Key, usedAudioExtract: true }
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execFile } from 'child_process';
import { createWriteStream, createReadStream, unlink, mkdtemp } from 'fs';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
const ffmpeg = process.env.FFMPEG_PATH || ffmpegInstaller.path;

const s3 = new S3Client({ region });

async function downloadToFile(key, destPath, eventBucket) {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: eventBucket || bucket, Key: key })
  );
  if (!res.Body) throw new Error('Empty S3 object');
  await pipeline(res.Body, createWriteStream(destPath));
}

export async function handler(event) {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
  const videoId = body.videoId;
  const videoS3Key = body.videoS3Key;
  const eventBucket = body.bucket || bucket;

  if (!videoId || !videoS3Key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'videoId and videoS3Key required' }) };
  }
  if (!eventBucket) {
    return { statusCode: 500, body: JSON.stringify({ error: 'S3 bucket not configured' }) };
  }

  const dir = await mkdtemp(join(tmpdir(), 'chatpye-preprocess-'));
  const inputPath = join(dir, 'input.mp4');
  const outputPath = join(dir, 'audio.mp3');

  try {
    await downloadToFile(videoS3Key, inputPath, eventBucket);

    await execFileAsync(ffmpeg, [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-ab',
      '128k',
      '-ar',
      '44100',
      outputPath,
    ]);

    const audioS3Key = `audio/${videoId}/${Date.now()}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: eventBucket,
        Key: audioS3Key,
        Body: createReadStream(outputPath),
        ContentType: 'audio/mpeg',
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        audioS3Key,
        transcriptionKey: audioS3Key,
        usedAudioExtract: true,
      }),
    };
  } catch (err) {
    console.error('Preprocess failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Preprocess failed',
        transcriptionKey: videoS3Key,
        usedAudioExtract: false,
      }),
    };
  } finally {
    await unlink(inputPath).catch(() => null);
    await unlink(outputPath).catch(() => null);
  }
}
