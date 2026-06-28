import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// DocumentDB connection check
const checkDatabase = async () => {
  try {
    if (mongoose.connections[0].readyState === 1) {
      return { status: 'connected', message: 'Database connected' };
    } else if (process.env.NODE_ENV === 'development') {
      return { status: 'development', message: 'Using in-memory storage' };
    } else {
      await mongoose.connect(
        process.env.MONGODB_URI || process.env.DOCUMENTDB_URI || 'mongodb://localhost:27017/chatpye'
      );
      return { status: 'connected', message: 'Database connected' };
    }
  } catch (error) {
    return { status: 'error', message: `Database error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

// Check environment variables
const checkEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    message: missing.length === 0 ? 'All required environment variables present' : `Missing: ${missing.join(', ')}`,
    missing
  };
};

// Check API endpoints
const checkAPIs = async () => {
  const endpoints = [
    '/api/user-class',
    '/api/credits',
    '/api/xp',
    '/api/notes',
    '/api/bookmarks',
    '/api/watch-history',
    '/api/referrals',
    '/api/chat',
    '/api/video/process'
  ];
  
  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        return {
          endpoint,
          status: response.status,
          healthy: response.status !== 500
        };
      } catch (error) {
        return {
          endpoint,
          status: 'error',
          healthy: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );
  
  const healthy = results.filter(result => 
    result.status === 'fulfilled' && result.value.healthy
  ).length;
  
  return {
    status: healthy === endpoints.length ? 'ok' : 'warning',
    message: `${healthy}/${endpoints.length} API endpoints healthy`,
    endpoints: results.map(result => 
      result.status === 'fulfilled' ? result.value : { endpoint: 'unknown', status: 'error', healthy: false }
    )
  };
};

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Run all health checks
    const [database, environment, apis] = await Promise.all([
      checkDatabase(),
      checkEnvironment(),
      checkAPIs()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    // Determine overall system health
    const overallStatus = 
      database.status === 'error' || environment.status === 'error' ? 'error' :
      database.status === 'warning' || environment.status === 'warning' || apis.status === 'warning' ? 'warning' :
      'healthy';
    
    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database,
        environment,
        apis
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'error' ? 503 : 200;
    
    return NextResponse.json(healthReport, { status: httpStatus });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    );
  }
}

