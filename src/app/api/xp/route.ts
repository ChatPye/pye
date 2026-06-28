import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAurora } from '@/lib/db/require-aurora';
import {
  XP_REWARDS,
  awardXp,
  getLeaderboard,
  getRecentXpActivity,
  getUserXp,
} from '@/lib/db/xp-repository';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('XP');

    const { searchParams } = new URL(request.url);
    const includeLeaderboard = searchParams.get('leaderboard') === 'true';
    const includeActivity = searchParams.get('activity') === 'true';

    const userXP = await getUserXp(authUser.id);
    const leaderboard = includeLeaderboard ? await getLeaderboard(20) : undefined;
    const activities = includeActivity
      ? await getRecentXpActivity(authUser.id, 20)
      : undefined;

    return NextResponse.json({
      success: true,
      xp: {
        totalXP: userXP.totalXP,
        level: userXP.level,
        currentLevelXP: userXP.currentLevelXP,
        nextLevelXP: userXP.nextLevelXP,
        badges: userXP.badges,
        achievements: userXP.achievements,
        streak: userXP.streak,
        lastActivity: userXP.lastActivity,
      },
      leaderboard,
      recentActivity: activities?.map((a) => ({
        action: a.action,
        xpEarned: a.xpEarned,
        videoId: a.externalVideoId,
        metadata: a.metadata,
        timestamp: a.createdAt,
      })),
      rewards: XP_REWARDS,
    });
  } catch (error) {
    console.error('XP retrieval error:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve XP data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireAurora('XP');

    const { action, metadata = {} } = await request.json();
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const xpEarned = await awardXp(authUser.id, action, metadata);
    if (xpEarned === 0) {
      return NextResponse.json({ error: 'Invalid action or no XP awarded' }, { status: 400 });
    }

    const userXP = await getUserXp(authUser.id);
    return NextResponse.json({
      success: true,
      xpEarned,
      newTotalXP: userXP.totalXP,
      level: userXP.level,
      currentLevelXP: userXP.currentLevelXP,
      nextLevelXP: userXP.nextLevelXP,
      badges: userXP.badges,
      streak: userXP.streak,
      message: `Earned ${xpEarned} XP!`,
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
  }
}
