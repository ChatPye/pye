import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getVideoForSearch } from '@/lib/db/video-repository'
import { getMemoryVideo } from '@/data/stores/videoMemoryStore'
import { logger } from '@/lib/logger'

const bedrockClient = process.env.AWS_REGION
  ? new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  : null

export interface SearchResult {
  text: string
  start: number
  duration: number
  score: number
  embedding?: number[]
}

export class VectorSearchService {
  static async generateEmbedding(text: string): Promise<number[]> {
    if (!bedrockClient) {
      throw new Error('Embedding provider is not configured')
    }

    try {
      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v1',
        body: JSON.stringify({ inputText: text }),
        contentType: 'application/json',
      })

      const response = await bedrockClient.send(command)
      const result = JSON.parse(new TextDecoder().decode(response.body))
      return result.embedding
    } catch (error) {
      logger.error('Error generating embedding:', error as Error)
      throw error
    }
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  static async searchTranscript(
    videoId: string,
    query: string,
    limit: number = 8
  ): Promise<SearchResult[]> {
    let fallbackTranscript: Array<{ text: string; start: number; duration: number }> = []
    try {
      let video = await getVideoForSearch(videoId)

      if (!video && process.env.DEV_FORCE_IN_MEMORY === 'true') {
        video = getMemoryVideo(videoId) as typeof video
      }

      if (!video) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Video not found for search, using empty fallback', { videoId })
          return this.keywordSearch([], query, limit)
        }
        throw new Error('Video not found')
      }

      fallbackTranscript = video.transcript || []

      if (!bedrockClient || !video.embeddings || video.embeddings.length === 0) {
        return this.keywordSearch(fallbackTranscript, query, limit)
      }

      const queryVector = await this.generateEmbedding(query)

      const scoredSegments = video.embeddings.map((segment) => {
        const vector = segment.embedding ?? (segment as { vector?: number[] }).vector ?? []
        const similarity = this.cosineSimilarity(queryVector, vector)
        return {
          text: segment.text,
          start: segment.start,
          duration: segment.duration,
          score: similarity,
          embedding: vector,
        }
      })

      return scoredSegments.sort((a, b) => b.score - a.score).slice(0, limit)
    } catch (error) {
      logger.error('Vector search failed:', error as Error)
      return this.keywordSearch(fallbackTranscript, query, limit)
    }
  }

  private static keywordSearch(
    transcript: Array<{ text: string; start: number; duration: number }>,
    query: string,
    limit: number
  ): SearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const scored = transcript.map((seg) => {
      const lower = seg.text.toLowerCase()
      const matchCount = terms.filter((t) => lower.includes(t)).length
      return {
        text: seg.text,
        start: seg.start,
        duration: seg.duration,
        score: matchCount / terms.length,
      }
    })

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
