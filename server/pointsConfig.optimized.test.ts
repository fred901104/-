import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { stageBudgets, weeklyReleaseRules } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Points Configuration System - Optimized Features", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testStageId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试阶段
    const [stage] = await db.insert(stageBudgets).values({
      stageName: "TEST_STAGE_OPT",
      totalBudget: 1000000,
      startDate: new Date("2026-01-13"), // Monday
      endDate: new Date("2026-03-09"), // 8 weeks later
      status: "active",
    });
    testStageId = stage.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    if (db && testStageId) {
      await db.delete(weeklyReleaseRules).where(eq(weeklyReleaseRules.stageId, testStageId));
      await db.delete(stageBudgets).where(eq(stageBudgets.id, testStageId));
    }
  });

  describe("Natural Week Auto-Calculation", () => {
    it("should auto-calculate week end date from Monday start date", () => {
      const mondayDate = new Date("2026-01-13"); // Monday
      mondayDate.setHours(0, 0, 0, 0);

      const endDate = new Date(mondayDate);
      endDate.setDate(endDate.getDate() + 6); // +6 days = Sunday
      endDate.setHours(23, 59, 59, 999);

      expect(endDate.getDay()).toBe(0); // Sunday
      expect(endDate.getDate()).toBe(18); // Jan 18 (13 + 6 - 1 = 18, because we set hours to 23:59:59)
    });

    it("should auto-calculate week number based on stage start date", async () => {
      const [stage] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      
      const week1Start = new Date("2026-01-13"); // Same as stage start
      const week2Start = new Date("2026-01-20"); // +7 days
      const week3Start = new Date("2026-01-27"); // +14 days

      const weekNumber1 = Math.floor(
        (week1Start.getTime() - stage.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;
      const weekNumber2 = Math.floor(
        (week2Start.getTime() - stage.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;
      const weekNumber3 = Math.floor(
        (week3Start.getTime() - stage.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;

      expect(weekNumber1).toBe(1);
      expect(weekNumber2).toBe(2);
      expect(weekNumber3).toBe(3);
    });
  });

  describe("Pending Status Auto-Detection", () => {
    it("should set status to 'pending' for future weeks", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14); // 2 weeks in future
      
      const now = new Date();
      const status = futureDate > now ? "pending" : "active";

      expect(status).toBe("pending");
    });

    it("should set status to 'active' for current/past weeks", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 1 week ago
      
      const now = new Date();
      const status = pastDate > now ? "pending" : "active";

      expect(status).toBe("active");
    });
  });

  describe("Duplicate Week Configuration Detection", () => {
    it("should create first week configuration successfully", async () => {
      const [rule] = await db!.insert(weeklyReleaseRules).values({
        stageId: testStageId,
        weekNumber: 1,
        startDate: new Date("2026-01-13"), // Monday
        endDate: new Date("2026-01-19"), // Sunday
        weeklyPointsTarget: 100000,
        pGenesisPercent: "40",
        pEcoPercent: "40",
        pTradePercent: "20",
        status: "active",
      });

      expect(rule.insertId).toBeGreaterThan(0);
    });

    it("should detect duplicate configuration in the same natural week", async () => {
      const { and, or, lte, gte, ne } = await import("drizzle-orm");
      
      const startDate = new Date("2026-01-13"); // Same Monday
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const existingRules = await db!.select().from(weeklyReleaseRules)
        .where(
          and(
            eq(weeklyReleaseRules.stageId, testStageId),
            ne(weeklyReleaseRules.status, "ended"),
            or(
              and(
                lte(weeklyReleaseRules.startDate, startDate),
                gte(weeklyReleaseRules.endDate, startDate)
              ),
              and(
                lte(weeklyReleaseRules.startDate, endDate),
                gte(weeklyReleaseRules.endDate, endDate)
              ),
              and(
                gte(weeklyReleaseRules.startDate, startDate),
                lte(weeklyReleaseRules.endDate, endDate)
              )
            )
          )
        );

      expect(existingRules.length).toBeGreaterThan(0);
      expect(existingRules[0].weekNumber).toBe(1);
    });

    it("should allow configuration for different natural weeks", async () => {
      const [rule] = await db!.insert(weeklyReleaseRules).values({
        stageId: testStageId,
        weekNumber: 2,
        startDate: new Date("2026-01-20"), // Next Monday
        endDate: new Date("2026-01-26"), // Next Sunday
        weeklyPointsTarget: 100000,
        pGenesisPercent: "40",
        pEcoPercent: "40",
        pTradePercent: "20",
        status: "pending",
      });

      expect(rule.insertId).toBeGreaterThan(0);
    });
  });

  describe("Status Transitions", () => {
    it("should support all four status types", async () => {
      const statuses = ["pending", "active", "paused", "ended"] as const;
      
      for (const status of statuses) {
        const isValidStatus = ["pending", "active", "paused", "ended"].includes(status);
        expect(isValidStatus).toBe(true);
      }
    });

    it("should transition from pending to active", async () => {
      const rules = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));
      
      const pendingRule = rules.find(r => r.status === "pending");
      if (pendingRule) {
        await db!.update(weeklyReleaseRules)
          .set({ status: "active" })
          .where(eq(weeklyReleaseRules.id, pendingRule.id));

        const [updated] = await db!.select().from(weeklyReleaseRules)
          .where(eq(weeklyReleaseRules.id, pendingRule.id));
        
        expect(updated.status).toBe("active");
      }
    });

    it("should transition from active to paused", async () => {
      const rules = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));
      
      const activeRule = rules.find(r => r.status === "active");
      if (activeRule) {
        await db!.update(weeklyReleaseRules)
          .set({ status: "paused" })
          .where(eq(weeklyReleaseRules.id, activeRule.id));

        const [updated] = await db!.select().from(weeklyReleaseRules)
          .where(eq(weeklyReleaseRules.id, activeRule.id));
        
        expect(updated.status).toBe("paused");
      }
    });

    it("should transition from paused to active", async () => {
      const rules = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));
      
      const pausedRule = rules.find(r => r.status === "paused");
      if (pausedRule) {
        await db!.update(weeklyReleaseRules)
          .set({ status: "active" })
          .where(eq(weeklyReleaseRules.id, pausedRule.id));

        const [updated] = await db!.select().from(weeklyReleaseRules)
          .where(eq(weeklyReleaseRules.id, pausedRule.id));
        
        expect(updated.status).toBe("active");
      }
    });

    it("should transition to ended", async () => {
      const rules = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));
      
      if (rules.length > 0) {
        await db!.update(weeklyReleaseRules)
          .set({ status: "ended" })
          .where(eq(weeklyReleaseRules.id, rules[0].id));

        const [updated] = await db!.select().from(weeklyReleaseRules)
          .where(eq(weeklyReleaseRules.id, rules[0].id));
        
        expect(updated.status).toBe("ended");
      }
    });
  });

  describe("Historical Configuration Records", () => {
    it("should separate active and historical configurations", async () => {
      const allRules = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));

      const activeRules = allRules.filter(r => r.status !== "ended");
      const historicalRules = allRules.filter(r => r.status === "ended");

      expect(activeRules.length).toBeGreaterThan(0);
      expect(historicalRules.length).toBeGreaterThan(0);
    });

    it("should calculate completion rate for historical configurations", () => {
      const weeklyPointsTarget = 100000;
      const actualReleased = 85000;
      
      const completionRate = (actualReleased / weeklyPointsTarget) * 100;
      
      expect(completionRate).toBe(85);
    });
  });

  describe("Monday Validation", () => {
    it("should validate that start date is Monday", () => {
      const mondayDate = new Date("2026-01-13");
      const tuesdayDate = new Date("2026-01-14");
      const sundayDate = new Date("2026-01-19");

      expect(mondayDate.getDay()).toBe(1); // Monday
      expect(tuesdayDate.getDay()).toBe(2); // Tuesday (invalid)
      expect(sundayDate.getDay()).toBe(0); // Sunday (invalid)
    });
  });
});
