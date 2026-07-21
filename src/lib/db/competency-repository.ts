import { desc, eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';
import { invokeBedrockText } from '@/lib/bedrock-invoke';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { findLatestChatSession } from '@/lib/db/chat-history-repository';
import { extractGeminiText } from '@/lib/video/transcript';

export type LearnerCompetency = {
  id: string;
  name: string;
  level: string;
  progress: number;
  evidence: string[];
  sourceVideoId?: string;
  issuedAt: Date;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export async function getOrCreatePublicSlug(
  ownerClerkId: string,
  displayName?: string
): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.userPublicProfiles)
    .where(eq(schema.userPublicProfiles.ownerClerkId, ownerClerkId))
    .limit(1);

  if (existing) return existing.publicSlug;

  const base = slugify(displayName || ownerClerkId.slice(-8)) || 'learner';
  const slug = `${base}-${ownerClerkId.slice(-6)}`;

  await db.insert(schema.userPublicProfiles).values({
    ownerClerkId,
    publicSlug: slug,
    displayName: displayName ?? null,
  });

  return slug;
}

export async function listLearnerCompetencies(
  ownerClerkId: string
): Promise<LearnerCompetency[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.learnerCompetencies)
    .where(eq(schema.learnerCompetencies.ownerClerkId, ownerClerkId))
    .orderBy(desc(schema.learnerCompetencies.issuedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.competencyName,
    level: r.level,
    progress: r.progressPercent,
    evidence: r.evidence ?? [],
    sourceVideoId: r.sourceVideoId ?? undefined,
    issuedAt: r.issuedAt,
  }));
}

async function upsertCompetency(
  ownerClerkId: string,
  externalVideoId: string,
  item: { name: string; level: string; progress: number; evidence: string }
): Promise<LearnerCompetency> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.learnerCompetencies)
    .where(eq(schema.learnerCompetencies.ownerClerkId, ownerClerkId))
    .limit(100);

  const match = existing.find(
    (e) => e.competencyName === item.name && e.sourceVideoId === externalVideoId
  );

  if (match) {
    const progress = Math.max(match.progressPercent, item.progress);
    const [updated] = await db
      .update(schema.learnerCompetencies)
      .set({
        level: item.level,
        progressPercent: progress,
        evidence: [item.evidence],
        issuedAt: new Date(),
      })
      .where(eq(schema.learnerCompetencies.id, match.id))
      .returning();
    return {
      id: updated.id,
      name: updated.competencyName,
      level: updated.level,
      progress: updated.progressPercent,
      evidence: updated.evidence ?? [],
      sourceVideoId: updated.sourceVideoId ?? undefined,
      issuedAt: updated.issuedAt,
    };
  }

  const [inserted] = await db
    .insert(schema.learnerCompetencies)
    .values({
      ownerClerkId,
      competencyName: item.name,
      level: item.level,
      progressPercent: item.progress,
      evidence: [item.evidence],
      sourceVideoId: externalVideoId,
    })
    .returning();

  return {
    id: inserted.id,
    name: inserted.competencyName,
    level: inserted.level,
    progress: inserted.progressPercent,
    evidence: inserted.evidence ?? [],
    sourceVideoId: inserted.sourceVideoId ?? undefined,
    issuedAt: inserted.issuedAt,
  };
}

export async function analyzeVideoCompetencies(params: {
  ownerClerkId: string;
  externalVideoId: string;
  displayName?: string;
}): Promise<LearnerCompetency[]> {
  const record = await findVideoByExternalId(params.externalVideoId);
  if (!record || record.processingStatus !== 'complete') {
    return [];
  }

  const chat = await findLatestChatSession(params.ownerClerkId, params.externalVideoId);
  const chatSnippet = (chat?.messages ?? [])
    .slice(-8)
    .map((m) => `${m.type}: ${m.content.slice(0, 200)}`)
    .join('\n');

  const transcriptSample = (record.transcript ?? [])
    .slice(0, 30)
    .map((s) => s.text)
    .join(' ')
    .slice(0, 4000);

  const prompt = `Analyze this learner's video session and return JSON only:
{
  "competencies": [
    { "name": "Skill name", "level": "foundational|intermediate|proficient", "progress": 0-100, "evidence": "one sentence proof" }
  ]
}

Video title: ${record.title}
Summary: ${record.summary ?? ''}
Key points: ${(record.keyPoints ?? []).join('; ')}
Transcript sample: ${transcriptSample}
Chat activity: ${chatSnippet || 'none'}

Identify 2-4 competencies demonstrated. Be specific to the content.`;

  const raw = await invokeCompetencyModel(prompt);
  const parsed = parseAnalyzerJson(raw);
  if (!parsed.length) return [];

  const issued: LearnerCompetency[] = [];
  for (const item of parsed) {
    issued.push(await upsertCompetency(params.ownerClerkId, params.externalVideoId, item));
  }

  await getOrCreatePublicSlug(params.ownerClerkId, params.displayName);
  const db = getDb();
  await db
    .update(schema.userPublicProfiles)
    .set({
      headline: `Verified learning on ${record.title}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.userPublicProfiles.ownerClerkId, params.ownerClerkId));

  return issued;
}

/** Gemini is the default competency assessor. Bedrock remains an explicit fallback for existing AWS deployments. */
async function invokeCompetencyModel(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && process.env.COMPETENCY_PROVIDER !== 'bedrock') {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_VIDEO_MODEL || 'gemini-3.6-flash',
        input: [{ type: 'text', text: prompt }],
      }),
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    return extractGeminiText(await response.json() as Record<string, unknown>);
  }
  return invokeBedrockText(prompt, 'amazon.nova-lite-v1:0', 1500);
}

function parseAnalyzerJson(raw: string): Array<{
  name: string;
  level: string;
  progress: number;
  evidence: string;
}> {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}') + 1;
  if (start < 0 || end <= start) return [];
  try {
    const data = JSON.parse(raw.slice(start, end)) as {
      competencies?: Array<{
        name: string;
        level: string;
        progress: number;
        evidence: string;
      }>;
    };
    return (data.competencies ?? []).filter((c) => c.name && c.evidence);
  } catch {
    return [];
  }
}

export async function getPublicProfileBySlug(slug: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.userPublicProfiles)
    .where(eq(schema.userPublicProfiles.publicSlug, slug))
    .limit(1);

  if (!profile) return null;

  const competencies = await listLearnerCompetencies(profile.ownerClerkId);

  const [stats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.learningEvents)
    .where(eq(schema.learningEvents.ownerClerkId, profile.ownerClerkId));

  return {
    slug: profile.publicSlug,
    name: profile.displayName ?? 'Learner',
    title: profile.title ?? 'Professional',
    headline: profile.headline ?? `${competencies.length} verified competencies`,
    competencies: competencies.map((c) => ({
      name: c.name,
      level: c.level,
      evidence: c.evidence[0] ?? 'Demonstrated through video learning',
    })),
    certificates: [],
    stats: {
      coursesCompleted: 0,
      hoursLearned: competencies.length * 2,
      chatSessions: stats?.count ?? 0,
    },
  };
}
