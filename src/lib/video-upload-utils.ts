const VALID_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/avi',
]);

const EXT_TO_TYPE: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

const EXT_TO_TRANSCRIBE_FORMAT: Record<string, string> = {
  mp4: 'mp4',
  webm: 'webm',
  mov: 'mp4',
  avi: 'mp4',
  m4v: 'mp4',
  mp3: 'mp3',
};

export function generateUploadVideoId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || 'mp4';
}

export function resolveVideoContentType(filename: string, reportedType?: string): string | null {
  const trimmed = reportedType?.trim();
  if (trimmed && VALID_TYPES.has(trimmed)) {
    return trimmed;
  }

  const ext = getFileExtension(filename);
  return EXT_TO_TYPE[ext] ?? null;
}

export function getTranscribeMediaFormat(s3KeyOrFilename: string): string {
  const ext = getFileExtension(s3KeyOrFilename.split('/').pop() || s3KeyOrFilename);
  return EXT_TO_TRANSCRIBE_FORMAT[ext] || 'mp4';
}

export function isUploadVideoId(videoId: string): boolean {
  return videoId.startsWith('upload_');
}

export function buildUploadS3Key(ownerId: string, videoId: string, filename: string): string {
  const ext = getFileExtension(filename);
  return `videos/${ownerId}/${videoId}.${ext}`;
}

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
