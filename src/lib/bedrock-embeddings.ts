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

export interface SegmentWithEmbedding extends TranscriptSegment {
  embedding: number[];
}

/**
 * Generate embeddings using Bedrock Titan Embeddings model
 */
export async function generateEmbeddings(
  transcript: TranscriptSegment[]
): Promise<SegmentWithEmbedding[]> {
  if (!transcript || transcript.length === 0) {
    return [];
  }

  // If Bedrock is not available, return mock embeddings for development
  if (!bedrockClient || process.env.DEV_FORCE_IN_MEMORY === 'true') {
    logger.warn('Using mock embeddings (Bedrock not available or dev mode)', {
      segmentCount: transcript.length
    });
    return transcript.map(segment => ({
      ...segment,
      embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1)
    }));
  }

  try {
    const embeddings: SegmentWithEmbedding[] = [];
    
    // Process in batches to avoid token limits (Titan supports up to 8192 tokens)
    const batchSize = 50; // Conservative batch size
    const batches = [];
    
    for (let i = 0; i < transcript.length; i += batchSize) {
      batches.push(transcript.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      // Create input text from batch
      const texts = batch.map(seg => seg.text);
      
      // Generate embeddings for this batch
      const batchEmbeddings = await Promise.all(
        texts.map(async (text) => {
          try {
            const command = new InvokeModelCommand({
              modelId: 'amazon.titan-embed-text-v1',
              body: JSON.stringify({
                inputText: text
              }),
              contentType: 'application/json'
            });

            const response = await bedrockClient.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            return responseBody.embedding || [];
          } catch (error) {
            logger.error('Embedding generation failed for segment', 
              error instanceof Error ? error : new Error(String(error)),
              { text: text.substring(0, 50) }
            );
            // Return zero vector on error
            return Array.from({ length: 1536 }, () => 0);
          }
        })
      );

      // Combine embeddings with segments
      for (let i = 0; i < batch.length; i++) {
        embeddings.push({
          ...batch[i],
          embedding: batchEmbeddings[i] || Array.from({ length: 1536 }, () => 0)
        });
      }
    }

    logger.info('Generated embeddings', { 
      totalSegments: transcript.length, 
      batches: batches.length 
    });

    return embeddings;
  } catch (error) {
    logger.error('Embedding generation failed', 
      error instanceof Error ? error : new Error(String(error)),
      { segmentCount: transcript.length }
    );
    
    // Fallback to mock embeddings
    return transcript.map(segment => ({
      ...segment,
      embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1)
    }));
  }
}

