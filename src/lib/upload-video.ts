export type UploadVideoResult = {
  success: boolean;
  videoId?: string;
  error?: string;
};

/** Upload a video file to the API (requires signed-in session). */
export async function uploadVideoFile(
  file: File,
  title?: string
): Promise<UploadVideoResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  const response = await fetch('/api/video/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    return {
      success: false,
      error: data.error || `Upload failed (${response.status})`,
    };
  }

  const videoId = data.video?.id || data.video?.videoId;
  if (!videoId) {
    return { success: false, error: 'Upload succeeded but no video ID returned' };
  }

  return { success: true, videoId };
}
