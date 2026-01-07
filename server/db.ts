import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Points Records ============
export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { pointsRecords } = await import("../drizzle/schema");
  return db.select().from(pointsRecords).where(eq(pointsRecords.userId, userId));
}

export async function getTotalPointsByType() {
  const db = await getDb();
  if (!db) return { genesis: 0, eco: 0, trade: 0, total: 0 };
  const { pointsRecords } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  
  const result = await db.select({
    type: pointsRecords.type,
    total: sql<number>`SUM(${pointsRecords.amount})`
  }).from(pointsRecords)
    .where(eq(pointsRecords.status, "approved"))
    .groupBy(pointsRecords.type);
  
  const genesis = result.find(r => r.type === "genesis")?.total || 0;
  const eco = result.find(r => r.type === "eco")?.total || 0;
  const trade = result.find(r => r.type === "trade")?.total || 0;
  
  return { genesis, eco, trade, total: genesis + eco + trade };
}

// ============ Tickets ============
export async function getPendingTickets() {
  const db = await getDb();
  if (!db) return [];
  const { tickets } = await import("../drizzle/schema");
  return db.select().from(tickets).where(eq(tickets.status, "pending"));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { tickets } = await import("../drizzle/schema");
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result[0];
}

// ============ Live Streams ============
export async function getAnomalousStreams() {
  const db = await getDb();
  if (!db) return [];
  const { liveStreams } = await import("../drizzle/schema");
  return db.select().from(liveStreams).where(eq(liveStreams.isAnomalous, 1));
}

export async function getStreamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { liveStreams } = await import("../drizzle/schema");
  const result = await db.select().from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
  return result[0];
}

// ============ Trade Records ============
export async function getSuspiciousTrades() {
  const db = await getDb();
  if (!db) return [];
  const { tradeRecords } = await import("../drizzle/schema");
  return db.select().from(tradeRecords).where(eq(tradeRecords.isSuspicious, 1));
}

// ============ Settlements ============
export async function getLatestSettlement() {
  const db = await getDb();
  if (!db) return undefined;
  const { settlements } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  const result = await db.select().from(settlements).orderBy(desc(settlements.createdAt)).limit(1);
  return result[0];
}

// ============ Core Identities ============
export async function getCoreIdentities() {
  const db = await getDb();
  if (!db) return [];
  const { coreIdentities } = await import("../drizzle/schema");
  return db.select().from(coreIdentities);
}

// ============ Operation Logs ============
export async function createOperationLog(log: {
  operatorId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { operationLogs } = await import("../drizzle/schema");
  await db.insert(operationLogs).values(log);
}

// ==================== 积分配置管理 ====================
import { 
  pointsConfigs, InsertPointsConfig, PointsConfig,
  audienceContributions, InsertAudienceContribution,
  creatorContributions, InsertCreatorContribution,
  metricsStats, InsertMetricsStat,
  pointsRecords, tradeRecords, tickets, liveStreams
} from "../drizzle/schema";

export async function getAllPointsConfigs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pointsConfigs).orderBy(desc(pointsConfigs.createdAt));
}

export async function getActivePointsConfig() {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(pointsConfigs).where(eq(pointsConfigs.isActive, 1)).limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function createPointsConfig(config: InsertPointsConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pointsConfigs).values(config);
  return result;
}

export async function updatePointsConfig(id: number, updates: Partial<InsertPointsConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(pointsConfigs).set(updates).where(eq(pointsConfigs.id, id));
}

export async function setActiveConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 先将所有配置设为非激活
  await db.update(pointsConfigs).set({ isActive: 0 });
  // 再激活指定配置
  return await db.update(pointsConfigs).set({ isActive: 1 }).where(eq(pointsConfigs.id, id));
}

// ==================== 核心指标统计 ====================
export async function getMetricsStatsByDateRange(startDate: Date, endDate: Date, phase?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (phase) {
    return await db.select().from(metricsStats)
      .where(and(
        gte(metricsStats.date, startDate),
        lte(metricsStats.date, endDate),
        eq(metricsStats.phase, phase)
      ))
      .orderBy(metricsStats.date);
  }
  
  return await db.select().from(metricsStats)
    .where(and(
      gte(metricsStats.date, startDate),
      lte(metricsStats.date, endDate)
    ))
    .orderBy(metricsStats.date);
}

export async function getLatestMetricsStat(phase?: string) {
  const db = await getDb();
  if (!db) return null;
  
  if (phase) {
    const results = await db.select().from(metricsStats)
      .where(eq(metricsStats.phase, phase))
      .orderBy(desc(metricsStats.date))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }
  
  const results = await db.select().from(metricsStats)
    .orderBy(desc(metricsStats.date))
    .limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function upsertMetricsStat(stat: InsertMetricsStat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 检查是否已存在该日期和阶段的记录
  const existing = await db.select().from(metricsStats)
    .where(and(
      eq(metricsStats.date, stat.date),
      eq(metricsStats.phase, stat.phase)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return await db.update(metricsStats)
      .set(stat)
      .where(eq(metricsStats.id, existing[0].id));
  } else {
    return await db.insert(metricsStats).values(stat);
  }
}

// ==================== 观众贡献数据 ====================
export async function getAudienceContributionsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(audienceContributions)
    .where(and(
      gte(audienceContributions.date, startDate),
      lte(audienceContributions.date, endDate)
    ))
    .orderBy(desc(audienceContributions.date));
}

export async function getAudienceContributionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(audienceContributions)
    .where(eq(audienceContributions.userId, userId))
    .orderBy(desc(audienceContributions.date));
}

export async function upsertAudienceContribution(contribution: InsertAudienceContribution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(audienceContributions)
    .where(and(
      eq(audienceContributions.userId, contribution.userId),
      eq(audienceContributions.date, contribution.date)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return await db.update(audienceContributions)
      .set(contribution)
      .where(eq(audienceContributions.id, existing[0].id));
  } else {
    return await db.insert(audienceContributions).values(contribution);
  }
}

// ==================== 主播贡献数据 ====================
export async function getCreatorContributionsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(creatorContributions)
    .where(and(
      gte(creatorContributions.date, startDate),
      lte(creatorContributions.date, endDate)
    ))
    .orderBy(desc(creatorContributions.date));
}

export async function getCreatorContributionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(creatorContributions)
    .where(eq(creatorContributions.userId, userId))
    .orderBy(desc(creatorContributions.date));
}

export async function upsertCreatorContribution(contribution: InsertCreatorContribution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(creatorContributions)
    .where(and(
      eq(creatorContributions.userId, contribution.userId),
      eq(creatorContributions.date, contribution.date)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return await db.update(creatorContributions)
      .set(contribution)
      .where(eq(creatorContributions.id, existing[0].id));
  } else {
    return await db.insert(creatorContributions).values(contribution);
  }
}

// ==================== 交易记录冻结管理 ====================
export async function getFrozenTradeRecords(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(tradeRecords)
    .where(eq(tradeRecords.status, "frozen"))
    .orderBy(desc(tradeRecords.createdAt))
    .limit(limit);
}

export async function freezeTradeRecord(id: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(tradeRecords)
    .set({ 
      status: "frozen",
      suspiciousReason: reason,
      isSuspicious: 1
    })
    .where(eq(tradeRecords.id, id));
}

export async function unfreezeTradeRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(tradeRecords)
    .set({ status: "reviewed" })
    .where(eq(tradeRecords.id, id));
}
