import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface ChatProvider {
  generate(params: {
    system?: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;

  generateStream(params: {
    system?: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;
}

class BedrockClaudeProvider implements ChatProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(modelId?: string) {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
    this.modelId = modelId || process.env.BEDROCK_CLAUDE_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  async generate({ system, messages, maxTokens = 500, temperature = 0.7 }: {
    system?: string; messages: ChatMessage[]; maxTokens?: number; temperature?: number;
  }): Promise<string> {
    // Convert to Anthropic messages format
    const userAndAssistantMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content }] }));

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      system,
      messages: userAndAssistantMessages,
      max_tokens: maxTokens,
      temperature,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await this.client.send(command);
    const json = JSON.parse(new TextDecoder().decode(response.body));
    const text = json?.content?.[0]?.text ?? '';
    return text;
  }

  async *generateStream(params: {
    system?: string;
    messages: ChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string> {
    // For simplicity, call generate() and chunk the text. Replace with true streaming later.
    const full = await this.generate(params);
    const chunkSize = 80;
    for (let i = 0; i < full.length; i += chunkSize) {
      yield full.slice(i, i + chunkSize);
      // Small delay to simulate streaming feel
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

// NovaLite Provider for free tier users
class BedrockNovaLiteProvider implements ChatProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
    this.modelId = 'amazon.nova-lite-v1:0';
  }

  async generate({ system, messages, maxTokens = 500, temperature = 0.7 }: {
    system?: string; messages: ChatMessage[]; maxTokens?: number; temperature?: number;
  }): Promise<string> {
    // Convert to Amazon messages format
    const userAndAssistantMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content }] }));

    const body = JSON.stringify({
      messages: userAndAssistantMessages,
      system: system,
      max_tokens: maxTokens,
      temperature,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body,
      contentType: 'application/json',
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.output?.message?.content?.[0]?.text || 'No response generated';
  }

  async *generateStream({ system, messages, maxTokens = 500, temperature = 0.7 }: {
    system?: string; messages: ChatMessage[]; maxTokens?: number; temperature?: number;
  }): AsyncIterable<string> {
    // For now, generate full response and stream it
    const fullResponse = await this.generate({ system, messages, maxTokens, temperature });
    
    // Split into words and stream them
    const words = fullResponse.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
    }
  }
}

export function getChatProvider(modelId?: string): ChatProvider {
  if (modelId) {
    if (modelId.includes('nova-lite')) {
      return new BedrockNovaLiteProvider();
    } else {
      return new BedrockClaudeProvider(modelId);
    }
  }
  
  const provider = (process.env.AI_PROVIDER || 'bedrock-claude').toLowerCase();
  switch (provider) {
    case 'bedrock-claude':
    default:
      return new BedrockClaudeProvider();
  }
}


