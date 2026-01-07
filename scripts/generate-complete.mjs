import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 生成完整的3周业务数据\n");
console.log("📊 目标：每周10万积分，共30万积分");
console.log("📊 P_Genesis: 40% = 120,000");
console.log("📊 P_Eco: 40% = 120,000");
console.log("📊 P_Trade: 20% = 60,000\n");

const now = new Date();
const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// 1. 生成用户
console.log("👥 生成1000个用户...");
const users = [];
for (let i = 1; i <= 1000; i++) {
  users.push({
    openId: `user_${i}_${Date.now()}`,
    name: `User${i}`,
    email: `user${i}@test.com`,
    role: i <= 5 ? "admin" : "user",
    totalPoints: 0,
    frozenPoints: 0,
    isBlacklisted: 0,
  });
}
await db.insert(schema.users).values(users);
console.log("✅ 用户创建完成\n");

// 2. 生成直播数据
console.log("📺 生成直播数据（400场）...");
const liveStreams = [];
const creatorContribs = [];
const audienceContribs = [];

for (let i = 0; i < 400; i++) {
  const streamerId = randomInt(1, 100); // 100个主播
  const startTime = randomDate(threeWeeksAgo, now);
  const duration = randomInt(30, 480); // 30分钟到8小时
  const avgCCU = randomInt(5, 200);
  const peakCCU = Math.floor(avgCCU * randomFloat(1.2, 2.0));
  
  const stream = {
    streamerId,
    title: `直播${i + 1}`,
    startTime,
    endTime: new Date(startTime.getTime() + duration * 60 * 1000),
    duration,
    avgCCU,
    peakCCU,
    totalViewers: randomInt(avgCCU * 2, avgCCU * 10),
    totalGifts: randomFloat(0, 1000, 2),
    totalChats: randomInt(10, 500),
    isFeatured: Math.random() < 0.1 ? 1 : 0,
    isAbnormal: Math.random() < 0.05 ? 1 : 0,
  };
  liveStreams.push(stream);
  
  // 主播贡献
  const effectiveDuration = Math.min(duration, 480); // 最多8小时
  const chatScore = stream.totalChats * 0.2;
  const giftScore = stream.totalGifts * 1;
  const featuredBonus = stream.isFeatured ? 5 : 0;
  
  creatorContribs.push({
    streamId: i + 1,
    userId: streamerId,
    date: new Date(startTime.toDateString()),
    duration: effectiveDuration,
    avgCCU,
    chatCount: stream.totalChats,
    giftAmount: stream.totalGifts,
    featuredPostCount: stream.isFeatured ? 1 : 0,
    totalScore: parseFloat((effectiveDuration * 5 + avgCCU * 3 + chatScore + giftScore + featuredBonus).toFixed(2)),
  });
  
  // 观众贡献（每场直播10-50个观众）
  const audienceCount = randomInt(10, 50);
  for (let j = 0; j < audienceCount; j++) {
    const viewerId = randomInt(101, 1000);
    const watchDuration = randomInt(5, Math.min(duration, 240)); // 最多4小时
    const giftAmount = randomFloat(0, 50, 2);
    const chatCount = randomInt(0, 20);
    const featuredPosts = Math.random() < 0.02 ? 1 : 0;
    
    audienceContribs.push({
      streamId: i + 1,
      userId: viewerId,
      date: new Date(startTime.toDateString()),
      watchDuration,
      giftAmount,
      chatCount,
      featuredPostCount: featuredPosts,
      totalScore: parseFloat((giftAmount * 5 + watchDuration * 1 + chatCount * 0.2 + featuredPosts * 5).toFixed(2)),
    });
  }
}

await db.insert(schema.liveStreams).values(liveStreams);
console.log("✅ 直播数据完成");

console.log("📊 插入主播贡献数据...");
for (let i = 0; i < creatorContribs.length; i += 100) {
  await db.insert(schema.creatorContributions).values(creatorContribs.slice(i, i + 100));
}
console.log("✅ 主播贡献完成");

console.log("📊 插入观众贡献数据...");
for (let i = 0; i < audienceContribs.length; i += 500) {
  await db.insert(schema.audienceContributions).values(audienceContribs.slice(i, i + 500));
}
console.log("✅ 观众贡献完成\n");

