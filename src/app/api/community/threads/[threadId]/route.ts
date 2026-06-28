import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import { addThreadReply, pinThread } from '@/lib/db/community-repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const authUser = await requireAuth();
    requireAurora('Community threads');
    const { threadId } = await params;
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    const ok = await addThreadReply(threadId, {
      authorClerkId: authUser.id,
      authorName: authUser.email,
      content,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    await requireAuth();
    requireAurora('Community threads');
    const { threadId } = await params;

    const ok = await pinThread(threadId);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
