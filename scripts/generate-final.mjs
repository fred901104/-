import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 开始生成完整数据...\n");

// 1. 生成用户（1000个）
console.log("👥 生成用户数据...");
const userCount = 1000;
const users = [];
for (let i = 1; i <= userCount; i++) {
  const isStreamer = Math.random() < 0.1; // 10%是主播
  users.push({
    openId: `user_${i}_${Date.now()}`,
    name: `User ${i}`,
    nickname: `用户${i}`,
    email: `user${i}@example.com`,
    loginMethod: ["email", "wallet", "google"][Math.floor(Math.random() * 3)],
    role: "user",
    isXBound: Math.random() < 0.3 ? 1 : 0, // 30%绑定X
    isStreamerVerified: isStreamer ? 1 : 0,
    spotTradingVolume: (Math.random() * 100000).toFixed(2),
    futuresTradingVolume: (Math.random() * 200000).toFixed(2),
    totalStreamingMinutes: isStreamer ? Math.floor(Math.random() * 10000) : 0,
    totalWatchingMinutes: Math.floor(Math.random() * 5000),
    totalPosts: Math.floor(Math.random() * 100),
  });
}

// 批量插入用户
for (let i = 0; i < users.length; i += 100) {
  await db.insert(schema.users).values(users.slice(i, i + 100));
}
console.log(`✅ 生成了 ${userCount} 个用户\n`);

// 获取所有用户ID
const allUsers = await db.select({ id: schema.users.id }).from(schema.users);
const userIds = allUsers.map(u => u.id);

// 2. 生成积分配置
console.log("⚙️  生成积分配置...");
await db.insert(schema.pointsConfigs).values({
  phase: "S0",
  weeklyPointsTarget: 100000,
  pGenesisPercent: 40,
  pEcoPercent: 40,
  pTradePercent: 20,
  isActive: 1,
  createdBy: 1,
});
console.log("✅ 积分配置完成\n");

// 3. 生成3周的完整数据
const startDate = new Date("2026-01-01");
for (let week = 1; week <= 3; week++) {
  console.log(`📅 生成第${week}周数据...`);
  
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // 每周100,000积分
  const weeklyTotal = 100000;
  const genesisPoints = weeklyTotal * 0.4; // 40,000
  const ecoPoints = weeklyTotal * 0.4; // 40,000
  const tradePoints = weeklyTotal * 0.2; // 20,000
  
  // 3.1 生成P_Genesis积分记录
  console.log(`  生成P_Genesis积分...`);
  const genesisRecords = [];
  for (let i = 0; i < 200; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const amount = Math.floor(genesisPoints / 200);
    genesisRecords.push({
      userId,
      type: "genesis",
      subType: "initial",
      amount,
      description: "创世池初始分配",
      status: "approved",
      createdAt: new Date(weekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  for (let i = 0; i < genesisRecords.length; i += 100) {
    await db.insert(schema.pointsRecords).values(genesisRecords.slice(i, i + 100));
  }
  
  // 3.2 生成P_Eco积分记录（直播相关）
  console.log(`  生成P_Eco积分...`);
  const ecoRecords = [];
  for (let i = 0; i < 200; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const amount = Math.floor(ecoPoints / 200);
    ecoRecords.push({
      userId,
      type: "eco",
      subType: Math.random() < 0.5 ? "audience" : "creator",
      amount,
      description: "直播生态贡献",
      status: "approved",
      createdAt: new Date(weekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  for (let i = 0; i < ecoRecords.length; i += 100) {
    await db.insert(schema.pointsRecords).values(ecoRecords.slice(i, i + 100));
  }
  
  // 3.3 生成P_Trade积分记录
  console.log(`  生成P_Trade积分...`);
  const tradeRecords = [];
  for (let i = 0; i < 100; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const amount = Math.floor(tradePoints / 100);
    tradeRecords.push({
      userId,
      type: "trade",
      subType: "trading",
      amount,
      description: "交易贡献",
      status: "approved",
      createdAt: new Date(weekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  for (let i = 0; i < tradeRecords.length; i += 100) {
    await db.insert(schema.pointsRecords).values(tradeRecords.slice(i, i + 100));
  }
  
  // 3.4 生成结算记录
  console.log(`  生成结算记录...`);
  await db.insert(schema.settlements).values({
    year: 2026,
    weekNumber: week,
    startDate: weekStart,
    endDate: weekEnd,
    totalPoints: weeklyTotal,
    genesisPoints: Math.floor(genesisPoints),
    ecoPoints: Math.floor(ecoPoints),
    tradePoints: Math.floor(tradePoints),
    estimatedPoints: weeklyTotal,
    actualPoints: weeklyTotal,
    status: week < 3 ? "distributed" : "confirmed",
    createdBy: 1,
  });
  
  console.log(`✅ 第${week}周数据生成完成\n`);
}

// 4. 生成工单
console.log("🎫 生成工单数据...");
const tickets = [];
for (let i = 0; i < 150; i++) {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  tickets.push({
    userId,
    type: ["bug", "suggestion", "info"][Math.floor(Math.random() * 3)],
    priority: ["p0", "p1", "p2", "p3"][Math.floor(Math.random() * 4)],
    title: `工单标题 ${i + 1}`,
    content: `工单内容描述 ${i + 1}`,
    status: ["pending", "approved", "rejected"][Math.floor(Math.random() * 3)],
    points: Math.floor(Math.random() * 1000),
    createdAt: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000),
  });
}
for (let i = 0; i < tickets.length; i += 100) {
  await db.insert(schema.tickets).values(tickets.slice(i, i + 100));
}
console.log(`✅ 生成了 ${tickets.length} 个工单\n`);

// 5. 生成直播记录
console.log("📺 生成直播记录...");
const streams = [];
for (let i = 0; i < 400; i++) {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  const startTime = new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000);
  const duration = Math.floor(Math.random() * 180) + 30;
  streams.push({
    streamerId: userId,
    title: `直播标题 ${i + 1}`,
    startTime,
    endTime: new Date(startTime.getTime() + duration * 60 * 1000),
    duration,
    peakViewers: Math.floor(Math.random() * 1000) + 10,
    totalViewers: Math.floor(Math.random() * 5000) + 50,
    status: "ended",
  });
}
for (let i = 0; i < streams.length; i += 100) {
  await db.insert(schema.liveStreams).values(streams.slice(i, i + 100));
}
console.log(`✅ 生成了 ${streams.length} 场直播\n`);

// 6. 生成交易记录
console.log("💰 生成交易记录...");
const trades = [];
for (let i = 0; i < 5000; i++) {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  const volume = Math.floor(Math.random() * 100000);
  trades.push({
    userId,
    tradePair: ["BTC/USDT", "ETH/USDT", "SOL/USDT"][Math.floor(Math.random() * 3)],
    tradeType: ["spot", "futures"][Math.floor(Math.random() * 2)],
    volume,
    feeAmount: Math.floor(volume * 0.001),
    holdingDuration: Math.floor(Math.random() * 1000),
    orderCount: Math.floor(Math.random() * 10) + 1,
    isSuspicious: Math.random() < 0.05 ? 1 : 0,
    createdAt: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000),
  });
}
for (let i = 0; i < trades.length; i += 100) {
  await db.insert(schema.tradeRecords).values(trades.slice(i, i + 100));
}
console.log(`✅ 生成了 ${trades.length} 条交易记录\n`);

console.log("🎉 所有数据生成完成！");
await connection.end();
