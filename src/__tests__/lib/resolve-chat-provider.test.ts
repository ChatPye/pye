import { resolveChatProvider, resolveYouTubeWatchUrl } from '@/lib/ai/resolve-chat-provider';
import { isUploadVideoId } from '@/lib/video-upload-utils';
import { extractYouTubeVideoId } from '@/lib/youtube';

describe('resolveChatProvider', () => {
  it('routes public YouTube ids to Gemini', () => {
    expect(resolveChatProvider({ videoId: 'dQw4w9WgXcQ' })).toBe('gemini-youtube');
  });

  it('routes upload ids to Bedrock', () => {
    expect(resolveChatProvider({ videoId: 'upload_123_abc' })).toBe('bedrock-upload');
  });

  it('routes by persisted source field', () => {
    expect(
      resolveChatProvider({
        videoId: 'abc',
        videoRecord: { videoId: 'abc', source: 'youtube' } as any,
      }),
    ).toBe('gemini-youtube');
    expect(
      resolveChatProvider({
        videoId: 'upload_x',
        videoRecord: { videoId: 'upload_x', source: 'upload' } as any,
      }),
    ).toBe('bedrock-upload');
  });
});

describe('resolveYouTubeWatchUrl', () => {
  it('builds a watch URL from a bare video id', () => {
    expect(resolveYouTubeWatchUrl({ videoId: 'dQw4w9WgXcQ' })).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });

  it('returns null for uploads', () => {
    expect(resolveYouTubeWatchUrl({ videoId: 'upload_123' })).toBeNull();
    expect(isUploadVideoId('upload_123')).toBe(true);
    expect(extractYouTubeVideoId('upload_123')).toBeNull();
  });
});
