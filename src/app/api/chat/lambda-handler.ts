import { connectDocumentDB } from '@/server/db/documentdb';
import { VectorSearchService } from '@/services/vector-search';
import { LLMService } from '@/services/llm';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@/lib/logger';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Configure this properly in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Handle warmup
    if ((event as any).source === 'aws.events') {
        return { statusCode: 200, body: 'Warmup successful' };
    }

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        await connectDocumentDB();

        const body = JSON.parse(event.body || '{}');
        const { videoId, messages, question } = body;

        // Support both 'messages' (chat history) and 'question' (single query) formats
        const userQuery = question || (messages && messages.length > 0 ? messages[messages.length - 1].content : null);

        if (!videoId || !userQuery) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing videoId or question' }),
            };
        }

        logger.info('Processing chat request', { videoId, query: userQuery });

        // 1. Search for relevant context
        const searchResults = await VectorSearchService.searchTranscript(videoId, userQuery);

        // 2. Generate answer using LLM
        // Convert search results to context string
        const context = searchResults.map(r => r.text).join('\n\n');

        // Use LLMService to generate response
        // Note: LLMService.chat expects messages, so we construct a simple history if needed
        const chatMessages = messages || [{ role: 'user', content: userQuery }];

        // We might need to adjust LLMService to accept context explicitly or inject it into the system prompt
        // For now, let's assume we can append context to the last message or system prompt
        // But LLMService.chat signature is (messages, modelId).
        // Let's use a specialized method or construct the prompt here.

        const systemPrompt = `You are an AI tutor answering questions about a video.
Use the following context from the video transcript to answer the user's question.
If the answer is not in the context, say you don't know based on the video.

Context:
${context}
`;

        const response = await LLMService.chat([
            { role: 'system', content: systemPrompt },
            ...chatMessages
        ]);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                response: response,
                sources: searchResults.map(r => ({
                    text: r.text,
                    start: r.start,
                    score: r.score
                }))
            }),
        };

    } catch (error) {
        logger.error('Chat Lambda error', error instanceof Error ? error : new Error(String(error)));
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
