export type UploadVideoResult = {
  success: boolean;
  videoId?: string;
  error?: string;
};

export type UploadProgressHandler = (percent: number, stage: string) => void;

function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: UploadProgressHandler
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct, 'uploading');
      }
    };

    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        })
      );
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

/** Upload a video via presigned S3 URL (works on Vercel — bypasses 4.5MB API limit). */
export async function uploadVideoFile(
  file: File,
  title?: string,
  onProgress?: UploadProgressHandler
): Promise<UploadVideoResult> {
  onProgress?.(5, 'preparing');

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

  onProgress?.(10, 'uploading');

  const s3Response = await uploadWithProgress(uploadUrl, file, contentType, (pct) => {
    onProgress?.(10 + Math.round(pct * 0.75), 'uploading');
  });

  if (!s3Response.ok) {
    return {
      success: false,
      error: `Storage upload failed (${s3Response.status}). Check S3 CORS in AWS.`,
    };
  }

  onProgress?.(90, 'finalizing');

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

  onProgress?.(100, 'done');

  const id = completeData.video?.id || completeData.video?.videoId || videoId;
  return { success: true, videoId: id };
}
