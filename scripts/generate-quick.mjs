import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 快速生成真实场景数据...");
console.log("📊 场景：每周10万积分 | 3周 | 真实业务模拟\n");

// 配置
const WEEKS = 3;
const POINTS_PER_WEEK = 100000;
const TOTAL_POINTS = 300000;

const POOL_RATIOS = { genesis: 0.40, eco: 0.40, trade: 0.20 };
const ECO_RATIOS = { creator: 0.50, audience: 0.50 };

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

// 1. 生成用户（1000人）
console.log("👥 生成1000个用户...");
const users = [];
for (let i = 1; i <= 1000; i++) {
  users.push({
    openId: `user_${i}_${Date.now()}_${randomInt(1000, 9999)}`,
    name: `用户${i}`,
    email: `user${i}@soalpha.com`,
    loginMethod: ["email", "wechat"][randomInt(0, 1)],
    role: "user",
    isBlacklisted: 0,
    createdAt: randomDate(threeWeeksAgo, now),
    lastSignedIn: randomDate(threeWeeksAgo, now),
  });
}
await db.insert(schema.users).values(users);
console.log("✅ 用户创建完成");

// 2. 生成直播（50主播 * 8场 = 400场）
console.log("\n📺 生成直播数据...");
const streams = [];
const creatorContributions = [];

for (let streamerId = 1; streamerId <= 50; streamerId++) {
  for (let i = 0; i < 8; i++) {
    const startTime = randomDate(threeWeeksAgo, now);
    const duration = randomInt(60, 150);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    const viewerCount = randomInt(100, 300);
    const peakCCU = Math.floor(viewerCount * 0.75);
    const likeCount = viewerCount * randomInt(3, 6);
    const commentCount = viewerCount * randomInt(1, 2);
    const shareCount = Math.floor(viewerCount * 0.3);
    const giftCount = Math.floor(viewerCount * 0.2);
    const giftValue = parseFloat((giftCount * randomFloat(20, 80)).toFixed(2));
    
    streams.push({
      streamerId,
      title: `直播${streamerId}-${i + 1}`,
      startTime,
      endTime,
      duration,
      viewerCount,
      peakCCU,
      likeCount,
      commentCount,
      shareCount,
      giftCount,
      giftValue,
      status: "ended",
    });
    
    const scoreAudience = parseFloat((viewerCount * 0.4 + likeCount * 0.15).toFixed(2));
    const scoreHost = parseFloat((duration * 0.5 + giftValue * 0.05).toFixed(2));
    
    creatorContributions.push({
      userId: streamerId,
      streamId: streams.length,
      date: startTime,
      streamDuration: duration,
      validStreamDuration: duration,
      streamScore: scoreHost.toString(),
      avgCcu: peakCCU,
      ccuScore: (peakCCU * 0.1).toFixed(2),
      totalScore: (scoreAudience + scoreHost).toFixed(2),
      status: "approved",
    });
  }
}

console.log("  插入直播记录...");
await db.insert(schema.liveStreams).values(streams);
console.log("  插入主播贡献...");
await db.insert(schema.creatorContributions).values(creatorContributions);
console.log("✅ 直播数据完成");

// 3. 生成观众贡献（600人 * 6次 = 3600条）
console.log("\n👥 生成观众贡献...");
const audienceContributions = [];

for (let userId = 1; userId <= 600; userId++) {
  for (let i = 0; i < 6; i++) {
    const randomStream = streams[randomInt(0, streams.length - 1)];
    const watchDuration = randomInt(10, 60);
    const likeCount = randomInt(0, 10);
    const commentCount = randomInt(0, 5);
    const shareCount = randomInt(0, 2);
    const giftCount = randomInt(0, 1);
    const giftValue = giftCount * randomFloat(10, 40, 2);
    
    const score = parseFloat((watchDuration * 0.3 + likeCount * 1.5 + commentCount * 2 + shareCount * 3 + giftValue * 0.08).toFixed(2));
    audienceContributions.push({
      userId,
      date: randomStream.startTime,
      tipAmount: giftValue.toFixed(2),
      tipFee: (giftValue * 0.05).toFixed(2),
      tipScore: (giftValue * 0.1).toFixed(2),
      watchDuration,
      validWatchDuration: Math.min(watchDuration, 240),
      watchScore: (watchDuration * 0.3).toFixed(2),
      chatCount: commentCount,
      validChatCount: commentCount,
      chatScore: (commentCount * 0.2).toFixed(2),
      featuredPostCount: 0,
      featuredPostScore: "0",
      totalScore: score.toFixed(2),
    });
  }
}

