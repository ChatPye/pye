import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '@/lib/logger';

// Initialize Bedrock client
const bedrockClient = process.env.AWS_REGION ? new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1'
}) : null;

export class LLMService {

    /**
     * Generate a summary of the provided text using Claude 3 Haiku
     */
    static async summarize(text: string): Promise<string> {
        if (!bedrockClient) {
            console.warn('Bedrock client not available, returning mock summary');
            return `[MOCK SUMMARY] This is a simulated summary of the content starting with: ${text.substring(0, 50)}...`;
        }

        try {
            const prompt = `
Human: You are an expert summarizer. Please provide a concise and comprehensive summary of the following video transcript. Focus on the key points, main arguments, and any actionable takeaways.

Transcript:
${text}

Assistant: Here is the summary:`;

            const command = new InvokeModelCommand({
                modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                }),
                contentType: 'application/json'
            });

            const response = await bedrockClient.send(command);
            const result = JSON.parse(new TextDecoder().decode(response.body));

            return result.content[0].text;
        } catch (error) {
            logger.error('Error generating summary:', error as Error);
            throw error;
        }
    }

    /**
     * Generate a chat response based on context
     */
    static async chat(messages: any[], context?: string): Promise<string> {
        if (!bedrockClient) {
            return "I'm in development mode and can't access the LLM right now.";
        }

        try {
            const systemPrompt = context ? `You are a helpful assistant. Use the following context to answer the user's question:\n\n${context}` : "You are a helpful assistant.";

            const command = new InvokeModelCommand({
                modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    system: systemPrompt,
                    messages: messages
                }),
                contentType: 'application/json'
            });

            const response = await bedrockClient.send(command);
            const result = JSON.parse(new TextDecoder().decode(response.body));

            return result.content[0].text;
        } catch (error) {
            logger.error('Error generating chat response:', error as Error);
            throw error;
        }
    }
}
