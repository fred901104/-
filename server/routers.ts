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
      
      const totalUsers = await dbInstance.select({
        count: sql<number>`COUNT(DISTINCT ${users.id})`
      }).from(users);
      
      // 累计参与人数：在积分记录表中有记录的唯一用户数
      const participantUsers = await dbInstance.select({
        count: sql<number>`COUNT(DISTINCT ${pointsRecords.userId})`
      }).from(pointsRecords);
      
      // 获取当前阶段的积分配置
      const { pointsConfigs, settlements } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      // 查询已结算发放的积分（status='distributed'）
      const settledPointsResult = await dbInstance.select({
        genesis: sql<number>`COALESCE(SUM(${settlements.genesisPoints}), 0)`,
        eco: sql<number>`COALESCE(SUM(${settlements.ecoPoints}), 0)`,
        trade: sql<number>`COALESCE(SUM(${settlements.tradePoints}), 0)`,
        total: sql<number>`COALESCE(SUM(${settlements.totalPoints}), 0)`
      }).from(settlements)
        .where(eq(settlements.status, 'distributed'));
      
      const settledPoints = {
        genesis: Number(settledPointsResult[0]?.genesis || 0),
        eco: Number(settledPointsResult[0]?.eco || 0),
        trade: Number(settledPointsResult[0]?.trade || 0),
        total: Number(settledPointsResult[0]?.total || 0)
      };
      
      const activeConfig = await dbInstance.select()
        .from(pointsConfigs)
        .where(eq(pointsConfigs.isActive, 1))
        .limit(1);
      
      let poolRatios = { genesis: 40, eco: 40, trade: 20 }; // 默认配置比例
      let targetPoints = { genesis: 0, eco: 0, trade: 0, total: 0 }; // 各池待释放积分（周期目标）
      
      if (activeConfig.length > 0) {
        const config = activeConfig[0];
        const weeklyTarget = config.weeklyPointsTarget;
        const totalBudget = config.totalBudget; // 阶段总预算
        
        // 计算各池的阶段总预算（待释放积分）
        const genesisTarget = totalBudget * (parseFloat(config.pGenesisPercent) / 100);
        const ecoTarget = totalBudget * (parseFloat(config.pEcoPercent) / 100);
        const tradeTarget = totalBudget * (parseFloat(config.pTradePercent) / 100);
        
        targetPoints = {
          genesis: genesisTarget,
          eco: ecoTarget,
          trade: tradeTarget,
          total: totalBudget
        };
        
        // 计算各池实际已产出积分占比
        poolRatios = {
          genesis: genesisTarget > 0 ? Math.min((totalPoints.genesis / genesisTarget) * 100, 100) : 0,
          eco: ecoTarget > 0 ? Math.min((totalPoints.eco / ecoTarget) * 100, 100) : 0,
          trade: tradeTarget > 0 ? Math.min((totalPoints.trade / tradeTarget) * 100, 100) : 0,
        };
      }
      
      return {
        totalPoints,
        settledPoints, // 各池已结算发放的积分
        targetPoints, // 各池待释放积分（周期目标）
        todayPoints: Number(todayPoints[0]?.total || 0),
        totalUsers: Number(totalUsers[0]?.count || 0),
        participantUsers: Number(participantUsers[0]?.count || 0),
        poolRatios, // 各池已产出积分占周期目标的百分比
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
      
      // 确保转换为数字类型
      return trends.reverse().map(t => ({
        date: t.date,
        genesis: Number(t.genesis || 0),
        eco: Number(t.eco || 0),
        trade: Number(t.trade || 0)
      }));
    }),
    
    metrics: protectedProcedure.input(z.object({ phase: z.string() })).query(async ({ input }) => {
      // 返回模拟数据，实际应从 metrics_stats 表查询
      return {
        activeUsers: 1856, // 平台活跃人数（登录平台的用户）
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
    
    distribute: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        actualPoints: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { settlements } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // 获取结算记录
        const settlement = await db.select().from(settlements).where(eq(settlements.id, input.id)).limit(1);
        if (!settlement || settlement.length === 0) {
          throw new Error("结算记录不存在");
        }
        
        if (settlement[0].status === "distributed") {
          throw new Error("该结算已经发放，不能重复操作");
        }
        
        // 更新结算状态为已发放
        const actualDistributionPoints = input.actualPoints || settlement[0].totalPoints || 0;
        await db.update(settlements)
          .set({ 
            status: "distributed",
            actualDistributionPoints,
            distributedAt: new Date(),
          })
          .where(eq(settlements.id, input.id));
        
        return { success: true };
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
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        role: z.enum(["all", "admin", "user"]).optional(),
        isBlacklisted: z.enum(["all", "0", "1"]).optional(),
        sortKey: z.enum(["spotTradingVolume", "futuresTradingVolume", "totalStreamingMinutes", "totalWatchingMinutes", "createdAt"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { users: [], total: 0 };
        const { users } = await import("../drizzle/schema");
        const { desc, like, eq, and, sql } = await import("drizzle-orm");
        
        const page = input?.page || 1;
        const pageSize = input?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const conditions = [];
        if (input?.search) {
          conditions.push(
            sql`(${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`})`
          );
        }
        if (input?.role && input.role !== "all") {
          conditions.push(eq(users.role, input.role));
        }
        if (input?.isBlacklisted && input.isBlacklisted !== "all") {
          conditions.push(eq(users.isBlacklisted, parseInt(input.isBlacklisted)));
        }
        
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        // 获取总数
        const totalResult = await db.select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(whereClause);
        const total = totalResult[0]?.count || 0;
        
        // 获取分页数据
        const { asc } = await import("drizzle-orm");
        
        // 构建排序
        let orderByClause;
        if (input?.sortKey && input?.sortDirection) {
          let sortField;
          switch (input.sortKey) {
            case "spotTradingVolume":
              sortField = users.spotTradingVolume;
              break;
            case "futuresTradingVolume":
              sortField = users.futuresTradingVolume;
              break;
            case "totalStreamingMinutes":
              sortField = users.totalStreamingMinutes;
              break;
            case "totalWatchingMinutes":
              sortField = users.totalWatchingMinutes;
              break;
            case "createdAt":
              sortField = users.createdAt;
              break;
            default:
              sortField = users.createdAt;
          }
          orderByClause = input.sortDirection === "asc" ? asc(sortField) : desc(sortField);
        } else {
          orderByClause = desc(users.createdAt);
        }
        
        const usersList = await db.select()
          .from(users)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(pageSize)
          .offset(offset);
        
        return { users: usersList, total };
      }),
    
    pointsHistory: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      const db = await import("./db");
      return db.getUserPoints(input.userId);
    }),
    
    adjustPoints: protectedProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number(),
        type: z.enum(["genesis", "eco", "trade"]),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { pointsRecords } = await import("../drizzle/schema");
        
        // 创建积分调整记录
        await db.insert(pointsRecords).values({
          userId: input.userId,
          type: input.type,
          subType: "manual_adjustment",
          amount: input.amount,
          description: input.reason,
          status: "approved",
          approvedBy: ctx.user!.id,
          approvedAt: new Date(),
        });
        
        return { success: true };
      }),
    
    blacklist: protectedProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await db.update(users)
          .set({
            isBlacklisted: 1,
            blacklistReason: input.reason,
            blacklistedAt: new Date(),
            blacklistedBy: ctx.user!.id,
          })
          .where(eq(users.id, input.userId));
        
        return { success: true };
      }),
    
    unblacklist: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await db.update(users)
          .set({
            isBlacklisted: 0,
            blacklistReason: null,
            blacklistedAt: null,
            blacklistedBy: null,
          })
          .where(eq(users.id, input.userId));
        
        return { success: true };
      }),
    
    blacklistBatch: protectedProcedure
      .input(z.object({
        userIds: z.array(z.number()),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { users } = await import("../drizzle/schema");
        const { inArray } = await import("drizzle-orm");
        
        await db.update(users)
          .set({
            isBlacklisted: 1,
            blacklistReason: input.reason,
            blacklistedAt: new Date(),
            blacklistedBy: ctx.user!.id,
          })
          .where(inArray(users.id, input.userIds));
        
        return { success: true, count: input.userIds.length };
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
      totalBudget: z.number(),
      weeklyPointsTarget: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      pGenesisPercent: z.string(),
      pEcoPercent: z.string(),
      pTradePercent: z.string(),
      poolsConfig: z.string().optional(), // JSON string
    })).mutation(async ({ input, ctx }) => {
      const db = await import("./db");
      return db.createPointsConfig({
        ...input,
        status: "draft",
        createdBy: ctx.user!.id,
      });
    }),
    
    update: protectedProcedure.input(z.object({
      id: z.number(),
      phase: z.string().optional(),
      totalBudget: z.number().optional(),
      weeklyPointsTarget: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      pGenesisPercent: z.string().optional(),
      pEcoPercent: z.string().optional(),
      pTradePercent: z.string().optional(),
      poolsConfig: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const db = await import("./db");
      return db.updatePointsConfig(id, updates);
    }),
    
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.deletePointsConfig(input.id);
    }),
    
    setActive: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.setActiveConfig(input.id);
    }),
    
    // 状态管理
    activate: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.updatePointsConfig(input.id, { status: "active", isActive: 1 });
    }),
    
    pause: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.updatePointsConfig(input.id, { status: "paused" });
    }),
    
    resume: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.updatePointsConfig(input.id, { status: "active" });
    }),
    
    end: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      const db = await import("./db");
      return db.updatePointsConfig(input.id, { status: "ended", isActive: 0 });
    }),
  }),
});

export type AppRouter = typeof appRouter;
