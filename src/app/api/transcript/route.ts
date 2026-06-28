import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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

// Transcript schema for DocumentDB
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

// Store transcript data
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { videoId, title, transcript, summary } = await request.json();

    if (!videoId || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const transcriptData = {
      videoId,
      title: title || 'Untitled Video',
      transcript,
      summary: summary || '',
      updatedAt: new Date()
    };

    // Upsert transcript data
    const result = await Transcript.findOneAndUpdate(
      { videoId },
      transcriptData,
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, videoId, transcript: result });
  } catch (error) {
    console.error('Error storing transcript:', error);
    return NextResponse.json({ error: 'Failed to store transcript' }, { status: 500 });
  }
}

// Get transcript data
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    const transcript = await Transcript.findOne({ videoId });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error retrieving transcript:', error);
    return NextResponse.json({ error: 'Failed to retrieve transcript' }, { status: 500 });
  }
}

