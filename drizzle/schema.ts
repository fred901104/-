import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 积分记录表 - 记录所有用户的积分变动
 */
export const pointsRecords = mysqlTable("points_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["genesis", "eco", "trade"]).notNull(),
  subType: varchar("sub_type", { length: 64 }),
  amount: int("amount").notNull(),
  description: text("description"),
  relatedId: int("related_id"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "frozen"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: int("approved_by"),
});

export type PointsRecord = typeof pointsRecords.$inferSelect;
export type InsertPointsRecord = typeof pointsRecords.$inferInsert;

/**
 * 工单表 - P_Genesis管理
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["bug", "suggestion", "info"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  priority: mysqlEnum("priority", ["p0", "p1", "p2", "p3"]),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  baseScore: int("base_score").default(0),
  finalScore: int("final_score").default(0),
  reviewNote: text("review_note"),
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * 直播数据表 - P_Eco管理
 */
export const liveStreams = mysqlTable("live_streams", {
  id: int("id").autoincrement().primaryKey(),
  streamerId: int("streamer_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: int("duration").default(0),
  avgCcu: int("avg_ccu").default(0),
  peakCcu: int("peak_ccu").default(0),
  interactionCount: int("interaction_count").default(0),
  validDuration: int("valid_duration").default(0),
  isAnomalous: int("is_anomalous").default(0),
  anomalyReason: text("anomaly_reason"),
  estimatedPoints: int("estimated_points").default(0),
  ccuSamples: text("ccu_samples"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LiveStream = typeof liveStreams.$inferSelect;
export type InsertLiveStream = typeof liveStreams.$inferInsert;

/**
 * 交易数据表 - P_Trade管理
 */
export const tradeRecords = mysqlTable("trade_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tradePair: varchar("trade_pair", { length: 64 }).notNull(),
  tradeType: mysqlEnum("trade_type", ["spot", "futures"]).notNull(),
  feeAmount: int("fee_amount").notNull(),
  holdingDuration: int("holding_duration").default(0),
  orderCount: int("order_count").default(1),
  volume: int("volume").default(0),
  isSuspicious: int("is_suspicious").default(0),
  suspiciousReason: text("suspicious_reason"),
  estimatedPoints: int("estimated_points").default(0),
  status: mysqlEnum("status", ["normal", "frozen", "reviewed"]).default("normal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TradeRecord = typeof tradeRecords.$inferSelect;
export type InsertTradeRecord = typeof tradeRecords.$inferInsert;

/**
 * 结算记录表
 */
export const settlements = mysqlTable("settlements", {
  id: int("id").autoincrement().primaryKey(),
  weekNumber: int("week_number").notNull(),
  year: int("year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalPoints: int("total_points").default(0),
  genesisPoints: int("genesis_points").default(0),
  ecoPoints: int("eco_points").default(0),
  tradePoints: int("trade_points").default(0),
  status: mysqlEnum("status", ["preview", "confirmed", "distributed"]).default("preview").notNull(),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;

/**
 * 核心身份白名单表
 */
export const coreIdentities = mysqlTable("core_identities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  identityType: mysqlEnum("identity_type", ["og", "core_streamer", "pro_trader"]).notNull(),
  autoDistribute: int("auto_distribute").default(1),
  weeklyBonus: int("weekly_bonus").default(0),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CoreIdentity = typeof coreIdentities.$inferSelect;
export type InsertCoreIdentity = typeof coreIdentities.$inferInsert;

/**
 * 操作日志表
 */
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  operatorId: int("operator_id").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("target_type", { length: 64 }),
  targetId: int("target_id"),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * 精选内容表
 */
export const featuredContents = mysqlTable("featured_contents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  contentType: mysqlEnum("content_type", ["post", "video", "stream"]).notNull(),
  contentId: varchar("content_id", { length: 128 }).notNull(),
  uvCount: int("uv_count").default(0),
  interactionCount: int("interaction_count").default(0),
  isFeatured: int("is_featured").default(0),
  featuredBy: int("featured_by"),
  featuredAt: timestamp("featured_at"),
  bonusMultiplier: int("bonus_multiplier").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FeaturedContent = typeof featuredContents.$inferSelect;
export type InsertFeaturedContent = typeof featuredContents.$inferInsert;