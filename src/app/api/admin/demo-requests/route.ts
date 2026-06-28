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

// Demo request schema
const DemoRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  phone: { type: String },
  message: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'contacted', 'scheduled', 'completed'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DemoRequest = mongoose.models.DemoRequest || mongoose.model('DemoRequest', DemoRequestSchema);

// Configure for SSR deployment
export const dynamic = 'force-dynamic';

// Get all demo requests (with pagination)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get total count
    const total = await DemoRequest.countDocuments(query);
    
    // Get paginated results
    const requests = await DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch demo requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update demo request status
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }
    
    const validStatuses = ['pending', 'contacted', 'scheduled', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    const updatedRequest = await DemoRequest.findByIdAndUpdate(
      id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedRequest) {
      return NextResponse.json({ error: 'Demo request not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      request: updatedRequest
    });
    
  } catch (error) {
    console.error('Error updating demo request:', error);
    return NextResponse.json({ 
      error: 'Failed to update demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete demo request
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    
    const deletedRequest = await DemoRequest.findByIdAndDelete(id);
    
    if (!deletedRequest) {
      return NextResponse.json({ error: 'Demo request not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Demo request deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting demo request:', error);
    return NextResponse.json({ 
      error: 'Failed to delete demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
