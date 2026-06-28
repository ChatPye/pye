import { desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, schema } from '@/lib/db';

export const XP_REWARDS: Record<string, number> = {
  video_watched: 10,
  question_asked: 5,
  note_created: 15,
  bookmark_created: 8,
  referral: 100,
  daily_login: 5,
  weekly_streak: 50,
  first_video: 25,
  first_note: 20,
  first_share: 15,
  extension_install: 30,
  upgrade_pro: 75,
  quiz_completed: 30,
  flashcard_session: 20,
};

function calculateLevel(totalXP: number) {
  const baseXP = 100;
  const level = Math.floor(Math.sqrt(totalXP / baseXP)) + 1;
  const currentLevelXP = totalXP - Math.pow(level - 1, 2) * baseXP;
  const nextLevelXP = Math.pow(level, 2) * baseXP - totalXP;
  return { level, currentLevelXP, nextLevelXP };
}

export type UserXpRow = {
  clerkUserId: string;
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  badges: string[];
  achievements: string[];
  streak: number;
  lastActivity: Date;
};

export async function getUserXp(clerkUserId: string): Promise<UserXpRow> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.userXp)
    .where(eq(schema.userXp.clerkUserId, clerkUserId))
    .limit(1);

  if (row) {
    return {
      clerkUserId: row.clerkUserId,
      totalXP: row.totalXp,
      level: row.level,
      currentLevelXP: row.currentLevelXp,
      nextLevelXP: row.nextLevelXp,
      badges: row.badges ?? [],
      achievements: row.achievements ?? [],
      streak: row.streak,
      lastActivity: row.lastActivity,
    };
  }

  const [created] = await db
    .insert(schema.userXp)
    .values({ clerkUserId })
    .returning();

  return {
    clerkUserId: created.clerkUserId,
    totalXP: created.totalXp,
    level: created.level,
    currentLevelXP: created.currentLevelXp,
    nextLevelXP: created.nextLevelXp,
    badges: created.badges ?? [],
    achievements: created.achievements ?? [],
    streak: created.streak,
    lastActivity: created.lastActivity,
  };
}

export async function awardXp(
  clerkUserId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const xpReward = XP_REWARDS[action] ?? 0;
  if (xpReward === 0) return 0;

  const user = await getUserXp(clerkUserId);
  const now = new Date();
  const lastActivity = new Date(user.lastActivity);
  const daysSince = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  let bonusXP = 0;
  let streak = user.streak;
  if (daysSince === 1) {
    streak += 1;
    if (streak % 7 === 0) bonusXP = XP_REWARDS.weekly_streak;
  } else if (daysSince > 1) {
    streak = 1;
  }

  const totalXP = user.totalXP + xpReward + bonusXP;
  const levelData = calculateLevel(totalXP);
  const db = getDb();

  await db
    .update(schema.userXp)
    .set({
      totalXp: totalXP,
      level: levelData.level,
      currentLevelXp: levelData.currentLevelXP,
      nextLevelXp: levelData.nextLevelXP,
      streak,
      lastActivity: now,
      updatedAt: now,
    })
    .where(eq(schema.userXp.clerkUserId, clerkUserId));

  await db.insert(schema.xpActivities).values({
    clerkUserId,
    action,
    xpEarned: xpReward + bonusXP,
    externalVideoId:
      typeof metadata.videoId === 'string' ? metadata.videoId : null,
    metadata: { ...metadata, bonusXP, streak },
  });

  return xpReward + bonusXP;
}

export async function getLeaderboard(limit = 10) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userXp)
    .orderBy(desc(schema.userXp.totalXp))
    .limit(limit);
  return rows.map((r) => ({
    userId: r.clerkUserId,
    totalXP: r.totalXp,
    level: r.level,
    badges: r.badges ?? [],
    streak: r.streak,
  }));
}

export async function getRecentXpActivity(clerkUserId: string, limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(schema.xpActivities)
    .where(eq(schema.xpActivities.clerkUserId, clerkUserId))
    .orderBy(desc(schema.xpActivities.createdAt))
    .limit(limit);
}
