import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "employee",
  "manager",
  "hr",
  "admin",
  "trainer",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  competencyIds: jsonb("competency_ids").$type<string[]>().default([]),
  published: boolean("published").default(false).notNull(),
  providerName: varchar("provider_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 255 }).notNull().unique(),
  orgId: uuid("org_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  ownerClerkId: varchar("owner_clerk_id", { length: 255 }),
  courseId: uuid("course_id").references(() => courses.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 255 }),
  source: varchar("source", { length: 20 }).notNull().default("upload"),
  s3Key: text("s3_key"),
  videoUrl: text("video_url"),
  youtubeVideoId: varchar("youtube_video_id", { length: 20 }),
  status: videoStatusEnum("status").notNull().default("uploading"),
  processingStatus: varchar("processing_status", { length: 30 }).notNull().default("queued"),
  durationSeconds: integer("duration_seconds").default(0),
  thumbnailUrl: text("thumbnail_url"),
  transcriptRef: text("transcript_ref"),
  transcript: jsonb("transcript").$type<
    Array<{ text: string; start: number; duration: number }>
  >().default([]),
  embeddings: jsonb("embeddings").$type<
    Array<{ text: string; start: number; duration: number; embedding?: number[]; vector?: number[] }>
  >().default([]),
  chapters: jsonb("chapters").$type<
    Array<{ start: number; title: string; summary?: string }>
  >().default([]),
  summary: text("summary"),
  keyPoints: jsonb("key_points").$type<string[]>().default([]),
  errorMessage: text("error_message"),
  statusHistory: jsonb("status_history").$type<
    Array<{ status: string; updatedAt: string }>
  >().default([]),
  accessCount: integer("access_count").notNull().default(0),
  lastAccessed: timestamp("last_accessed"),
  processedAt: timestamp("processed_at"),
  publishedLabel: varchar("published_label", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoNotes = pgTable("video_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerClerkId: varchar("owner_clerk_id", { length: 255 }).notNull(),
  externalVideoId: varchar("external_video_id", { length: 255 }).notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videoSegments = pgTable("video_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  text: text("text").notNull(),
  label: varchar("label", { length: 255 }),
  embedding: jsonb("embedding").$type<number[]>(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  timestampRefs: jsonb("timestamp_refs").$type<
    { startMs: number; endMs: number; label?: string }[]
  >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competencies = pgTable("competencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  frameworkId: uuid("framework_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 50 }).default("foundational"),
  prerequisiteIds: jsonb("prerequisite_ids").$type<string[]>().default([]),
});

export const assertions = pgTable("assertions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  competencyId: uuid("competency_id")
    .references(() => competencies.id)
    .notNull(),
  level: integer("level").notNull().default(1),
  evidence: jsonb("evidence").$type<string[]>().default([]),
  issuer: varchar("issuer", { length: 50 }).notNull().default("system"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  courseId: uuid("course_id").references(() => courses.id),
  title: varchar("title", { length: 500 }).notNull(),
  publicSlug: varchar("public_slug", { length: 100 }).notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const learningEvents = pgTable("learning_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  ownerClerkId: varchar("owner_clerk_id", { length: 255 }),
  videoId: uuid("video_id").references(() => videos.id),
  courseId: uuid("course_id").references(() => courses.id),
  type: varchar("type", { length: 50 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseModules = pgTable("course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  videoId: uuid("video_id").references(() => videos.id),
});

export const courseEnrollments = pgTable("course_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  assigneeClerkId: varchar("assignee_clerk_id", { length: 255 }),
  assigneeEmail: varchar("assignee_email", { length: 255 }),
  assigneeName: varchar("assignee_name", { length: 255 }),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedByClerkId: varchar("assigned_by_clerk_id", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("assigned"),
  progressPercent: integer("progress_percent").notNull().default(0),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
