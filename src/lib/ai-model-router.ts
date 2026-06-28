import { getUserByClerkId } from './database';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// AI Model Configuration
export const AI_MODELS = {
  // Free tier models (cheaper)
  FREE: {
    model: 'amazon.nova-lite-v1:0',
    provider: 'bedrock',
    costPerToken: 0.0001, // $0.10 per 1K tokens
    maxTokens: 4000,
    tier: 'free'
  },
  
  // Pro tier models (better quality)
  PRO: {
    model: 'anthropic.claude-3-haiku-20240307-v1:0',
    provider: 'bedrock',
    costPerToken: 0.0005, // $0.50 per 1K tokens
    maxTokens: 8000,
    tier: 'pro'
  },
  
  // Enterprise tier models (best quality)
  ENTERPRISE: {
    model: 'anthropic.claude-3-sonnet-20240229-v1:0',
    provider: 'bedrock',
    costPerToken: 0.003, // $3.00 per 1K tokens
    maxTokens: 12000,
    tier: 'enterprise'
  }
};

// Model selection logic
export async function selectAIModel(userId: string, messageLength: number = 0): Promise<{
  model: string;
  provider: string;
  costPerToken: number;
  maxTokens: number;
  tier: string;
  reason: string;
}> {
  try {
    // Get user data
    const user = await getUserByClerkId(userId);
    
    if (!user) {
      // Default to free tier for unknown users
      return {
        ...AI_MODELS.FREE,
        reason: 'Unknown user, defaulting to free tier'
      };
    }

    // Check user subscription tier
    const subscriptionTier = user.subscription.tier;
    const isActive = user.subscription.status === 'active';
    
    // Check token balance
    const tokenBalance = user.tokens.current;
    const tokenLimit = user.tokens.totalAllocated;
    
    // Check if user has enough tokens for the request
    const estimatedCost = estimateTokenCost(messageLength);
    
    // Smart routing logic
    if (subscriptionTier === 'enterprise' && isActive) {
      // Enterprise users get Claude Sonnet
      return {
        ...AI_MODELS.ENTERPRISE,
        reason: 'Enterprise subscription active'
      };
    }
    
    if (subscriptionTier === 'pro' && isActive) {
      // Pro users get Claude Haiku
      return {
        ...AI_MODELS.PRO,
        reason: 'Pro subscription active'
      };
    }
    
    // Free tier users
    if (tokenBalance >= estimatedCost) {
      // Check if user has been active (encourage engagement)
      const daysSinceLastActive = Math.floor(
        (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActive <= 7) {
        // Active free users get NovaLite
        return {
          ...AI_MODELS.FREE,
          reason: 'Active free user, using NovaLite'
        };
      } else {
        // Inactive free users get NovaLite (cheaper)
        return {
          ...AI_MODELS.FREE,
          reason: 'Inactive free user, using NovaLite'
        };
      }
    } else {
      // Insufficient tokens - use cheapest model
      return {
        ...AI_MODELS.FREE,
        reason: 'Insufficient tokens, using NovaLite'
      };
    }
    
  } catch (error) {
    console.error('Error selecting AI model:', error);
    // Fallback to free tier
    return {
      ...AI_MODELS.FREE,
      reason: 'Error occurred, defaulting to free tier'
    };
  }
}

// Estimate token cost for a message
export function estimateTokenCost(messageLength: number): number {
  // Rough estimation: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(messageLength / 4);
  
  // Add buffer for response (assume 2x input length)
  const totalTokens = estimatedTokens * 3;
  
  // Use free tier cost for estimation
  return totalTokens * AI_MODELS.FREE.costPerToken;
}

// Get model information for display
export function getModelInfo(tier: string) {
  switch (tier) {
    case 'free':
      return {
        name: 'NovaLite',
        description: 'Fast and efficient AI model',
        features: ['Quick responses', 'Cost-effective', 'Good for basic tasks']
      };
    case 'pro':
      return {
        name: 'Claude Haiku',
        description: 'Advanced AI model with better reasoning',
        features: ['Better reasoning', 'Longer responses', 'Enhanced accuracy']
      };
    case 'enterprise':
      return {
        name: 'Claude Sonnet',
        description: 'Premium AI model with best performance',
        features: ['Best reasoning', 'Longest responses', 'Highest accuracy']
      };
    default:
      return {
        name: 'NovaLite',
        description: 'Default AI model',
        features: ['Reliable', 'Fast', 'Cost-effective']
      };
  }
}

// Check if user can upgrade model
export async function canUpgradeModel(userId: string): Promise<{
  canUpgrade: boolean;
  currentTier: string;
  suggestedTier: string;
  reason: string;
}> {
  try {
    const user = await getUserByClerkId(userId);
    
    if (!user) {
      return {
        canUpgrade: false,
        currentTier: 'free',
        suggestedTier: 'pro',
        reason: 'User not found'
      };
    }
    
    const currentTier = user.subscription.tier;
    const isActive = user.subscription.status === 'active';
    
    if (currentTier === 'free' && !isActive) {
      return {
        canUpgrade: true,
        currentTier: 'free',
        suggestedTier: 'pro',
        reason: 'Upgrade to Pro for better AI model'
      };
    }
    
    if (currentTier === 'pro' && !isActive) {
      return {
        canUpgrade: true,
        currentTier: 'pro',
        suggestedTier: 'enterprise',
        reason: 'Upgrade to Enterprise for best AI model'
      };
    }
    
    return {
      canUpgrade: false,
      currentTier: currentTier,
      suggestedTier: currentTier,
      reason: 'Already on highest tier'
    };
    
  } catch (error) {
    console.error('Error checking upgrade eligibility:', error);
    return {
      canUpgrade: false,
      currentTier: 'free',
      suggestedTier: 'pro',
      reason: 'Error occurred'
    };
  }
}

// Track model usage for analytics
export async function trackModelUsage(
  userId: string,
  model: string,
  tokensUsed: number,
  cost: number
): Promise<void> {
  try {
    // This would integrate with your analytics system
    console.log(`Model usage tracked: ${userId} used ${model}, ${tokensUsed} tokens, $${cost}`);
    
    // You could send this to CloudWatch, analytics service, etc.
    // await sendToAnalytics({
    //   userId,
    //   model,
    //   tokensUsed,
    //   cost,
    //   timestamp: new Date()
    // });
    
  } catch (error) {
    console.error('Error tracking model usage:', error);
  }
}

// AWS Bedrock client for Titan embeddings
const getBedrockClient = () => {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1' 
  });
};

// AWS Titan embeddings
export async function getTitanEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const bedrock = getBedrockClient();
    const body = JSON.stringify({
      inputText: texts.join('\n\n'),
    });
    
    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_EMBEDDINGS_MODEL_ID || 'amazon.titan-embed-text-v2:0',
      body: body,
      contentType: 'application/json',
    });
    
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return [responseBody.embedding];
  } catch (error) {
    console.error('Error getting Titan embeddings:', error);
    throw error;
  }
}