await db.insert(schema.audienceContributions).values(audienceContributions);
console.log("✅ 观众贡献完成");

// 4. 生成工单（100条）
console.log("\n🎫 生成工单...");
const tickets = [];
for (let i = 0; i < 100; i++) {
  const createdAt = randomDate(threeWeeksAgo, now);
  const type = ["bug", "feature", "support", "complaint"][randomInt(0, 3)];
  const status = ["open", "in_progress", "resolved", "closed"][randomInt(0, 3)];
  
  const ticketType = ["bug", "suggestion", "info"][randomInt(0, 2)];
  const ticketStatus = ["pending", "approved", "rejected"][randomInt(0, 2)];
  tickets.push({
    userId: randomInt(1, 1000),
    type: ticketType,
    priority: ["p0", "p1", "p2", "p3"][randomInt(0, 3)],
    status: ticketStatus,
    title: `${ticketType}工单#${i + 1}`,
    content: `工单详细描述内容...用户反馈的问题或建议`,
    baseScore: ticketStatus === "approved" ? randomInt(10, 50) : 0,
    finalScore: ticketStatus === "approved" ? randomInt(10, 50) : 0,
    reviewNote: ticketStatus !== "pending" ? "审核备注" : null,
    reviewedBy: ticketStatus !== "pending" ? 1 : null,
    reviewedAt: ticketStatus !== "pending" ? randomDate(createdAt, now) : null,
  });
}

await db.insert(schema.tickets).values(tickets);
console.log("✅ 工单完成");

// 5. 生成交易（300人 * 10笔 = 3000笔）
console.log("\n💰 生成交易...");
const tradeRecords = [];

for (let userId = 1; userId <= 300; userId++) {
  for (let i = 0; i < 10; i++) {
    const createdAt = randomDate(threeWeeksAgo, now);
    const tradeType = ["buy", "sell"][randomInt(0, 1)];
    const tradePair = ["BTC/USDT", "ETH/USDT", "SOL/USDT"][randomInt(0, 2)];
    const amount = randomFloat(0.1, 5, 4);
    const price = randomFloat(1000, 40000, 2);
    const volume = parseFloat((amount * price).toFixed(2));
    const fee = parseFloat((volume * 0.001).toFixed(2));
    const status = Math.random() < 0.95 ? "completed" : "cancelled";
    
    tradeRecords.push({
      userId,
      tradeType,
      tradePair,
      amount,
      price,
      volume,
      fee,
      status,
      isSuspicious: Math.random() < 0.03 ? 1 : 0,
      createdAt,
      completedAt: status === "completed" ? new Date(createdAt.getTime() + 2000) : null,
    });
  }
}

await db.insert(schema.tradeRecords).values(tradeRecords);
console.log("✅ 交易完成");

// 6. 生成积分记录
console.log("\n🎁 生成积分记录...");
const pointsRecords = [];

// P_Genesis (40% = 120,000)
const GENESIS_POINTS = 120000;
for (let userId = 1; userId <= 100; userId++) {
  pointsRecords.push({
    userId,
    type: "genesis",
    subType: "early_adopter",
    amount: parseFloat((GENESIS_POINTS / 100).toFixed(2)),
    description: "早期用户奖励",
    status: "approved",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}

// P_Eco主播 (20% = 60,000)
const CREATOR_POINTS = 60000;
const totalCreatorScore = creatorContributions.reduce((sum, c) => sum + parseFloat(c.totalScore), 0);
for (const contrib of creatorContributions) {
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "live_stream_host",
    amount: parseFloat((CREATOR_POINTS * (parseFloat(contrib.totalScore) / totalCreatorScore)).toFixed(2)),
    description: "直播主播积分",
    status: "approved",
    relatedId: contrib.streamId,
    approvedAt: contrib.date,
    approvedBy: 1,
  });
}

// P_Eco观众 (20% = 60,000)
const AUDIENCE_POINTS = 60000;
const totalAudienceScore = audienceContributions.reduce((sum, c) => sum + parseFloat(c.totalScore), 0);
for (const contrib of audienceContributions) {
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "watch_stream",
    amount: parseFloat((AUDIENCE_POINTS * (parseFloat(contrib.totalScore) / totalAudienceScore)).toFixed(2)),
    description: "观看直播积分",
    status: "approved",
    approvedAt: contrib.date,
    approvedBy: 1,
  });
}

