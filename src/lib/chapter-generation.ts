import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = process.env.AWS_REGION ? new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
}) : null;

export interface Chapter {
  start: number;
  title: string;
  summary?: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

/**
 * Generate chapters from transcript using AI
 */
export async function generateChaptersFromTranscript(
  transcript: TranscriptSegment[],
  videoDuration?: number
): Promise<Chapter[]> {
  if (!transcript || transcript.length === 0) {
    return [];
  }

  // Build transcript text with timestamps
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.start)}] ${seg.text}`)
    .join('\n');

  const prompt = `Analyze the following video transcript and generate logical chapters. 
Each chapter should represent a distinct topic or section with a clear start time.
Return a JSON array of chapters with "start" (seconds), "title" (concise, descriptive), and "summary" (optional, 1-2 sentences).

Transcript:
${transcriptText.substring(0, 15000)}${transcriptText.length > 15000 ? '...' : ''}

${videoDuration ? `Video duration: ${formatTimestamp(videoDuration)}` : ''}

Guidelines:
- Create 4-8 chapters for typical videos
- Each chapter should be 2-5 minutes long
- Chapter titles should be clear and descriptive
- Start times should align with topic transitions
- Return ONLY valid JSON array, no other text

Example format:
[
  {"start": 0, "title": "Introduction", "summary": "Overview of the topic"},
  {"start": 180, "title": "Core Concepts", "summary": "Deep dive into main ideas"}
]`;

  try {
    // Try using Bedrock if available
    if (bedrockClient) {
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        contentType: 'application/json'
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content[0]?.text || '';
      
      // Parse JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const chapters = JSON.parse(jsonMatch[0]) as Chapter[];
        return validateAndFixChapters(chapters, videoDuration);
      }
    }

    // Fallback: generate chapters based on transcript analysis
    return generateChaptersFallback(transcript, videoDuration);
  } catch (error) {
    console.error('[ChapterGeneration] Error generating chapters:', error);
    return generateChaptersFallback(transcript, videoDuration);
  }
}

/**
 * Fallback chapter generation using heuristics
 */
function generateChaptersFallback(
  transcript: TranscriptSegment[],
  videoDuration?: number
): Chapter[] {
  if (transcript.length === 0) return [];

  const duration = videoDuration || (transcript[transcript.length - 1]?.start + transcript[transcript.length - 1]?.duration) || 600;
  const targetChapterCount = Math.max(3, Math.min(8, Math.floor(duration / 180))); // 3-8 chapters, ~3 min each
  const chapterInterval = duration / targetChapterCount;

  const chapters: Chapter[] = [];
  
  for (let i = 0; i < targetChapterCount; i++) {
    const startTime = i * chapterInterval;
    const segmentIndex = transcript.findIndex(seg => seg.start >= startTime);
    
    if (segmentIndex >= 0) {
      const segment = transcript[segmentIndex];
      const title = extractChapterTitle(segment.text);
      
      chapters.push({
        start: Math.floor(segment.start),
        title,
        summary: segment.text.substring(0, 100) + (segment.text.length > 100 ? '...' : '')
      });
    }
  }

  // Ensure first chapter starts at 0
  if (chapters.length > 0 && chapters[0].start > 0) {
    chapters.unshift({
      start: 0,
      title: 'Introduction',
      summary: transcript[0]?.text?.substring(0, 100) || 'Video introduction'
    });
  }

  return chapters;
}

/**
 * Extract a chapter title from segment text
 */
function extractChapterTitle(text: string): string {
  // Look for patterns like "First", "Now let's", "In this section", etc.
  const patterns = [
    /(?:let'?s|we'?ll|now|in this|this|here|next|finally|to conclude)/i,
  ];
  
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    // Clean up and truncate
    let title = firstSentence
      .replace(/^[^\w]+/, '') // Remove leading punctuation
      .replace(/\b(let'?s|we'?ll|now|in this|this|here)\b/gi, '')
      .trim();
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'Chapter';
  }
  
  return 'Chapter';
}

/**
 * Validate and fix chapters
 */
function validateAndFixChapters(chapters: Chapter[], videoDuration?: number): Chapter[] {
  if (!Array.isArray(chapters)) {
    return [];
  }

  // Filter out invalid chapters and sort by start time
  const valid = chapters
    .filter(ch => typeof ch === 'object' && typeof ch.start === 'number' && typeof ch.title === 'string')
    .sort((a, b) => a.start - b.start);

  // Ensure first chapter starts at 0
  if (valid.length > 0 && valid[0].start > 0) {
    valid[0].start = 0;
  }

  // Ensure chapters don't exceed video duration
  if (videoDuration) {
    return valid.filter(ch => ch.start < videoDuration);
  }

  return valid;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

