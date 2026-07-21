import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { generateSummary } from '@/lib/bedrock-summary';
import { extractGeminiText } from '@/lib/video/transcript';

type MaterialType = 'study-guide' | 'transcript' | 'summary';

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildTranscript(
  segments: Array<{ text: string; start: number; duration: number }>
): string {
  return segments
    .map((s) => `[${formatTimestamp(s.start)}] ${s.text.trim()}`)
    .join('\n');
}

function buildStudyGuide(
  title: string,
  summary: string,
  keyPoints: string[],
  chapters: Array<{ start: number; title: string; summary?: string }>
): string {
  const lines = [`# Study Guide: ${title}`, '', '## Overview', summary, ''];

  if (keyPoints.length) {
    lines.push('## Key Takeaways');
    keyPoints.forEach((point) => lines.push(`- ${point}`));
    lines.push('');
  }

  if (chapters.length) {
    lines.push('## Chapters');
    chapters.forEach((ch) => {
      lines.push(`### ${formatTimestamp(ch.start)} — ${ch.title}`);
      if (ch.summary) lines.push(ch.summary);
      lines.push('');
    });
  }

  return lines.join('\n');
}

async function generateTranscriptSummary(transcript: Array<{ text: string; start: number; duration: number }>): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const generated = await generateSummary(transcript)
    return generated.summary
  }

  const context = transcript.slice(0, 180).map((segment) => `[${formatTimestamp(segment.start)}] ${segment.text}`).join('\n')
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash',
      input: [{ type: 'text', text: `Summarise this learning video in clear study notes. Use short headings and preserve useful [MM:SS] timestamps.\n\n${context}` }],
    }),
  })
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`)
  const text = extractGeminiText(await response.json() as Record<string, unknown>).trim()
  if (!text) throw new Error('Gemini returned an empty summary')
  return text
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id: videoId } = await params;
    const type = (request.nextUrl.searchParams.get('type') ||
      'summary') as MaterialType;

    if (!['study-guide', 'transcript', 'summary'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    const record = await findVideoByExternalId(videoId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (record.ownerId && record.ownerId !== authUser.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (record.processingStatus !== 'complete') {
      return NextResponse.json(
        { success: false, error: 'Video is still processing. Try again shortly.' },
        { status: 409 }
      );
    }

    const transcript = record.transcript ?? [];
    let content = '';

    if (type === 'transcript') {
      content = buildTranscript(transcript);
    } else if (type === 'summary') {
      content = record.summary || '';
      if (!content && transcript.length) content = await generateTranscriptSummary(transcript)
    } else {
      content = buildStudyGuide(
        record.title || 'Video',
        record.summary || '',
        record.keyPoints ?? [],
        record.chapters ?? []
      );
    }

    return NextResponse.json({ success: true, type, content });
  } catch (error) {
    console.error('Materials error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
