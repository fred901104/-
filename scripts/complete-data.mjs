import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 补充完整数据...\n");

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

// 1. 补充交易数据（如果还没完成）
console.log("💰 补充交易数据...");
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

try {
  await db.insert(schema.tradeRecords).values(tradeRecords);
  console.log(`✅ 交易数据完成: ${tradeRecords.length}条`);
} catch (e) {
  console.log("⚠️  交易数据可能已存在，跳过");
}

// 2. 生成积分记录
console.log("\n🎁 生成积分记录...");
const pointsRecords = [];

// 获取已有数据
const [users, creatorContribs, audienceContribs, allTrades] = await Promise.all([
  db.select().from(schema.users).limit(100),
  db.select().from(schema.creatorContributions),
  db.select().from(schema.audienceContributions),
  db.select().from(schema.tradeRecords),
]);

const completedTrades = allTrades.filter(t => t.status === "completed");

// P_Genesis (40% = 120,000)
const GENESIS_POINTS = 120000;
for (const user of users) {
  pointsRecords.push({
    userId: user.id,
    type: "genesis",
    subType: "early_adopter",
    amount: parseFloat((GENESIS_POINTS / users.length).toFixed(2)),
    description: "早期用户奖励",
    status: "approved",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}

// P_Eco主播 (20% = 60,000)
const CREATOR_POINTS = 60000;
const totalCreatorScore = creatorContribs.reduce((sum, c) => sum + parseFloat(c.totalScore || 0), 0);
if (totalCreatorScore > 0) {
  for (const contrib of creatorContribs) {
    const score = parseFloat(contrib.totalScore || 0);
    if (score > 0) {
      pointsRecords.push({
        userId: contrib.userId,
        type: "eco",
        subType: "live_stream_host",
        amount: parseFloat((CREATOR_POINTS * (score / totalCreatorScore)).toFixed(2)),
        description: "直播主播积分",
        status: "approved",
        relatedId: contrib.streamId,
        approvedAt: contrib.date,
        approvedBy: 1,
      });
    }
  }
}

// P_Eco观众 (20% = 60,000)
const AUDIENCE_POINTS = 60000;
const totalAudienceScore = audienceContribs.reduce((sum, c) => sum + parseFloat(c.totalScore || 0), 0);
if (totalAudienceScore > 0) {
  for (const contrib of audienceContribs) {
    const score = parseFloat(contrib.totalScore || 0);
    if (score > 0) {
      pointsRecords.push({
        userId: contrib.userId,
        type: "eco",
        subType: "watch_stream",
        amount: parseFloat((AUDIENCE_POINTS * (score / totalAudienceScore)).toFixed(2)),
        description: "观看直播积分",
        status: "approved",
        approvedAt: contrib.date,
        approvedBy: 1,
      });
    }
  }
}

// P_Trade (20% = 60,000)
const TRADE_POINTS = 60000;
const totalTradeVolume = completedTrades.reduce((sum, t) => sum + parseFloat(t.volume || 0), 0);
if (totalTradeVolume > 0) {
  for (const trade of completedTrades) {
    const volume = parseFloat(trade.volume || 0);
    if (volume > 0) {
      pointsRecords.push({
        userId: trade.userId,
        type: "trade",
        subType: "trading",
        amount: parseFloat((TRADE_POINTS * (volume / totalTradeVolume)).toFixed(2)),
        description: "交易积分",
        status: "approved",
        approvedAt: trade.completedAt,
        approvedBy: 1,
      });
    }
  }
}

console.log(`  准备插入${pointsRecords.length}条积分记录...`);
const batchSize = 500;
for (let i = 0; i < pointsRecords.length; i += batchSize) {
  const batch = pointsRecords.slice(i, i + batchSize);
  try {
    await db.insert(schema.pointsRecords).values(batch);
    console.log(`  已插入${Math.min(i + batchSize, pointsRecords.length)}/${pointsRecords.length}`);
  } catch (e) {
    console.log(`  批次${i}插入失败，跳过`);
  }
}
console.log("✅ 积分记录完成");

// 3. 生成结算记录
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

try {
  await db.insert(schema.settlements).values(settlements);
  console.log("✅ 结算记录完成");
} catch (e) {
  console.log("⚠️  结算记录可能已存在，跳过");
}

// 4. 生成积分配置
console.log("\n⚙️  生成积分配置...");
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
      genesis: { early_adopter: 1.0 },
      eco: { creator: 0.5, audience: 0.5 },
      trade: { spot: 0.6, futures: 0.4 }
    }),
    status: "active",
    createdBy: 1,
  });
  console.log("✅ 积分配置完成");
} catch (e) {
  console.log("⚠️  积分配置可能已存在，跳过");
}

// 5. 生成核心身份
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

try {
  await db.insert(schema.coreIdentities).values(coreIdentities);
  console.log("✅ 核心身份完成");
} catch (e) {
  console.log("⚠️  核心身份可能已存在，跳过");
}

// 6. 生成精选内容
console.log("\n⭐ 生成精选内容...");
const streams = await db.select().from(schema.liveStreams).limit(15);
const featuredContents = [];
for (const stream of streams) {
  featuredContents.push({
    contentType: "stream",
    contentId: stream.id,
    title: stream.title || `直播${stream.id}`,
    description: "精选直播",
    featuredAt: randomDate(threeWeeksAgo, now),
    featuredBy: 1,
    status: "active",
  });
}

try {
  await db.insert(schema.featuredContents).values(featuredContents);
  console.log("✅ 精选内容完成");
} catch (e) {
  console.log("⚠️  精选内容可能已存在，跳过");
}

// 最终统计
console.log("\n" + "=".repeat(60));
console.log("✨ 数据补充完成！");
console.log("=".repeat(60));

const totalGenerated = pointsRecords.reduce((sum, p) => sum + p.amount, 0);
console.log(`\n💰 积分统计：`);
console.log(`  总积分：300,000`);
console.log(`  实际发放：${totalGenerated.toFixed(2)}`);
console.log(`  P_Genesis：120,000 (40%)`);
console.log(`  P_Eco：120,000 (40%)`);
console.log(`  P_Trade：60,000 (20%)`);

await connection.end();