// P_Trade (20% = 60,000)
const TRADE_POINTS = 60000;
const completedTrades = tradeRecords.filter(t => t.status === "completed");
const totalTradeVolume = completedTrades.reduce((sum, t) => sum + t.volume, 0);
for (const trade of completedTrades) {
  pointsRecords.push({
    userId: trade.userId,
    type: "trade",
    subType: "trading",
    amount: parseFloat((TRADE_POINTS * (trade.volume / totalTradeVolume)).toFixed(2)),
    description: "交易积分",
    status: "approved",
    approvedAt: trade.completedAt,
    approvedBy: 1,
  });
}

console.log(`  插入${pointsRecords.length}条积分记录...`);
// 分批插入积分记录
const batchSize = 500;
for (let i = 0; i < pointsRecords.length; i += batchSize) {
  const batch = pointsRecords.slice(i, i + batchSize);
  await db.insert(schema.pointsRecords).values(batch);
  console.log(`  已插入${Math.min(i + batchSize, pointsRecords.length)}/${pointsRecords.length}`);
}
console.log("✅ 积分记录完成");

// 7. 生成结算记录
console.log("\n📊 生成结算记录...");
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
    actualDistributionPoints: week < 3 ? 100000 : null,
    status: week < 3 ? "distributed" : "confirmed",
    createdBy: 1,
    distributedAt: week < 3 ? weekEnd : null,
  });
}

await db.insert(schema.settlements).values(settlements);
console.log("✅ 结算记录完成");

// 8. 生成积分配置
console.log("\n⚙️  生成积分配置...");
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
    genesis: { early_adopter: 1.0 },
    eco: { creator: 0.5, audience: 0.5 },
    trade: { spot: 0.6, futures: 0.4 }
  }),
  status: "active",
  createdBy: 1,
});
console.log("✅ 积分配置完成");

// 9. 生成核心身份
console.log("\n🏆 生成核心身份...");
const coreIdentities = [];
for (let userId = 1; userId <= 30; userId++) {
  coreIdentities.push({
    userId,
    identityType: ["founder", "early_contributor"][randomInt(0, 1)],
    allocationPercent: randomFloat(0.5, 2.0, 2),
    status: "active",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}
await db.insert(schema.coreIdentities).values(coreIdentities);
console.log("✅ 核心身份完成");

// 10. 生成精选内容
console.log("\n⭐ 生成精选内容...");
const featuredContents = [];
for (let i = 0; i < 15; i++) {
  const randomStream = streams[randomInt(0, streams.length - 1)];
  featuredContents.push({
    contentType: "stream",
    contentId: randomStream.streamerId,
    title: randomStream.title,
    description: "精选直播",
    featuredAt: randomDate(threeWeeksAgo, now),
    featuredBy: 1,
    status: "active",
  });
}
await db.insert(schema.featuredContents).values(featuredContents);
console.log("✅ 精选内容完成");

// 统计
const totalGenerated = pointsRecords.reduce((sum, p) => sum + p.amount, 0);
console.log("\n" + "=".repeat(60));
console.log("✨ 数据生成完成！");
console.log("=".repeat(60));
console.log("\n📈 数据统计：");
console.log(`  用户：${users.length}`);
console.log(`  主播：50`);
console.log(`  直播：${streams.length}`);
console.log(`  主播贡献：${creatorContributions.length}`);
console.log(`  观众贡献：${audienceContributions.length}`);
console.log(`  工单：${tickets.length}`);
console.log(`  交易：${tradeRecords.length}`);
console.log(`  积分记录：${pointsRecords.length}`);
console.log(`  结算：${settlements.length}`);
console.log(`  核心身份：${coreIdentities.length}`);
console.log(`  精选内容：${featuredContents.length}`);
console.log(`\n💰 积分统计：`);
console.log(`  总积分：${TOTAL_POINTS.toLocaleString()}`);
console.log(`  实际发放：${totalGenerated.toFixed(2)}`);
console.log(`  P_Genesis：120,000 (40%)`);
console.log(`  P_Eco：120,000 (40%)`);
console.log(`  P_Trade：60,000 (20%)`);

await connection.end();
