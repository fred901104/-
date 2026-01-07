import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Dashboard
  dashboard: router({
    overview: protectedProcedure.query(async () => {
      const db = await import("./db");
      const totalPoints = await db.getTotalPointsByType();
      const { getDb } = await import("./db");
      const dbInstance = await getDb();
      if (!dbInstance) return null;
      
      const { users, pointsRecords } = await import("../drizzle/schema");
      const { sql, gte } = await import("drizzle-orm");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayPoints = await dbInstance.select({
        total: sql<number>`COALESCE(SUM(${pointsRecords.amount}), 0)`
      }).from(pointsRecords)
        .where(gte(pointsRecords.createdAt, today));
      
      const activeUsers = await dbInstance.select({
        count: sql<number>`COUNT(DISTINCT ${users.id})`
      }).from(users);
      
      return {
        totalPoints,
        todayPoints: todayPoints[0]?.total || 0,
        activeUsers: activeUsers[0]?.count || 0,
      };
    }),
    
    trends: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      
      const { pointsRecords } = await import("../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      
      const trends = await db.select({
        date: sql<string>`DATE(created_at)`,
        genesis: sql<number>`SUM(CASE WHEN type = 'genesis' THEN amount ELSE 0 END)`,
        eco: sql<number>`SUM(CASE WHEN type = 'eco' THEN amount ELSE 0 END)`,
        trade: sql<number>`SUM(CASE WHEN type = 'trade' THEN amount ELSE 0 END)`,
      }).from(pointsRecords)
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at) DESC`)
        .limit(30);
      
      return trends.reverse();
    }),
    
    metrics: protectedProcedure.input(z.object({ phase: z.string() })).query(async ({ input }) => {
      // 返回模拟数据，实际应从 metrics_stats 表查询
      return {
        contributorsCount: 234,
        totalStreamHours: 1250.5,
        tippersCount: 89,
        totalTipAmount: 5420.50,
        postersCount: 156,
        totalPosts: 892,
        featuredPosts: 45,
        spotVolume: 2450000,
        spotFees: 2450,
        futuresVolume: 8900000,
        futuresFees: 8900,
        bugReports: 67,
        totalContributors: 1234,
      };
    }),
  }),
  
  // Tickets (P_Genesis)
  tickets: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { tickets, users } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      return db.select({
        ticket: tickets,
        user: users,
      }).from(tickets)
        .leftJoin(users, eq(tickets.userId, users.id))
        .orderBy(desc(tickets.createdAt));
    }),
    
    pending: protectedProcedure.query(async () => {
      const db = await import("./db");
      return db.getPendingTickets();
    }),
    
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await import("./db");
      return db.getTicketById(input.id);
    }),
    
    review: protectedProcedure.input(z.object({
      id: z.number(),
      priority: z.enum(["p0", "p1", "p2", "p3"]),
      finalScore: z.number(),
      status: z.enum(["approved", "rejected"]),
      reviewNote: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { getDb, createOperationLog } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { tickets, pointsRecords } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.update(tickets)
        .set({
          priority: input.priority,
          finalScore: input.finalScore,
          status: input.status,
          reviewNote: input.reviewNote,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(tickets.id, input.id));
      
      if (input.status === "approved") {
        const ticket = await db.select().from(tickets).where(eq(tickets.id, input.id)).limit(1);
        if (ticket[0]) {
          await db.insert(pointsRecords).values({
            userId: ticket[0].userId,
            type: "genesis",
            subType: ticket[0].type,
            amount: input.finalScore,
            description: `Ticket #${input.id} approved`,
            relatedId: input.id,
            status: "approved",
            approvedAt: new Date(),
            approvedBy: ctx.user.id,
          });
        }
      }
      
      await createOperationLog({
        operatorId: ctx.user.id,
        action: "review_ticket",
        targetType: "ticket",
        targetId: input.id,
        details: JSON.stringify(input),
      });
      
      return { success: true };
    }),
  }),
  
  // Live Streams (P_Eco)
  streams: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { liveStreams, users } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      return db.select({
        stream: liveStreams,
        streamer: users,
      }).from(liveStreams)
        .leftJoin(users, eq(liveStreams.streamerId, users.id))
        .orderBy(desc(liveStreams.createdAt));
    }),
    
    anomalous: protectedProcedure.query(async () => {
      const db = await import("./db");
      return db.getAnomalousStreams();
    }),
    
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await import("./db");
      return db.getStreamById(input.id);
    }),
  }),
  
  // Trade Records (P_Trade)
  trades: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { tradeRecords, users } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      return db.select({
        trade: tradeRecords,
        user: users,
      }).from(tradeRecords)
        .leftJoin(users, eq(tradeRecords.userId, users.id))
        .orderBy(desc(tradeRecords.createdAt));
    }),
    
    suspicious: protectedProcedure.query(async () => {
      const db = await import("./db");
      return db.getSuspiciousTrades();
    }),
    
    freeze: protectedProcedure.input(z.object({
      id: z.number(),
      reason: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const { getDb, createOperationLog } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { tradeRecords } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.update(tradeRecords)
        .set({
          status: "frozen",
          suspiciousReason: input.reason,
        })
        .where(eq(tradeRecords.id, input.id));
      
      await createOperationLog({
        operatorId: ctx.user.id,
        action: "freeze_trade",
        targetType: "trade",
        targetId: input.id,
        details: input.reason,
      });
      
      return { success: true };
    }),
  }),
  
  // Settlements
  settlements: router({
    latest: protectedProcedure.query(async () => {
      const { getLatestSettlement } = await import("./db");
      const result = await getLatestSettlement();
      return result || null;
    }),
    
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { settlements } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      
      return db.select().from(settlements).orderBy(desc(settlements.createdAt));
    }),
  }),
  
  // Core Identities
  identities: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { coreIdentities, users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      return db.select({
        identity: coreIdentities,
        user: users,
      }).from(coreIdentities)
        .leftJoin(users, eq(coreIdentities.userId, users.id));
    }),
    
    add: protectedProcedure.input(z.object({
      userId: z.number(),
      identityType: z.enum(["og", "core_streamer", "pro_trader"]),
      weeklyBonus: z.number(),
    })).mutation(async ({ input, ctx }) => {
      const { getDb, createOperationLog } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { coreIdentities } = await import("../drizzle/schema");
      
      await db.insert(coreIdentities).values({
        userId: input.userId,
        identityType: input.identityType,
        weeklyBonus: input.weeklyBonus,
        createdBy: ctx.user.id,
      });
      
      await createOperationLog({
        operatorId: ctx.user.id,
        action: "add_core_identity",
        targetType: "identity",
        targetId: input.userId,
        details: JSON.stringify(input),
      });
      
      return { success: true };
    }),
  }),
  
  // Users Management
  userManagement: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { users } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),
    
    pointsHistory: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      const db = await import("./db");
      return db.getUserPoints(input.userId);
    }),
  }),
  
  // Points Config
  pointsConfig: router({
    list: protectedProcedure.query(async () => {
      const db = await import("./db");
      return db.getAllPointsConfigs();
    }),
    
    active: protectedProcedure.query(async () => {
      const db = await import("./db");
      return db.getActivePointsConfig();
    }),
    
    create: protectedProcedure.input(z.object({
      phase: z.string(),
      phaseDescription: z.string(),
      totalTokens: z.string(),
      pointsPoolPercent: z.string(),
      phaseReleasePercent: z.string(),
      weekCount: z.number(),
      dynamicPoolPercent: z.string(),
      genesisPoolPercent: z.string(),
      pGenesisPercent: z.string(),
      pEcoPercent: z.string(),
      pTradePercent: z.string(),
      rulesConfig: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const db = await import("./db");
      return db.createPointsConfig({
        ...input,
        createdBy: ctx.user!.id,
      });
    }),
    
    setActive: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.setActiveConfig(input.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
