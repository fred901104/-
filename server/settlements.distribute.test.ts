import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { settlements } from "../drizzle/schema";

describe("Settlements Distribution", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create a test settlement record", async () => {
    if (!db) throw new Error("Database not available");

    // 创建测试结算记录
    const testSettlement = {
      weekNumber: 1,
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-07"),
      totalPoints: 10000,
      genesisPoints: 4000,
      ecoPoints: 4000,
      tradePoints: 2000,
      preDistributionPoints: 10000,
      status: "confirmed" as const,
      createdBy: 1,
    };

    const result = await db.insert(settlements).values(testSettlement);
    expect(result).toBeDefined();
  });

  it("should list all settlements", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.settlements.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get latest settlement", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.settlements.latest();
    // 可能为null如果没有结算记录
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should distribute points to settlement", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个confirmed状态的结算记录
    const { eq } = await import("drizzle-orm");
    const confirmedSettlements = await db
      .select()
      .from(settlements)
      .where(eq(settlements.status, "confirmed"))
      .limit(1);

    if (confirmedSettlements.length === 0) {
      console.log("No confirmed settlements found, skipping distribution test");
      return;
    }

    const settlement = confirmedSettlements[0];

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.settlements.distribute({
      id: settlement.id,
      actualPoints: settlement.totalPoints,
    });

    expect(result.success).toBe(true);

    // 验证状态已更新
    const updated = await db
      .select()
      .from(settlements)
      .where(eq(settlements.id, settlement.id))
      .limit(1);

    expect(updated[0].status).toBe("distributed");
    expect(updated[0].actualDistributionPoints).toBe(settlement.totalPoints);
    expect(updated[0].distributedAt).toBeDefined();
  });

  it("should not allow duplicate distribution", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个已发放的结算记录
    const { eq } = await import("drizzle-orm");
    const distributedSettlements = await db
      .select()
      .from(settlements)
      .where(eq(settlements.status, "distributed"))
      .limit(1);

    if (distributedSettlements.length === 0) {
      console.log("No distributed settlements found, skipping duplicate test");
      return;
    }

    const settlement = distributedSettlements[0];

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.settlements.distribute({
        id: settlement.id,
        actualPoints: settlement.totalPoints,
      });
      // 如果没有抛出错误，测试失败
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain("已经发放");
    }
  });
});
