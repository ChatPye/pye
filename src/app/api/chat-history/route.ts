import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  deleteChatSession,
  getChatSession,
  upsertChatSession,
  type ChatMessage,
  type ChatSession,
} from '@/lib/db/chat-history-repository';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Chat history');

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const sessionId = searchParams.get('sessionId') || `session_${Date.now()}`;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const chatHistory = await getChatSession(authUser.id, videoId, sessionId);

    if (!chatHistory || !chatHistory.isActive) {
      return NextResponse.json({
        success: true,
        chatHistory: {
          videoId,
          messages: [],
          sessionId,
          isNew: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      chatHistory: {
        videoId: chatHistory.externalVideoId,
        sessionId: chatHistory.sessionId,
        messages: chatHistory.messages,
        videoMetadata: chatHistory.videoMetadata,
        lastActivity: chatHistory.lastActivity,
        isNew: false,
      },
    });
  } catch (error) {
    console.error('Chat history retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve chat history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Chat history');

    const { videoId, sessionId, messages, videoMetadata } = await request.json();

    if (!videoId || !sessionId || !messages) {
      return NextResponse.json(
        { error: 'Video ID, session ID, and messages are required' },
        { status: 400 }
      );
    }

    await upsertChatSession({
      clerkUserId: authUser.id,
      externalVideoId: videoId,
      sessionId,
      messages: messages as ChatMessage[],
      videoMetadata: videoMetadata || {},
      isActive: true,
      lastActivity: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat history save error:', error);
    return NextResponse.json({ error: 'Failed to save chat history' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Chat history');

    const { videoId, sessionId, message } = await request.json();
    if (!videoId || !sessionId || !message) {
      return NextResponse.json(
        { error: 'Video ID, session ID, and message are required' },
        { status: 400 }
      );
    }

    const fallback: ChatSession = {
      clerkUserId: authUser.id,
      externalVideoId: videoId,
      sessionId,
      messages: [],
      videoMetadata: {},
      isActive: true,
      lastActivity: new Date(),
    };
    const existing = (await getChatSession(authUser.id, videoId, sessionId)) || fallback;

    const messages = [...existing.messages, message as ChatMessage];
    await upsertChatSession({ ...existing, messages, lastActivity: new Date() });

    return NextResponse.json({ success: true, message: 'Message added to chat history' });
  } catch (error) {
    console.error('Chat history update error:', error);
    return NextResponse.json({ error: 'Failed to update chat history' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('Chat history');

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const sessionId = searchParams.get('sessionId') || undefined;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    await deleteChatSession(authUser.id, videoId, sessionId);
    return NextResponse.json({ success: true, message: 'Chat history deleted successfully' });
  } catch (error) {
    console.error('Chat history deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete chat history' }, { status: 500 });
  }
}
