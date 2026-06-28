import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import mongoose from 'mongoose';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

// DocumentDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  
  try {
    await mongoose.connect(
      process.env.DOCUMENTDB_URI || 'mongodb://localhost:27017/chatpye'
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// Transcript schema
const TranscriptSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  transcript: [{
    text: String,
    start: Number,
    duration: Number
  }],
  summary: String,
  embeddings: [{
    text: String,
    vector: [Number],
    start: Number,
    duration: Number
  }],
  processed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Transcript = mongoose.models.Transcript || mongoose.model('Transcript', TranscriptSchema);

// Generate embeddings for transcript segments
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { videoId, transcript } = await request.json();

    if (!videoId || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: 'Missing videoId or transcript data' }, { status: 400 });
    }

    // Check if embeddings already exist
    const existing = await Transcript.findOne({ videoId });
    if (existing && existing.embeddings && existing.embeddings.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Embeddings already exist',
        videoId 
      });
    }

    const embeddings: Array<{
      text: string;
      vector: number[];
      start: number;
      duration: number;
    }> = [];

    // Process transcript in chunks for embedding generation
    for (let i = 0; i < transcript.length; i += 10) {
      const chunk = transcript.slice(i, i + 10);
      
      // Create text for embedding (combine multiple segments)
      const textToEmbed = chunk.map((segment: any) => segment.text).join(' ');
      
      try {
        // Generate embedding using Bedrock Titan
        const embeddingResponse = await bedrockClient.send(new InvokeModelCommand({
          modelId: 'amazon.titan-embed-text-v1',
          body: JSON.stringify({
            inputText: textToEmbed
          }),
          contentType: 'application/json'
        }));

        const embeddingResult = JSON.parse(new TextDecoder().decode(embeddingResponse.body));
        
        if (embeddingResult.embedding) {
          // Store embedding for each segment in the chunk
          chunk.forEach((segment: any) => {
            embeddings.push({
              text: segment.text,
              vector: embeddingResult.embedding,
              start: segment.start,
              duration: segment.duration
            });
          });
        }
      } catch (embeddingError) {
        console.error('Error generating embedding for chunk:', embeddingError);
        // Continue with other chunks even if one fails
      }
    }

    // Update transcript with embeddings
    await Transcript.findOneAndUpdate(
      { videoId },
      { 
        embeddings,
        processed: true,
        updatedAt: new Date()
      }
    );

    return NextResponse.json({ 
      success: true, 
      videoId,
      embeddingsCount: embeddings.length 
    });

  } catch (error) {
    console.error('Error generating embeddings:', error);
    return NextResponse.json({ 
      error: 'Failed to generate embeddings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Vector similarity search
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!videoId || !query) {
      return NextResponse.json({ error: 'Missing videoId or query parameter' }, { status: 400 });
    }

    // Get transcript with embeddings
    const transcript = await Transcript.findOne({ videoId });
    if (!transcript || !transcript.embeddings || transcript.embeddings.length === 0) {
      return NextResponse.json({ error: 'No embeddings found for this video' }, { status: 404 });
    }

    // Generate embedding for the query
    const queryEmbeddingResponse = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      body: JSON.stringify({
        inputText: query
      }),
      contentType: 'application/json'
    }));

    const queryEmbeddingResult = JSON.parse(new TextDecoder().decode(queryEmbeddingResponse.body));
    const queryVector = queryEmbeddingResult.embedding;

    if (!queryVector) {
      return NextResponse.json({ error: 'Failed to generate query embedding' }, { status: 500 });
    }

    // Calculate cosine similarity for each embedding
    const similarities = transcript.embeddings.map((embedding: any) => {
      const similarity = cosineSimilarity(queryVector, embedding.vector);
      return {
        ...embedding,
        similarity
      };
    });

    // Sort by similarity and return top results
    const results = similarities
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    return NextResponse.json({ 
      results,
      query,
      videoId
    });

  } catch (error) {
    console.error('Error in vector search:', error);
    return NextResponse.json({ 
      error: 'Failed to perform vector search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