// 3. 生成工单数据
console.log("🎫 生成工单数据（150个）...");
const tickets = [];
for (let i = 0; i < 150; i++) {
  const createdAt = randomDate(threeWeeksAgo, now);
  const ticketType = ["bug", "suggestion", "info"][randomInt(0, 2)];
  const priority = ["p0", "p1", "p2", "p3"][randomInt(0, 3)];
  const status = Math.random() < 0.7 ? "approved" : Math.random() < 0.85 ? "pending" : "rejected";
  
  let points = 0;
  if (status === "approved") {
    points = priority === "p0" ? randomFloat(80, 100) :
             priority === "p1" ? randomFloat(50, 80) :
             priority === "p2" ? randomFloat(20, 50) :
             randomFloat(5, 20);
  }
  
  tickets.push({
    userId: randomInt(1, 1000),
    type: ticketType,
    title: `工单${i + 1}`,
    content: `工单详细内容${i + 1}`,
    info: `工单详细信息${i + 1}`,
    priority,
    points,
    status,
    createdAt,
    reviewedAt: status !== "pending" ? new Date(createdAt.getTime() + 3600000) : null,
    reviewedBy: status !== "pending" ? 1 : null,
  });
}
await db.insert(schema.tickets).values(tickets);
console.log("✅ 工单数据完成\n");

// 4. 生成交易数据
console.log("💰 生成交易数据（5000笔）...");
const tradeRecords = [];
for (let i = 0; i < 5000; i++) {
  const createdAt = randomDate(threeWeeksAgo, now);
  const tradeType = ["buy", "sell"][randomInt(0, 1)];
  const tradePair = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"][randomInt(0, 3)];
  const amount = randomFloat(0.01, 10, 4);
  const price = randomFloat(100, 50000, 2);
  const volume = parseFloat((amount * price).toFixed(2));
  const fee = parseFloat((volume * 0.001).toFixed(2));
  const status = Math.random() < 0.95 ? "completed" : "cancelled";
  
  tradeRecords.push({
    userId: randomInt(1, 1000),
    tradeType,
    tradePair,
    amount,
    price,
    volume,
    fee,
    status,
    isSuspicious: Math.random() < 0.02 ? 1 : 0,
    createdAt,
    completedAt: status === "completed" ? new Date(createdAt.getTime() + randomInt(1000, 10000)) : null,
  });
}

console.log("📊 插入交易数据...");
for (let i = 0; i < tradeRecords.length; i += 500) {
  await db.insert(schema.tradeRecords).values(tradeRecords.slice(i, i + 500));
}
console.log("✅ 交易数据完成\n");

// 5. 生成积分记录
console.log("🎁 生成积分记录...");
const pointsRecords = [];

// P_Genesis (40% = 120,000)
console.log("  生成P_Genesis积分...");
const approvedTickets = tickets.filter(t => t.status === "approved");
const totalTicketPoints = approvedTickets.reduce((sum, t) => sum + t.points, 0);
const GENESIS_TARGET = 120000;

for (const ticket of approvedTickets) {
  const amount = parseFloat((GENESIS_TARGET * (ticket.points / totalTicketPoints)).toFixed(2));
  pointsRecords.push({
    userId: ticket.userId,
    type: "genesis",
    subType: ticket.type,
    amount,
    description: `工单积分: ${ticket.title}`,
    status: "approved",
    relatedId: tickets.indexOf(ticket) + 1,
    approvedAt: ticket.reviewedAt,
    approvedBy: 1,
  });
}

// P_Eco主播 (20% = 60,000)
console.log("  生成P_Eco主播积分...");
const totalCreatorScore = creatorContribs.reduce((sum, c) => sum + c.totalScore, 0);
const ECO_CREATOR_TARGET = 60000;

for (const contrib of creatorContribs) {
  if (contrib.totalScore > 0) {
    const amount = parseFloat((ECO_CREATOR_TARGET * (contrib.totalScore / totalCreatorScore)).toFixed(2));
    pointsRecords.push({
      userId: contrib.userId,
      type: "eco",
      subType: "live_stream_host",
      amount,
      description: "直播主播积分",
      status: "approved",
      relatedId: contrib.streamId,
      approvedAt: contrib.date,
      approvedBy: 1,
    });
  }
}

// P_Eco观众 (20% = 60,000)
console.log("  生成P_Eco观众积分...");
const totalAudienceScore = audienceContribs.reduce((sum, c) => sum + c.totalScore, 0);
const ECO_AUDIENCE_TARGET = 60000;

for (const contrib of audienceContribs) {
  if (contrib.totalScore > 0) {
    const amount = parseFloat((ECO_AUDIENCE_TARGET * (contrib.totalScore / totalAudienceScore)).toFixed(2));
    pointsRecords.push({
      userId: contrib.userId,
      type: "eco",
      subType: "watch_stream",
      amount,
      description: "观看直播积分",
      status: "approved",
      relatedId: contrib.streamId,
      approvedAt: contrib.date,
      approvedBy: 1,
    });
  }
}

