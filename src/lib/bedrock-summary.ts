import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from './logger';

const bedrockClient = process.env.AWS_REGION ? new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
}) : null;

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
}

/**
 * Generate summary and key points using Bedrock Claude
 */
export async function generateSummary(
  transcript: TranscriptSegment[]
): Promise<SummaryResult> {
  if (!transcript || transcript.length === 0) {
    return {
      title: 'Untitled session',
      summary: 'No transcript available',
      keyPoints: []
    };
  }

  // If Bedrock is not available, return mock summary for development
  if (!bedrockClient || process.env.DEV_FORCE_IN_MEMORY === 'true') {
    const fullText = transcript.map(s => s.text).join(' ');
    return {
      title: 'Learning session overview',
      summary: `This video covers ${transcript.length} key topics. ${fullText.substring(0, 200)}...`,
      keyPoints: [
        'Introduction to the topic',
        'Key concepts explained',
        'Practical examples',
        'Summary and next steps'
      ]
    };
  }

  try {
    const fullText = transcript.map(s => s.text).join(' ');
    const truncatedText = fullText.substring(0, 15000); // Claude token limit consideration

    const prompt = `Analyze the following video transcript and respond with JSON containing:
- "title": a concise, compelling title (max 12 words)
- "summary": a two-paragraph narrative summary (each 2-3 sentences)
- "keyPoints": an array of 4-6 bullet point takeaways

Transcript:
${truncatedText}${fullText.length > 15000 ? '...' : ''}

Your response must be valid JSON only, with keys: title, summary, keyPoints.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1200,
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

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Video session',
          summary: parsed.summary || text,
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []
        };
      } catch {
        // Fall through to text parsing
      }
    }

    // Fallback: parse key points from text
    const lines: string[] = String(text).split('\n');
    const summary = lines[0] || text.substring(0, 500);
    const keyPoints = lines
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^[-•\d.\s]+/, '').trim())
      .filter(point => point.length > 0)
      .slice(0, 6);

    return {
      title: 'Video session insights',
      summary,
      keyPoints: keyPoints.length > 0 ? keyPoints : [
        'Introduction to the topic',
        'Key concepts explained',
        'Practical examples',
        'Summary and next steps'
      ]
    };
  } catch (error) {
    logger.error('Summary generation failed', 
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Fallback
    const fullText = transcript.map(s => s.text).join(' ');
    return {
      title: 'Learning session overview',
      summary: `This video covers ${transcript.length} key topics. ${fullText.substring(0, 200)}...`,
      keyPoints: [
        'Introduction to the topic',
        'Key concepts explained',
        'Practical examples',
        'Summary and next steps'
      ]
    };
  }
}

