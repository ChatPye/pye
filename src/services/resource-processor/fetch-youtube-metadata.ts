export type YoutubeOEmbedMetadata = {
  title: string;
  author?: string;
  thumbnail?: string;
  provider?: string;
};

export async function fetchYoutubeOEmbedMetadata(videoId: string): Promise<YoutubeOEmbedMetadata> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ChatPye/1.0' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`YOUTUBE_OEMBED_${response.status}`);
  }

  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    provider_name?: string;
  };

  return {
    title: data.title?.trim() || `YouTube tutorial ${videoId}`,
    author: data.author_name,
    thumbnail: data.thumbnail_url,
    provider: data.provider_name,
  };
}
