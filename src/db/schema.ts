import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core"

// ─── Better Auth tables ───────────────────────────────────────────────────────
// These exact column names are required by Better Auth — don't rename them

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})

// ─── App tables ───────────────────────────────────────────────────────────────

export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
})

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  trainingSessionId: uuid("training_session_id").references(() => trainingSessions.id),
  exercise: text("exercise").notNull(),
  setNumber: integer("set_number"),
  durationS: integer("duration_s"),
  repCount: integer("rep_count"),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
  avgScore: numeric("avg_score", { precision: 4, scale: 1 }),
  peakScore: numeric("peak_score", { precision: 4, scale: 1 }),
  primaryAngleAvg: numeric("primary_angle_avg", { precision: 5, scale: 1 }),
  primaryAngleMin: numeric("primary_angle_min", { precision: 5, scale: 1 }),
  secondaryAngleAvg: numeric("secondary_angle_avg", { precision: 5, scale: 1 }),
  feedback: jsonb("feedback"),
  videoUrl: text("video_url"),
  pointCloudUrl: text("point_cloud_url"),
  createdAt: timestamp("created_at").defaultNow(),
})
