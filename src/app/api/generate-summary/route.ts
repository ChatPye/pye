import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: 'Invalid transcript data' }, { status: 400 });
    }

    // Convert transcript to text
    const transcriptText = transcript
      .map((segment: any) => segment.text)
      .join(' ')
      .substring(0, 10000); // Limit to prevent token limits

    const prompt = `Please create a comprehensive summary of the following video transcript. 
    The summary should be well-structured, highlight key points, and be useful for someone who wants to understand the main concepts without watching the full video.

    Transcript:
    ${transcriptText}

    Please provide a summary that includes:
    1. Main topic and objectives
    2. Key concepts and ideas
    3. Important details and examples
    4. Actionable takeaways (if any)

    Format the response in clear, readable paragraphs.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      contentType: 'application/json'
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const summary = responseBody.content[0]?.text || 'Unable to generate summary';

    return NextResponse.json({ 
      summary,
      success: true 
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

