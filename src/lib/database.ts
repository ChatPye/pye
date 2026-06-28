// DocumentDB/MongoDB database schema and utilities
import { MongoClient, Db, Collection } from 'mongodb';

// Database connection
let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME || 'chatpye');
  
  return db;
}

// Collection types
export interface User {
  _id?: string;
  clerkId: string;
  email: string;
  role: 'user' | 'admin' | 'beta_user';
  subscription: {
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  };
  tokens: {
    current: number;
    totalAllocated: number;
    lastRefill: Date;
    resetDate: Date;
  };
  xp: {
    total: number;
    level: number;
    nextLevelAt: number;
    tokensFromXP: number;
  };
  referral: {
    code: string;
    referredBy?: string;
    referrals: string[];
    totalRewards: number;
  };
  settings: {
    notifications: boolean;
    emailUpdates: boolean;
    betaFeatures: boolean;
  };
  utmAttribution?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
    firstTouch: Date;
    lastTouch: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface TokenTransaction {
  _id?: string;
  userId: string;
  type: 'usage' | 'refill' | 'bonus' | 'xp_reward' | 'referral' | 'subscription';
  amount: number; // negative for usage
  description: string;
  metadata?: {
    videoId?: string;
    endpoint?: string;
    action?: string;
    source?: string;
  };
  timestamp: Date;
}

export interface XPEvent {
  _id?: string;
  userId: string;
  eventType: 'first_note' | 'daily_login' | 'referral_signup' | 'referral_activation' | 'feedback_submission' | 'video_watched' | 'note_created' | 'subscription_upgrade';
  points: number;
  metadata?: {
    source?: string;
    videoId?: string;
    referredUserId?: string;
    tier?: string;
  };
  timestamp: Date;
}

export interface Note {
  _id?: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  content: string;
  timestamp: number; // Video timestamp in seconds
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchHistory {
  _id?: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoChannel: string;
  thumbnailUrl?: string;
  duration: number;
  watchedDuration: number;
  progress: number; // 0-1
  lastWatchedAt: Date;
  watchCount: number;
  notes: string[]; // Note IDs
}

export interface Referral {
  _id?: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  status: 'pending' | 'accepted' | 'activated';
  code: string;
  rewardAmount: number;
  createdAt: Date;
  acceptedAt?: Date;
  activatedAt?: Date;
}

export interface Promotion {
  _id?: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_tokens' | 'tier_upgrade';
  value: number;
  maxUses: number;
  usedCount: number;
  eligibleRoles: string[];
  eligibleTiers: string[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  createdBy: string; // Admin user ID
}

export interface SystemConfig {
  _id?: string;
  key: string;
  value: any;
  description: string;
  updatedAt: Date;
  updatedBy: string; // Admin user ID
}

export interface ExtensionDevice {
  _id?: string;
  userId: string;
  installId: string;
  userAgent: string;
  lastSeen: Date;
  isActive: boolean;
  tokenExpiresAt?: Date;
}

// Collection getters
export async function getUsersCollection(): Promise<Collection<User>> {
  const database = await connectToDatabase();
  return database.collection<User>('users');
}

export async function getTokenTransactionsCollection(): Promise<Collection<TokenTransaction>> {
  const database = await connectToDatabase();
  return database.collection<TokenTransaction>('tokenTransactions');
}

export async function getXPEventsCollection(): Promise<Collection<XPEvent>> {
  const database = await connectToDatabase();
  return database.collection<XPEvent>('xpEvents');
}

export async function getNotesCollection(): Promise<Collection<Note>> {
  const database = await connectToDatabase();
  return database.collection<Note>('notes');
}

export async function getWatchHistoryCollection(): Promise<Collection<WatchHistory>> {
  const database = await connectToDatabase();
  return database.collection<WatchHistory>('watchHistory');
}

export async function getReferralsCollection(): Promise<Collection<Referral>> {
  const database = await connectToDatabase();
  return database.collection<Referral>('referrals');
}

export async function getPromotionsCollection(): Promise<Collection<Promotion>> {
  const database = await connectToDatabase();
  return database.collection<Promotion>('promotions');
}

export async function getSystemConfigCollection(): Promise<Collection<SystemConfig>> {
  const database = await connectToDatabase();
  return database.collection<SystemConfig>('systemConfig');
}

export async function getExtensionDevicesCollection(): Promise<Collection<ExtensionDevice>> {
  const database = await connectToDatabase();
  return database.collection<ExtensionDevice>('extensionDevices');
}

// Database indexes
export async function createIndexes(): Promise<void> {
  const users = await getUsersCollection();
  const tokenTransactions = await getTokenTransactionsCollection();
  const xpEvents = await getXPEventsCollection();
  const notes = await getNotesCollection();
  const watchHistory = await getWatchHistoryCollection();
  const referrals = await getReferralsCollection();
  const promotions = await getPromotionsCollection();
  const systemConfig = await getSystemConfigCollection();
  const extensionDevices = await getExtensionDevicesCollection();

  // Users indexes
  await users.createIndex({ clerkId: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ 'referral.code': 1 }, { unique: true });
  await users.createIndex({ 'subscription.tier': 1 });
  await users.createIndex({ 'subscription.status': 1 });
  await users.createIndex({ createdAt: -1 });
  await users.createIndex({ lastActiveAt: -1 });

  // Token transactions indexes
  await tokenTransactions.createIndex({ userId: 1, timestamp: -1 });
  await tokenTransactions.createIndex({ type: 1, timestamp: -1 });
  await tokenTransactions.createIndex({ timestamp: -1 });

  // XP events indexes
  await xpEvents.createIndex({ userId: 1, timestamp: -1 });
  await xpEvents.createIndex({ eventType: 1, timestamp: -1 });
  await xpEvents.createIndex({ timestamp: -1 });

  // Notes indexes
  await notes.createIndex({ userId: 1, createdAt: -1 });
  await notes.createIndex({ videoId: 1 });
  await notes.createIndex({ userId: 1, videoId: 1 });
  await notes.createIndex({ tags: 1 });
  await notes.createIndex({ isPublic: 1, createdAt: -1 });

  // Watch history indexes
  await watchHistory.createIndex({ userId: 1, lastWatchedAt: -1 });
  await watchHistory.createIndex({ videoId: 1 });
  await watchHistory.createIndex({ userId: 1, videoId: 1 }, { unique: true });

  // Referrals indexes
  await referrals.createIndex({ inviterUserId: 1, createdAt: -1 });
  await referrals.createIndex({ inviteeEmail: 1 });
  await referrals.createIndex({ code: 1 }, { unique: true });
  await referrals.createIndex({ status: 1 });

  // Promotions indexes
  await promotions.createIndex({ code: 1 }, { unique: true });
  await promotions.createIndex({ isActive: 1, startDate: 1, endDate: 1 });
  await promotions.createIndex({ createdAt: -1 });

  // System config indexes
  await systemConfig.createIndex({ key: 1 }, { unique: true });

  // Extension devices indexes
  await extensionDevices.createIndex({ userId: 1, installId: 1 }, { unique: true });
  await extensionDevices.createIndex({ installId: 1 }, { unique: true });
  await extensionDevices.createIndex({ lastSeen: -1 });
}

// Utility functions
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const users = await getUsersCollection();
  return await users.findOne({ clerkId });
}

export async function createUser(userData: Partial<User>): Promise<User> {
  const users = await getUsersCollection();
  const now = new Date();
  
  const user: User = {
    clerkId: userData.clerkId!,
    email: userData.email!,
    role: userData.role || 'user',
    subscription: {
      tier: 'free',
      status: 'active',
      ...userData.subscription,
    },
    tokens: {
      current: 50, // Default free tokens
      totalAllocated: 50,
      lastRefill: now,
      resetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ...userData.tokens,
    },
    xp: {
      total: 0,
      level: 1,
      nextLevelAt: 100,
      tokensFromXP: 0,
      ...userData.xp,
    },
    referral: {
      code: generateReferralCode(),
      referrals: [],
      totalRewards: 0,
      ...userData.referral,
    },
    settings: {
      notifications: true,
      emailUpdates: true,
      betaFeatures: false,
      ...userData.settings,
    },
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...userData,
  };
  
  const result = await users.insertOne(user);
  return { ...user, _id: result.insertedId.toString() };
}

export function generateReferralCode(): string {
  return 'CHATPYE' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
