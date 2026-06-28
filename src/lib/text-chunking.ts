import { getTitanEmbeddings } from './ai-model-router';

// Text Chunking and Vector Retrieval Service
export class TextChunkingService {
  private chunkSize: number;
  private chunkOverlap: number;
  private maxChunks: number;

  constructor(
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    maxChunks: number = 10
  ) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.maxChunks = maxChunks;
  }

  // Chunk text into overlapping segments
  chunkText(text: string): string[] {
    if (!text || text.length === 0) return [];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunk = text.slice(start, end);

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastSentenceEnd = chunk.lastIndexOf('.');
        const lastQuestionEnd = chunk.lastIndexOf('?');
        const lastExclamationEnd = chunk.lastIndexOf('!');
        
        const lastBreak = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
        
        if (lastBreak > start + this.chunkSize * 0.5) {
          chunk = chunk.slice(0, lastBreak + 1);
        }
      }

      chunks.push(chunk.trim());
      start = end - this.chunkOverlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  // Chunk transcript with timestamps
  chunkTranscriptWithTimestamps(transcript: Array<{
    text: string;
    timestamp: number;
    duration?: number;
  }>): Array<{
    text: string;
    startTime: number;
    endTime: number;
    chunkIndex: number;
  }> {
    if (!transcript || transcript.length === 0) return [];

    const chunks: Array<{
      text: string;
      startTime: number;
      endTime: number;
      chunkIndex: number;
    }> = [];

    let currentChunk = '';
    let chunkStartTime = 0;
    let chunkIndex = 0;

    for (let i = 0; i < transcript.length; i++) {
      const segment = transcript[i];
      const segmentText = segment.text.trim();
      
      if (!segmentText) continue;

      // If adding this segment would exceed chunk size, finalize current chunk
      if (currentChunk.length + segmentText.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          startTime: chunkStartTime,
          endTime: segment.timestamp,
          chunkIndex: chunkIndex++,
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + ' ' + segmentText;
        chunkStartTime = Math.max(0, segment.timestamp - this.chunkOverlap * 1000); // Convert to milliseconds
      } else {
        if (currentChunk.length === 0) {
          chunkStartTime = segment.timestamp;
        }
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + segmentText;
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      const lastSegment = transcript[transcript.length - 1];
      chunks.push({
        text: currentChunk.trim(),
        startTime: chunkStartTime,
        endTime: lastSegment.timestamp + (lastSegment.duration || 0),
        chunkIndex: chunkIndex++,
      });
    }

    return chunks;
  }

  // Get overlap text from previous chunk
  private getOverlapText(text: string): string {
    if (text.length <= this.chunkOverlap) return text;
    
    const overlapStart = text.length - this.chunkOverlap;
    let overlapText = text.slice(overlapStart);
    
    // Try to break at word boundary
    const firstSpace = overlapText.indexOf(' ');
    if (firstSpace > 0) {
      overlapText = overlapText.slice(firstSpace + 1);
    }
    
    return overlapText;
  }

  // Generate embeddings for chunks
  async generateChunkEmbeddings(chunks: string[]): Promise<number[][]> {
    try {
      const embeddings = await getTitanEmbeddings(chunks);
      return embeddings;
    } catch (error) {
      console.error('Failed to generate chunk embeddings:', error);
      throw new Error('Failed to generate embeddings for text chunks');
    }
  }

  // Find relevant chunks using vector similarity
  async findRelevantChunks(
    query: string,
    chunks: string[],
    embeddings: number[][],
    topK: number = this.maxChunks
  ): Promise<Array<{
    chunk: string;
    score: number;
    index: number;
  }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await getTitanEmbeddings([query]);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error('Failed to generate query embedding');
      }

      // Calculate cosine similarity
      const similarities = embeddings.map((embedding, index) => ({
        chunk: chunks[index],
        score: this.cosineSimilarity(queryEmbedding[0], embedding),
        index,
      }));

      // Sort by similarity score (descending)
      similarities.sort((a, b) => b.score - a.score);

      // Return top K results
      return similarities.slice(0, topK);
    } catch (error) {
      console.error('Failed to find relevant chunks:', error);
      throw new Error('Failed to find relevant text chunks');
    }
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Process video transcript for retrieval
  async processVideoTranscript(
    transcript: string,
    videoId: string
  ): Promise<{
    chunks: string[];
    embeddings: number[][];
    chunkMetadata: Array<{
      index: number;
      startTime?: number;
      endTime?: number;
    }>;
  }> {
    try {
      // Chunk the transcript
      const chunks = this.chunkText(transcript);
      
      if (chunks.length === 0) {
        throw new Error('No chunks generated from transcript');
      }

      // Generate embeddings for chunks
      const embeddings = await this.generateChunkEmbeddings(chunks);

      // Create chunk metadata
      const chunkMetadata = chunks.map((_, index) => ({
        index,
        // Note: For timestamped chunks, you'd need to pass timestamp information
        // This is a simplified version
      }));

      return {
        chunks,
        embeddings,
        chunkMetadata,
      };
    } catch (error) {
      console.error('Failed to process video transcript:', error);
      throw new Error('Failed to process video transcript for retrieval');
    }
  }

  // Process timestamped transcript for retrieval
  async processTimestampedTranscript(
    transcript: Array<{
      text: string;
      timestamp: number;
      duration?: number;
    }>,
    videoId: string
  ): Promise<{
    chunks: Array<{
      text: string;
      startTime: number;
      endTime: number;
      chunkIndex: number;
    }>;
    embeddings: number[][];
    chunkMetadata: Array<{
      index: number;
      startTime: number;
      endTime: number;
    }>;
  }> {
    try {
      // Chunk the transcript with timestamps
      const timestampedChunks = this.chunkTranscriptWithTimestamps(transcript);
      
      if (timestampedChunks.length === 0) {
        throw new Error('No chunks generated from timestamped transcript');
      }

      // Extract text chunks for embedding generation
      const textChunks = timestampedChunks.map(chunk => chunk.text);

      // Generate embeddings for chunks
      const embeddings = await this.generateChunkEmbeddings(textChunks);

      // Create chunk metadata with timestamps
      const chunkMetadata = timestampedChunks.map(chunk => ({
        index: chunk.chunkIndex,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
      }));

      return {
        chunks: timestampedChunks,
        embeddings,
        chunkMetadata,
      };
    } catch (error) {
      console.error('Failed to process timestamped transcript:', error);
      throw new Error('Failed to process timestamped transcript for retrieval');
    }
  }

  // Find relevant chunks with timestamps
  async findRelevantChunksWithTimestamps(
    query: string,
    timestampedChunks: Array<{
      text: string;
      startTime: number;
      endTime: number;
      chunkIndex: number;
    }>,
    embeddings: number[][],
    topK: number = this.maxChunks
  ): Promise<Array<{
    chunk: string;
    score: number;
    index: number;
    startTime: number;
    endTime: number;
  }>> {
    try {
      // Extract text chunks for similarity calculation
      const textChunks = timestampedChunks.map(chunk => chunk.text);

      // Find relevant chunks
      const relevantChunks = await this.findRelevantChunks(
        query,
        textChunks,
        embeddings,
        topK
      );

      // Add timestamp information
      return relevantChunks.map(result => {
        const timestampedChunk = timestampedChunks[result.index];
        return {
          ...result,
          startTime: timestampedChunk.startTime,
          endTime: timestampedChunk.endTime,
        };
      });
    } catch (error) {
      console.error('Failed to find relevant chunks with timestamps:', error);
      throw new Error('Failed to find relevant timestamped chunks');
    }
  }

  // Get chunk context (surrounding chunks)
  getChunkContext(
    chunks: string[],
    targetIndex: number,
    contextSize: number = 1
  ): string {
    const start = Math.max(0, targetIndex - contextSize);
    const end = Math.min(chunks.length, targetIndex + contextSize + 1);
    
    return chunks.slice(start, end).join(' ');
  }

  // Get timestamped chunk context
  getTimestampedChunkContext(
    timestampedChunks: Array<{
      text: string;
      startTime: number;
      endTime: number;
      chunkIndex: number;
    }>,
    targetIndex: number,
    contextSize: number = 1
  ): {
    text: string;
    startTime: number;
    endTime: number;
  } {
    const start = Math.max(0, targetIndex - contextSize);
    const end = Math.min(timestampedChunks.length, targetIndex + contextSize + 1);
    
    const contextChunks = timestampedChunks.slice(start, end);
    
    return {
      text: contextChunks.map(chunk => chunk.text).join(' '),
      startTime: contextChunks[0].startTime,
      endTime: contextChunks[contextChunks.length - 1].endTime,
    };
  }
}

// Export the service
export const textChunkingService = new TextChunkingService();
