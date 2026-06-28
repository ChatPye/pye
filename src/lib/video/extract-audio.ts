import ytdl from 'ytdl-core';

export async function downloadYouTubeAudio(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const audioStream = ytdl(url, {
    quality: 'highestaudio',
    filter: 'audioonly',
    highWaterMark: 1 << 25,
  });

  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    audioStream.on('data', (chunk) => chunks.push(chunk));
    audioStream.on('error', (error) => reject(error));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
