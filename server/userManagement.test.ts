import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

describe("User Management", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should list users with pagination", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.list({
      page: 1,
      pageSize: 20,
    });

    expect(result).toBeDefined();
    expect(result.users).toBeDefined();
    expect(result.total).toBeGreaterThan(0);
    expect(Array.isArray(result.users)).toBe(true);
  });

  it("should filter users by role", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.list({
      page: 1,
      pageSize: 20,
      role: "admin",
    });

    expect(result).toBeDefined();
    expect(result.users.every(u => u.role === "admin")).toBe(true);
  });

  it("should search users by name or email", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.list({
      page: 1,
      pageSize: 20,
      search: "user",
    });

    expect(result).toBeDefined();
    expect(result.users.length).toBeGreaterThan(0);
  });

  it("should adjust user points", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个测试用户
    const { eq } = await import("drizzle-orm");
    const testUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "user"))
      .limit(1);

    if (testUsers.length === 0) {
      console.log("No test users found, skipping adjust points test");
      return;
    }

    testUserId = testUsers[0].id;

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.adjustPoints({
      userId: testUserId,
      amount: 100,
      type: "genesis",
      reason: "测试调整积分",
    });

    expect(result.success).toBe(true);
  });

  it("should blacklist a user", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个正常用户
    const { eq } = await import("drizzle-orm");
    const normalUsers = await db
      .select()
      .from(users)
      .where(eq(users.isBlacklisted, 0))
      .limit(1);

    if (normalUsers.length === 0) {
      console.log("No normal users found, skipping blacklist test");
      return;
    }

    const userId = normalUsers[0].id;

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.blacklist({
      userId,
      reason: "测试拉黑",
    });

    expect(result.success).toBe(true);

    // 验证用户已被拉黑
    const blacklistedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    expect(blacklistedUser[0].isBlacklisted).toBe(1);
    expect(blacklistedUser[0].blacklistReason).toBe("测试拉黑");
  });

  it("should unblacklist a user", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个黑名单用户
    const { eq } = await import("drizzle-orm");
    const blacklistedUsers = await db
      .select()
      .from(users)
      .where(eq(users.isBlacklisted, 1))
      .limit(1);

    if (blacklistedUsers.length === 0) {
      console.log("No blacklisted users found, skipping unblacklist test");
      return;
    }

    const userId = blacklistedUsers[0].id;

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.unblacklist({
      userId,
    });

    expect(result.success).toBe(true);

    // 验证用户已解除拉黑
    const normalUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    expect(normalUser[0].isBlacklisted).toBe(0);
    expect(normalUser[0].blacklistReason).toBeNull();
  });

  it("should get user points history", async () => {
    if (!db) throw new Error("Database not available");

    // 获取一个有积分记录的用户
    const { pointsRecords } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    
    const usersWithPoints = await db
      .select({ userId: pointsRecords.userId })
      .from(pointsRecords)
      .limit(1);

    if (usersWithPoints.length === 0) {
      console.log("No users with points found, skipping points history test");
      return;
    }

    const userId = usersWithPoints[0].userId;

    const caller = appRouter.createCaller({
      user: { id: 1, name: "Test Admin", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userManagement.pointsHistory({
      userId,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
