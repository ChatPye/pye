export type UploadVideoResult = {
  success: boolean;
  videoId?: string;
  error?: string;
};

/** Upload a video via presigned S3 URL (works on Vercel — bypasses 4.5MB API limit). */
export async function uploadVideoFile(
  file: File,
  title?: string
): Promise<UploadVideoResult> {
  const presignResponse = await fetch('/api/video/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || undefined,
      fileSize: file.size,
      title,
    }),
  });

  const presignData = await presignResponse.json().catch(() => ({}));

  if (!presignResponse.ok || !presignData.success) {
    return {
      success: false,
      error: presignData.error || `Could not start upload (${presignResponse.status})`,
    };
  }

  const { videoId, uploadUrl, s3Key, contentType } = presignData as {
    videoId: string;
    uploadUrl: string;
    s3Key: string;
    contentType: string;
  };

  const s3Response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!s3Response.ok) {
    return {
      success: false,
      error: `Storage upload failed (${s3Response.status}). Check S3 CORS in AWS.`,
    };
  }

  const completeResponse = await fetch('/api/video/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      videoId,
      s3Key,
      filename: file.name,
      contentType,
      title,
    }),
  });

  const completeData = await completeResponse.json().catch(() => ({}));

  if (!completeResponse.ok || !completeData.success) {
    return {
      success: false,
      error: completeData.error || `Upload finalization failed (${completeResponse.status})`,
    };
  }

  const id = completeData.video?.id || completeData.video?.videoId || videoId;
  return { success: true, videoId: id };
}
