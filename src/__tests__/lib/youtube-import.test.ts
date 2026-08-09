import { parseYoutubeImportInput } from '@/lib/resources/youtube-import';

describe('parseYoutubeImportInput', () => {
  it('accepts watch URLs', () => {
    const result = parseYoutubeImportInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
    expect(result.sourceRef).toContain('dQw4w9WgXcQ');
  });

  it('accepts youtu.be links', () => {
    const result = parseYoutubeImportInput('https://youtu.be/dQw4w9WgXcQ');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  it('rejects invalid URLs', () => {
    expect(() => parseYoutubeImportInput('not-a-url')).toThrow('INVALID_YOUTUBE_URL');
  });
});
