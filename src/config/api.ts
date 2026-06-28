// API Configuration for production deployment
const config = {
  // API Gateway endpoints - Unified infrastructure
  api: {
    // Chat API via API Gateway
    chat: process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://jhrrwyvpzk.execute-api.us-east-1.amazonaws.com/prod/chat',
    
    // Demo Request API via API Gateway
    demoRequest: process.env.NEXT_PUBLIC_DEMO_API_URL || 'https://jhrrwyvpzk.execute-api.us-east-1.amazonaws.com/prod/demo-request',
    
    // Video Process API - This will be handled by the chat Lambda
    videoProcess: process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://jhrrwyvpzk.execute-api.us-east-1.amazonaws.com/prod/chat',

    // Video Metadata API - use chat Lambda GET
    videoMetadata: process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://jhrrwyvpzk.execute-api.us-east-1.amazonaws.com/prod/chat',
  },
  
  // Local API routes for development
  local: {
    chat: '/api/chat',
    demoRequest: '/api/demo-request',
    videoProcess: '/api/video/process',
    videoMetadata: '/api/video/metadata',
  },
  
  // Check if we should use local routes
  isDevelopment: process.env.NODE_ENV === 'development',
  useLocalRoutes: process.env.NEXT_PUBLIC_USE_LOCAL_API === 'true' || process.env.NODE_ENV === 'development',
  
  // Get the appropriate API endpoint
  getEndpoint: (endpoint: 'chat' | 'demoRequest' | 'videoProcess' | 'videoMetadata') => {
    // Use local routes in development or when explicitly requested
    if (config.useLocalRoutes) {
      return config.local[endpoint];
    }
    // Use Lambda Function URLs for production
    return config.api[endpoint];
  }
};

export default config;
