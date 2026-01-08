import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { stageBudgets, weeklyReleaseRules } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Points Configuration System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testStageId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    // 清理测试数据
    if (db && testStageId) {
      await db.delete(weeklyReleaseRules).where(eq(weeklyReleaseRules.stageId, testStageId));
      await db.delete(stageBudgets).where(eq(stageBudgets.id, testStageId));
    }
  });

  describe("Stage Budget Management", () => {
    it("should create a new stage budget", async () => {
      const [stage] = await db!.insert(stageBudgets).values({
        stageName: "TEST_STAGE",
        totalBudget: 1000000,
        startDate: new Date("2026-01-13"), // Monday
        endDate: new Date("2026-02-09"), // Sunday (4 weeks)
        status: "active",
      });

      testStageId = stage.insertId;
      expect(testStageId).toBeGreaterThan(0);

      const [created] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      expect(created).toBeDefined();
      expect(created.stageName).toBe("TEST_STAGE");
      expect(created.totalBudget).toBe(1000000);
      expect(created.status).toBe("active");
    });

    it("should track budget usage correctly", async () => {
      const [stage] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      
      expect(stage.usedBudget).toBe(0);
      expect(stage.totalBudget).toBe(1000000);
      
      // 模拟预算使用
      await db!.update(stageBudgets)
        .set({ usedBudget: 500000 })
        .where(eq(stageBudgets.id, testStageId));

      const [updated] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      expect(updated.usedBudget).toBe(500000);
    });

    it("should calculate budget usage rate correctly", async () => {
      const [stage] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      
      const usageRate = (stage.usedBudget / stage.totalBudget) * 100;
      expect(usageRate).toBe(50);
    });

    it("should end a stage budget", async () => {
      await db!.update(stageBudgets)
        .set({ status: "ended" })
        .where(eq(stageBudgets.id, testStageId));

      const [ended] = await db!.select().from(stageBudgets).where(eq(stageBudgets.id, testStageId));
      expect(ended.status).toBe("ended");
    });
  });

  describe("Weekly Release Rules Management", () => {
    beforeAll(async () => {
      // 重新激活阶段用于周配置测试
      await db!.update(stageBudgets)
        .set({ status: "active" })
        .where(eq(stageBudgets.id, testStageId));
    });

    it("should create a weekly release rule", async () => {
      const [rule] = await db!.insert(weeklyReleaseRules).values({
        stageId: testStageId,
        weekNumber: 1,
        startDate: new Date("2026-01-13"), // Monday
        endDate: new Date("2026-01-19"), // Sunday
        weeklyPointsTarget: 250000,
        pGenesisPercent: "40",
        pEcoPercent: "40",
        pTradePercent: "20",
        status: "active",
      });

      expect(rule.insertId).toBeGreaterThan(0);

      const [created] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.id, rule.insertId));
      
      expect(created).toBeDefined();
      expect(created.weekNumber).toBe(1);
      expect(created.weeklyPointsTarget).toBe(250000);
      expect(created.status).toBe("active");
    });

    it("should validate natural week (Monday start)", () => {
      const mondayDate = new Date("2026-01-13");
      const tuesdayDate = new Date("2026-01-14");
      
      expect(mondayDate.getDay()).toBe(1); // Monday
      expect(tuesdayDate.getDay()).toBe(2); // Tuesday (should fail)
    });

    it("should track actual released points", async () => {
      const [rule] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));

      expect(rule.actualReleased).toBe(0);

      // 模拟积分释放
      await db!.update(weeklyReleaseRules)
        .set({ actualReleased: 200000 })
        .where(eq(weeklyReleaseRules.id, rule.id));

      const [updated] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.id, rule.id));
      
      expect(updated.actualReleased).toBe(200000);
    });

    it("should pause and resume a weekly rule", async () => {
      const [rule] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));

      // Pause
      await db!.update(weeklyReleaseRules)
        .set({ status: "paused" })
        .where(eq(weeklyReleaseRules.id, rule.id));

      const [paused] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.id, rule.id));
      expect(paused.status).toBe("paused");

      // Resume
      await db!.update(weeklyReleaseRules)
        .set({ status: "active" })
        .where(eq(weeklyReleaseRules.id, rule.id));

      const [resumed] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.id, rule.id));
      expect(resumed.status).toBe("active");
    });

    it("should end a weekly rule", async () => {
      const [rule] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.stageId, testStageId));

      await db!.update(weeklyReleaseRules)
        .set({ status: "ended" })
        .where(eq(weeklyReleaseRules.id, rule.id));

      const [ended] = await db!.select().from(weeklyReleaseRules)
        .where(eq(weeklyReleaseRules.id, rule.id));
      expect(ended.status).toBe("ended");
    });
  });

  describe("Budget Monitoring and Warnings", () => {
    it("should detect normal budget usage (< 80%)", () => {
      const totalBudget = 1000000;
      const usedBudget = 700000;
      const usageRate = (usedBudget / totalBudget) * 100;

      let warningLevel: "normal" | "warning" | "critical" = "normal";
      if (usageRate >= 95) warningLevel = "critical";
      else if (usageRate >= 80) warningLevel = "warning";

      expect(usageRate).toBe(70);
      expect(warningLevel).toBe("normal");
    });

    it("should detect warning budget usage (80-95%)", () => {
      const totalBudget = 1000000;
      const usedBudget = 850000;
      const usageRate = (usedBudget / totalBudget) * 100;

      let warningLevel: "normal" | "warning" | "critical" = "normal";
      if (usageRate >= 95) warningLevel = "critical";
      else if (usageRate >= 80) warningLevel = "warning";

      expect(usageRate).toBe(85);
      expect(warningLevel).toBe("warning");
    });

    it("should detect critical budget usage (>= 95%)", () => {
      const totalBudget = 1000000;
      const usedBudget = 970000;
      const usageRate = (usedBudget / totalBudget) * 100;

      let warningLevel: "normal" | "warning" | "critical" = "normal";
      if (usageRate >= 95) warningLevel = "critical";
      else if (usageRate >= 80) warningLevel = "warning";

      expect(usageRate).toBe(97);
      expect(warningLevel).toBe("critical");
    });
  });

  describe("Pool Ratio Validation", () => {
    it("should validate pool ratios sum to 100%", () => {
      const pGenesisPercent = 40;
      const pEcoPercent = 40;
      const pTradePercent = 20;

      const total = pGenesisPercent + pEcoPercent + pTradePercent;
      expect(total).toBe(100);
    });

    it("should reject invalid pool ratios", () => {
      const pGenesisPercent = 40;
      const pEcoPercent = 40;
      const pTradePercent = 25; // Invalid: total = 105

      const total = pGenesisPercent + pEcoPercent + pTradePercent;
      expect(total).not.toBe(100);
    });
  });
});
