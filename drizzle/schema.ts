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
/**
 * 积分配置表 - 管理每个阶段的积分释放规则
 */
export const pointsConfigs = mysqlTable("points_configs", {
  id: int("id").autoincrement().primaryKey(),
  phase: varchar("phase", { length: 32 }).notNull(), // S0, S1, S2
  phaseDescription: text("phase_description"),
  totalTokens: varchar("total_tokens", { length: 64 }).notNull(), // 代币总量 (10B)
  pointsPoolPercent: varchar("points_pool_percent", { length: 16 }).notNull(), // 积分池占比 (10%)
  phaseReleasePercent: varchar("phase_release_percent", { length: 16 }).notNull(), // 该阶段释放占比 (2%)
  weekCount: int("week_count").notNull(), // 周期数 (12周)
  dynamicPoolPercent: varchar("dynamic_pool_percent", { length: 16 }).notNull(), // 动态池占比 (70%)
  genesisPoolPercent: varchar("genesis_pool_percent", { length: 16 }).notNull(), // 创世池占比 (30%)
  // 分池比例
  pGenesisPercent: varchar("p_genesis_percent", { length: 16 }).notNull(), // P_Genesis占比 (40%)
  pEcoPercent: varchar("p_eco_percent", { length: 16 }).notNull(), // P_Eco占比 (40%)
  pTradePercent: varchar("p_trade_percent", { length: 16 }).notNull(), // P_Trade占比 (20%)
  // 规则配置
  rulesConfig: text("rules_config"), // JSON格式存储详细规则
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PointsConfig = typeof pointsConfigs.$inferSelect;
export type InsertPointsConfig = typeof pointsConfigs.$inferInsert;

/**
 * 观众贡献数据表 - P_Eco观众端数据
 */
export const audienceContributions = mysqlTable("audience_contributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  date: timestamp("date").notNull(),
  // 打赏相关
  tipAmount: varchar("tip_amount", { length: 32 }).default("0"), // 打赏金额
  tipFee: varchar("tip_fee", { length: 32 }).default("0"), // 打赏手续费
  tipScore: varchar("tip_score", { length: 32 }).default("0"), // 打赏得分 (fee * 5)
  // 观看相关
  watchDuration: int("watch_duration").default(0), // 观看时长(分钟)
  validWatchDuration: int("valid_watch_duration").default(0), // 有效观看时长(最多4h)
  watchScore: varchar("watch_score", { length: 32 }).default("0"), // 观看得分 (hour * 1)
  // 聊天相关
  chatCount: int("chat_count").default(0), // 聊天条数
  validChatCount: int("valid_chat_count").default(0), // 有效聊天条数(5min内仅算1条)
  chatScore: varchar("chat_score", { length: 32 }).default("0"), // 聊天得分 (count * 0.2)
  // 精选内容相关
  featuredPostCount: int("featured_post_count").default(0), // 精选贴数量
  featuredPostScore: varchar("featured_post_score", { length: 32 }).default("0"), // 精选贴得分 (count * 5)
  // 总分
  totalScore: varchar("total_score", { length: 32 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AudienceContribution = typeof audienceContributions.$inferSelect;
export type InsertAudienceContribution = typeof audienceContributions.$inferInsert;

/**
 * 主播贡献数据表 - P_Eco主播端数据扩展
 */
export const creatorContributions = mysqlTable("creator_contributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  streamId: int("stream_id"), // 关联live_streams表
  date: timestamp("date").notNull(),
  // 直播时长相关
  streamDuration: int("stream_duration").default(0), // 直播时长(分钟)
  validStreamDuration: int("valid_stream_duration").default(0), // 有效直播时长(最少5人在线,最多8h)
  streamScore: varchar("stream_score", { length: 32 }).default("0"), // 直播得分 (hour * 5)
  // CCU相关
  avgCcu: int("avg_ccu").default(0), // 平均CCU
  ccuScore: varchar("ccu_score", { length: 32 }).default("0"), // CCU得分 (avgCCU * 3)
  ccuSampleCount: int("ccu_sample_count").default(0), // CCU采样次数
  ccuSamples: text("ccu_samples"), // CCU采样数据 JSON
  // 聊天相关
  chatCount: int("chat_count").default(0),
  validChatCount: int("valid_chat_count").default(0),
  chatScore: varchar("chat_score", { length: 32 }).default("0"), // count * 0.2
  // 打赏相关
  receivedTipFee: varchar("received_tip_fee", { length: 32 }).default("0"), // 收到打赏手续费
  tipScore: varchar("tip_score", { length: 32 }).default("0"), // fee * 1
  // 精选内容相关
  featuredPostCount: int("featured_post_count").default(0),
  featuredPostScore: varchar("featured_post_score", { length: 32 }).default("0"), // count * 5
  // 总分
  totalScore: varchar("total_score", { length: 32 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CreatorContribution = typeof creatorContributions.$inferSelect;
export type InsertCreatorContribution = typeof creatorContributions.$inferInsert;

/**
 * 核心指标统计表 - 用于Dashboard趋势展示
 */
export const metricsStats = mysqlTable("metrics_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  phase: varchar("phase", { length: 32 }).notNull(), // S0, S1, S2
  // 参与人数
  participantCount: int("participant_count").default(0), // 参与积分贡献人数
  cumulativeParticipantCount: int("cumulative_participant_count").default(0), // 累计参与人数
  // 直播相关
  streamDuration: int("stream_duration").default(0), // 直播时长(分钟)
  cumulativeStreamDuration: int("cumulative_stream_duration").default(0),
  // 打赏相关
  tipUserCount: int("tip_user_count").default(0), // 打赏人数
  tipAmount: varchar("tip_amount", { length: 32 }).default("0"), // 打赏金额
  cumulativeTipUserCount: int("cumulative_tip_user_count").default(0),
  cumulativeTipAmount: varchar("cumulative_tip_amount", { length: 32 }).default("0"),
  // 发帖相关
  postUserCount: int("post_user_count").default(0), // 发帖人数
  postCount: int("post_count").default(0), // 发帖数
  featuredPostCount: int("featured_post_count").default(0), // 精品贴数
  cumulativePostUserCount: int("cumulative_post_user_count").default(0),
  cumulativePostCount: int("cumulative_post_count").default(0),
  cumulativeFeaturedPostCount: int("cumulative_featured_post_count").default(0),
  // 交易相关
  spotVolume: varchar("spot_volume", { length: 32 }).default("0"), // 现货交易量
  spotFee: varchar("spot_fee", { length: 32 }).default("0"), // 现货手续费
  futuresVolume: varchar("futures_volume", { length: 32 }).default("0"), // 合约交易量
  futuresFee: varchar("futures_fee", { length: 32 }).default("0"), // 合约手续费
  cumulativeSpotVolume: varchar("cumulative_spot_volume", { length: 32 }).default("0"),
  cumulativeSpotFee: varchar("cumulative_spot_fee", { length: 32 }).default("0"),
  cumulativeFuturesVolume: varchar("cumulative_futures_volume", { length: 32 }).default("0"),
  cumulativeFuturesFee: varchar("cumulative_futures_fee", { length: 32 }).default("0"),
  // Bug提交
  bugCount: int("bug_count").default(0),
  cumulativeBugCount: int("cumulative_bug_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MetricsStat = typeof metricsStats.$inferSelect;
export type InsertMetricsStat = typeof metricsStats.$inferInsert;
