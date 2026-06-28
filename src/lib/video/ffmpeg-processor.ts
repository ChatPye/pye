/**
 * ffmpeg utilities for video processing.
 * Runs when FFMPEG_PATH is set (Lambda, Docker, EC2 — not Vercel serverless).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

export function isFfmpegAvailable(): boolean {
  return Boolean(process.env.FFMPEG_PATH || process.env.FFMPEG_ENABLED === 'true');
}

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

export type CompressOptions = {
  maxWidth?: number;
  crf?: number;
  audioBitrate?: string;
};

export async function compressVideoBuffer(
  inputBuffer: Buffer,
  inputExt = 'mp4',
  options: CompressOptions = {}
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  if (!isFfmpegAvailable()) {
    return { buffer: inputBuffer, contentType: 'video/mp4', extension: inputExt };
  }

  const { maxWidth = 1280, crf = 28, audioBitrate = '128k' } = options;
  const dir = await mkdtemp(join(tmpdir(), 'chatpye-ffmpeg-'));
  const inputPath = join(dir, `input.${inputExt}`);
  const outputPath = join(dir, 'output.mp4');

  try {
    await writeFile(inputPath, inputBuffer);
    await execFileAsync(ffmpegBin(), [
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale='min(${maxWidth},iw)':-2`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      String(crf),
      '-c:a',
      'aac',
      '-b:a',
      audioBitrate,
      '-movflags',
      '+faststart',
      outputPath,
    ]);
    const buffer = await readFile(outputPath);
    return { buffer, contentType: 'video/mp4', extension: 'mp4' };
  } finally {
    await unlink(inputPath).catch(() => null);
    await unlink(outputPath).catch(() => null);
  }
}

export async function extractThumbnailBuffer(
  inputBuffer: Buffer,
  inputExt = 'mp4',
  atSeconds = 2
): Promise<Buffer | null> {
  if (!isFfmpegAvailable()) return null;

  const dir = await mkdtemp(join(tmpdir(), 'chatpye-ffmpeg-'));
  const inputPath = join(dir, `input.${inputExt}`);
  const outputPath = join(dir, 'thumb.jpg');

  try {
    await writeFile(inputPath, inputBuffer);
    await execFileAsync(ffmpegBin(), [
      '-y',
      '-ss',
      String(atSeconds),
      '-i',
      inputPath,
      '-vframes',
      '1',
      '-q:v',
      '2',
      outputPath,
    ]);
    return await readFile(outputPath);
  } catch {
    return null;
  } finally {
    await unlink(inputPath).catch(() => null);
    await unlink(outputPath).catch(() => null);
  }
}

export async function extractAudioMp3Buffer(
  inputBuffer: Buffer,
  inputExt = 'mp4'
): Promise<Buffer | null> {
  if (!isFfmpegAvailable()) return null;

  const dir = await mkdtemp(join(tmpdir(), 'chatpye-ffmpeg-'));
  const inputPath = join(dir, `input.${inputExt}`);
  const outputPath = join(dir, 'audio.mp3');

  try {
    await writeFile(inputPath, inputBuffer);
    await execFileAsync(ffmpegBin(), [
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
    return await readFile(outputPath);
  } catch {
    return null;
  } finally {
    await unlink(inputPath).catch(() => null);
    await unlink(outputPath).catch(() => null);
  }
}
