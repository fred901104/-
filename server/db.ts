import { eq } from "drizzle-orm";
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
