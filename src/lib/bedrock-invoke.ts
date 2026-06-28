import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AI_MODELS, selectAIModel } from '@/lib/ai-model-router';

const client = process.env.AWS_REGION
  ? new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
  : null;

export function isNovaModel(modelId: string): boolean {
  return modelId.includes('nova');
}

export function isClaudeModel(modelId: string): boolean {
  return modelId.includes('claude') || modelId.includes('anthropic');
}

export async function resolveChatModel(
  clerkUserId: string | undefined,
  promptLength: number
): Promise<string> {
  if (!clerkUserId) return AI_MODELS.FREE.model;
  try {
    const choice = await selectAIModel(clerkUserId, promptLength);
    return choice.model;
  } catch {
    return process.env.BEDROCK_CHAT_MODEL_ID || AI_MODELS.FREE.model;
  }
}

function buildRequestBody(modelId: string, prompt: string, maxTokens = 500) {
  if (isNovaModel(modelId)) {
    return JSON.stringify({
      schemaVersion: 'messages-v1',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxNewTokens: maxTokens, temperature: 0.4 },
    });
  }

  return JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
}

/** Non-streaming text generation (quiz, flashcards, analysis). */
export async function invokeBedrockText(
  prompt: string,
  modelId = process.env.BEDROCK_ANALYSIS_MODEL_ID || 'amazon.nova-lite-v1:0',
  maxTokens = 2000
): Promise<string> {
  if (!client) {
    return `[Dev mode] Response for: ${prompt.slice(0, 120)}…`;
  }

  const command = new InvokeModelCommand({
    modelId,
    body: buildRequestBody(modelId, prompt, maxTokens),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);
  const raw = JSON.parse(new TextDecoder().decode(response.body));

  if (isNovaModel(modelId)) {
    const blocks = raw.output?.message?.content ?? [];
    return blocks.map((b: { text?: string }) => b.text || '').join('').trim();
  }

  return raw.content?.[0]?.text?.trim() || '';
}

export function createBedrockStreamCommand(modelId: string, prompt: string) {
  return new InvokeModelWithResponseStreamCommand({
    modelId,
    body: buildRequestBody(modelId, prompt, 800),
    contentType: 'application/json',
    accept: 'application/json',
  });
}

/** Parse a chunk from Bedrock stream (Nova or Claude). */
export function parseStreamChunk(modelId: string, chunkJson: unknown): string {
  const chunk = chunkJson as Record<string, unknown>;
  if (isNovaModel(modelId)) {
    const delta = (chunk.contentBlockDelta as { delta?: { text?: string } })?.delta?.text;
    return delta || '';
  }
  const delta = (chunk as { delta?: { text?: string } }).delta?.text;
  return delta || '';
}

export { client as bedrockClient };