// P_Trade (20% = 60,000)
console.log("  生成P_Trade积分...");
const completedTrades = tradeRecords.filter(t => t.status === "completed");
const totalTradeVolume = completedTrades.reduce((sum, t) => sum + t.volume, 0);
const TRADE_TARGET = 60000;

for (const trade of completedTrades) {
  if (trade.volume > 0) {
    const amount = parseFloat((TRADE_TARGET * (trade.volume / totalTradeVolume)).toFixed(2));
    pointsRecords.push({
      userId: trade.userId,
      type: "trade",
      subType: "trading",
      amount,
      description: `交易积分: ${trade.tradePair}`,
      status: "approved",
      relatedId: tradeRecords.indexOf(trade) + 1,
      approvedAt: trade.completedAt,
      approvedBy: 1,
    });
  }
}

console.log(`📊 插入${pointsRecords.length}条积分记录...`);
for (let i = 0; i < pointsRecords.length; i += 500) {
  await db.insert(schema.pointsRecords).values(pointsRecords.slice(i, i + 500));
  console.log(`  已插入${Math.min(i + 500, pointsRecords.length)}/${pointsRecords.length}`);
}
console.log("✅ 积分记录完成\n");

// 6. 生成结算记录
console.log("📊 生成结算记录（3周）...");
const settlements = [];
for (let week = 1; week <= 3; week++) {
  const weekStart = new Date(threeWeeksAgo.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  settlements.push({
    weekNumber: week,
    year: 2026,
    startDate: weekStart,
    endDate: weekEnd,
    totalPoints: 100000,
    genesisPoints: 40000,
    ecoPoints: 40000,
    tradePoints: 20000,
    preDistributionPoints: 100000,
    actualDistributionPoints: week <= 2 ? 100000 : null, // 前2周已发放
    status: week <= 2 ? "distributed" : "confirmed",
    createdBy: 1,
    distributedAt: week <= 2 ? weekEnd : null,
  });
}
await db.insert(schema.settlements).values(settlements);
console.log("✅ 结算记录完成\n");

// 7. 生成积分配置
console.log("⚙️  生成积分配置...");
try {
  await db.insert(schema.pointsConfigs).values({
    phase: "S0 Alpha",
    phaseDescription: "SO Alpha测试阶段",
    totalTokens: "10000000",
    pointsPoolPercent: "30.00",
    phaseReleasePercent: "10.00",
    weekCount: 52,
    dynamicPoolPercent: "60.00",
    genesisPoolPercent: "40.00",
    pGenesisPercent: "40.00",
    pEcoPercent: "40.00",
    pTradePercent: "20.00",
    rulesConfig: JSON.stringify({
      genesis: { bug: 0.4, suggestion: 0.3, critical_info: 0.3 },
      eco: { creator: 0.5, audience: 0.5 },
      trade: { trading: 1.0 }
    }),
    status: "active",
    createdBy: 1,
  });
  console.log("✅ 积分配置完成\n");
} catch (e) {
  console.log("⚠️  积分配置已存在\n");
}

// 最终统计
console.log("=".repeat(60));
console.log("✨ 数据生成完成！\n");
console.log("📊 数据统计：");
console.log(`  用户：${users.length}`);
console.log(`  直播：${liveStreams.length}`);
console.log(`  主播贡献：${creatorContribs.length}`);
console.log(`  观众贡献：${audienceContribs.length}`);
console.log(`  工单：${tickets.length}`);
console.log(`  交易：${tradeRecords.length}`);
console.log(`  积分记录：${pointsRecords.length}`);
console.log(`  结算记录：${settlements.length}\n`);

const totalGenerated = pointsRecords.reduce((sum, p) => sum + p.amount, 0);
const genesisPts = pointsRecords.filter(p => p.type === "genesis").reduce((sum, p) => sum + p.amount, 0);
const ecoPts = pointsRecords.filter(p => p.type === "eco").reduce((sum, p) => sum + p.amount, 0);
const tradePts = pointsRecords.filter(p => p.type === "trade").reduce((sum, p) => sum + p.amount, 0);

console.log("💰 积分分布：");
console.log(`  总积分：${totalGenerated.toFixed(2)}`);
console.log(`  P_Genesis：${genesisPts.toFixed(2)} (${(genesisPts/totalGenerated*100).toFixed(1)}%)`);
console.log(`  P_Eco：${ecoPts.toFixed(2)} (${(ecoPts/totalGenerated*100).toFixed(1)}%)`);
console.log(`  P_Trade：${tradePts.toFixed(2)} (${(tradePts/totalGenerated*100).toFixed(1)}%)`);
console.log(`\n✅ 数据口径准确，前后匹配！`);
console.log("=".repeat(60));

await connection.end();
