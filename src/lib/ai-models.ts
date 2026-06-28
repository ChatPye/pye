// AI Model Configuration for ChatPye
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string;
  maxTokens: number;
  costPerToken: number;
  tier: 'free' | 'pro';
}

export interface ModelResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  cost: number;
}

// Free Tier Models (Amazon Titan + Nova)
export const FREE_MODELS: AIModel[] = [
  {
    id: 'titan-embed',
    name: 'Amazon Titan Embeddings',
    provider: 'aws-bedrock',
    endpoint: 'amazon.titan-embed-text-v1',
    apiKey: process.env.AWS_ACCESS_KEY_ID || '',
    maxTokens: 8000,
    costPerToken: 0.0001,
    tier: 'free'
  },
  {
    id: 'nova-lite',
    name: 'Nova Lite',
    provider: 'nova',
    endpoint: 'https://api.nova.ai/v1/chat/completions',
    apiKey: process.env.NOVA_API_KEY || '',
    maxTokens: 4000,
    costPerToken: 0.0002,
    tier: 'free'
  }
];

// Pro Tier Models (Claude Haiku + Gemini)
export const PRO_MODELS: AIModel[] = [
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTokens: 200000,
    costPerToken: 0.00025,
    tier: 'pro'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    apiKey: process.env.GEMINI_API_KEY || '',
    maxTokens: 30000,
    costPerToken: 0.0005,
    tier: 'pro'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY || '',
    maxTokens: 8000,
    costPerToken: 0.03,
    tier: 'pro'
  }
];

// Model selection based on user plan
export function getModelsForPlan(plan: 'free' | 'pro'): AIModel[] {
  return plan === 'pro' ? PRO_MODELS : FREE_MODELS;
}

// Get primary model for plan
export function getPrimaryModel(plan: 'free' | 'pro'): AIModel {
  const models = getModelsForPlan(plan);
  return models[0]; // First model is primary
}

// Get fallback model for plan
export function getFallbackModel(plan: 'free' | 'pro'): AIModel {
  const models = getModelsForPlan(plan);
  return models[1] || models[0]; // Second model or first if only one
}

// Model selection logic
export function selectModel(plan: 'free' | 'pro', feature: string): AIModel {
  const models = getModelsForPlan(plan);
  
  // Feature-specific model selection
  switch (feature) {
    case 'chat':
      return models[0]; // Primary chat model
    case 'summarization':
      return models[0]; // Primary model for summaries
    case 'translation':
      return models[1] || models[0]; // Fallback model for translation
    case 'code-analysis':
      return plan === 'pro' ? 
        models.find(m => m.id === 'claude-haiku') || models[0] :
        models[0]; // Claude for code analysis if pro
    default:
      return models[0];
  }
}

// API call functions for each provider
export async function callTitanEmbeddings(text: string): Promise<number[]> {
  const response = await fetch('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.titan-embed-text-v1/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AWS_ACCESS_KEY_ID}`,
      'X-Amz-Target': 'com.amazonaws.bedrock.runtime.model.InvokeModel'
    },
    body: JSON.stringify({
      inputText: text
    })
  });
  
  if (!response.ok) {
    throw new Error(`Titan API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.embedding;
}

export async function callNovaLite(messages: any[]): Promise<ModelResponse> {
  const response = await fetch('https://api.nova.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NOVA_API_KEY}`
    },
    body: JSON.stringify({
      model: 'nova-lite',
      messages,
      max_tokens: 4000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`Nova API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: 'nova-lite',
    cost: data.usage.total_tokens * 0.0002
  };
}

export async function callClaudeHaiku(messages: any[]): Promise<ModelResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200000,
      messages
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: data.usage,
    model: 'claude-haiku',
    cost: data.usage.input_tokens * 0.00025 + data.usage.output_tokens * 0.00125
  };
}

export async function callGeminiPro(messages: any[]): Promise<ModelResponse> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: messages.map(msg => ({
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        maxOutputTokens: 30000,
        temperature: 0.7
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount
    },
    model: 'gemini-pro',
    cost: data.usageMetadata.totalTokenCount * 0.0005
  };
}

export async function callGPT4(messages: any[]): Promise<ModelResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
      max_tokens: 8000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`GPT-4 API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: 'gpt-4',
    cost: data.usage.prompt_tokens * 0.03 + data.usage.completion_tokens * 0.06
  };
}

// Main chat function that routes to appropriate model
export async function chatWithAI(
  messages: any[],
  userPlan: 'free' | 'pro',
  feature: string = 'chat'
): Promise<ModelResponse> {
  const model = selectModel(userPlan, feature);
  
  try {
    switch (model.provider) {
      case 'nova':
        return await callNovaLite(messages);
      case 'anthropic':
        return await callClaudeHaiku(messages);
      case 'google':
        return await callGeminiPro(messages);
      case 'openai':
        return await callGPT4(messages);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  } catch (error) {
    console.error(`Primary model failed: ${error}`);
    
    // Try fallback model
    const fallbackModel = getFallbackModel(userPlan);
    if (fallbackModel.id !== model.id) {
      try {
        switch (fallbackModel.provider) {
          case 'nova':
            return await callNovaLite(messages);
          case 'anthropic':
            return await callClaudeHaiku(messages);
          case 'google':
            return await callGeminiPro(messages);
          case 'openai':
            return await callGPT4(messages);
        }
      } catch (fallbackError) {
        console.error(`Fallback model also failed: ${fallbackError}`);
        throw new Error('All AI models are currently unavailable');
      }
    }
    
    throw error;
  }
}

// Embeddings function for vector search
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    return await callTitanEmbeddings(text);
  } catch (error) {
    console.error('Embeddings generation failed:', error);
    throw new Error('Failed to generate embeddings');
  }
}

// Model health check
export async function checkModelHealth(plan: 'free' | 'pro'): Promise<boolean> {
  try {
    const testMessages = [{ role: 'user', content: 'Hello' }];
    await chatWithAI(testMessages, plan, 'chat');
    return true;
  } catch (error) {
    console.error('Model health check failed:', error);
    return false;
  }
}

// Cost calculation
export function calculateCost(usage: any, model: AIModel): number {
  return usage.totalTokens * model.costPerToken;
}

// Usage tracking
export function trackModelUsage(response: ModelResponse, userPlan: 'free' | 'pro') {
  // Log usage for analytics and billing
  console.log(`Model: ${response.model}, Plan: ${userPlan}, Cost: $${response.cost.toFixed(4)}`);
  
  // In production, this would send to your analytics service
  // analytics.track('ai_model_usage', {
  //   model: response.model,
  //   plan: userPlan,
  //   tokens: response.usage.totalTokens,
  //   cost: response.cost
  // });
}
