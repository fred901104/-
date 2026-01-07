import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 开始生成真实场景数据...");
console.log("📊 场景设定：每周10万积分 | 3周周期 | 真实用户行为模拟\n");

// ==================== 配置参数 ====================
const WEEKS = 3;
const POINTS_PER_WEEK = 100000;
const TOTAL_POINTS = POINTS_PER_WEEK * WEEKS; // 30万积分

// 积分池分配比例
const POOL_RATIOS = {
  genesis: 0.40,  // 40% = 12万
  eco: 0.40,      // 40% = 12万  
  trade: 0.20,    // 20% = 6万
};

// P_Eco池内分配
const ECO_RATIOS = {
  creator: 0.50,   // 50%给主播
  audience: 0.50,  // 50%给观众
};

// 时间范围
const now = new Date();
const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

// ==================== 辅助函数 ====================
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function normalRandom(mean, stdDev) {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, num * stdDev + mean);
}

// ==================== 1. 生成用户 ====================
console.log("👥 生成用户数据...");

// 根据积分发放量估算用户数
// 假设平均每人每周获得50积分，需要2000活跃用户
const ACTIVE_USERS = 2500;
const TOTAL_USERS = 3000; // 包含不活跃用户

const users = [];
for (let i = 1; i <= TOTAL_USERS; i++) {
  const createdAt = randomDate(threeWeeksAgo, now);
  users.push({
    openId: `user_${i}_${Date.now()}_${randomInt(1000, 9999)}`,
    name: `用户${i}`,
    email: `user${i}@soalpha.com`,
    loginMethod: ["email", "wechat", "phone"][randomInt(0, 2)],
    role: "user",
    isBlacklisted: 0,
    createdAt,
    lastSignedIn: randomDate(createdAt, now),
  });
}

await db.insert(schema.users).values(users);
console.log(`✅ 已生成 ${users.length} 个用户`);

// ==================== 2. 生成直播数据 ====================
console.log("\n📺 生成直播数据...");

const STREAMERS = 60; // 60个主播
const STREAMS_PER_STREAMER = 10; // 每人3周内直播10次

const streams = [];
const creatorContributions = [];

// P_Eco池中主播部分的总积分
const CREATOR_TOTAL_POINTS = TOTAL_POINTS * POOL_RATIOS.eco * ECO_RATIOS.creator; // 6万

for (let streamerId = 1; streamerId <= STREAMERS; streamerId++) {
  for (let i = 0; i < STREAMS_PER_STREAMER; i++) {
    const startTime = randomDate(threeWeeksAgo, now);
    const duration = randomInt(60, 180); // 60-180分钟
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    const viewerCount = Math.floor(normalRandom(200, 80));
    const peakCCU = Math.floor(viewerCount * randomFloat(0.6, 0.9));
    
    const likeCount = Math.floor(viewerCount * randomFloat(3, 8));
    const commentCount = Math.floor(viewerCount * randomFloat(1, 3));
    const shareCount = Math.floor(viewerCount * randomFloat(0.2, 0.6));
    const giftCount = Math.floor(viewerCount * randomFloat(0.1, 0.4));
    const giftValue = parseFloat((giftCount * randomFloat(20, 100)).toFixed(2));
    
    const stream = {
      streamerId,
      title: `直播间${streamerId}_第${i + 1}场`,
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
    };
    
    streams.push(stream);
    
    // 计算主播得分（基于时长和互动）
    const baseScore = duration * 0.5 + viewerCount * 0.3 + giftValue * 0.05;
    const scoreAudience = parseFloat((viewerCount * 0.4 + likeCount * 0.15 + commentCount * 0.25).toFixed(2));
    const scoreHost = parseFloat(baseScore.toFixed(2));
    const totalScore = parseFloat((scoreAudience + scoreHost).toFixed(2));
    
    // CCU采样
    const ccuSamples = [];
    const sampleCount = Math.floor(duration / 1.5);
    for (let j = 0; j < sampleCount; j++) {
      const sampleTime = new Date(startTime.getTime() + j * 90 * 1000);
      const ccu = Math.floor(peakCCU * (0.7 + Math.random() * 0.3));
      ccuSamples.push({ time: sampleTime.toISOString(), ccu });
    }
    
    creatorContributions.push({
      userId: streamerId,
      streamId: streams.length,
      contributionDate: startTime,
      scoreAudience,
      scoreHost,
      totalScore,
      viewerCount,
      peakCCU,
      duration,
      likeCount,
      commentCount,
      shareCount,
      giftCount,
      giftValue,
      ccuSamples: JSON.stringify(ccuSamples),
      status: "approved",
      approvedAt: endTime,
      approvedBy: 1,
    });
  }
}

await db.insert(schema.liveStreams).values(streams);
console.log(`✅ 已生成 ${streams.length} 条直播记录`);

await db.insert(schema.creatorContributions).values(creatorContributions);
console.log(`✅ 已生成 ${creatorContributions.length} 条主播贡献记录`);

// ==================== 3. 生成观众贡献数据 ====================
console.log("\n👥 生成观众贡献数据...");

const audienceContributions = [];
const AUDIENCE_TOTAL_POINTS = TOTAL_POINTS * POOL_RATIOS.eco * ECO_RATIOS.audience; // 6万

// 80%的用户会观看直播
const AUDIENCE_COUNT = Math.floor(ACTIVE_USERS * 0.8);

for (let userId = 1; userId <= AUDIENCE_COUNT; userId++) {
  const participationCount = Math.floor(normalRandom(8, 4)); // 平均8次观看
  
  for (let i = 0; i < participationCount; i++) {
    const randomStream = streams[randomInt(0, streams.length - 1)];
    const watchDuration = randomInt(10, Math.min(randomStream.duration, 120));
    const likeCount = randomInt(0, 15);
    const commentCount = randomInt(0, 8);
    const shareCount = randomInt(0, 3);
    const giftCount = randomInt(0, 2);
    const giftValue = parseFloat((giftCount * randomFloat(10, 50)).toFixed(2));
    
    const score = parseFloat((
      watchDuration * 0.3 +
      likeCount * 1.5 +
      commentCount * 2 +
      shareCount * 3 +
      giftValue * 0.08
    ).toFixed(2));
    
    audienceContributions.push({
      userId,
      streamId: randomStream.streamerId,
      contributionDate: randomStream.startTime,
      score,
      watchDuration,
      likeCount,
      commentCount,
      shareCount,
      giftCount,
      giftValue,
      status: "approved",
      approvedAt: randomStream.endTime,
      approvedBy: 1,
    });
  }
}

await db.insert(schema.audienceContributions).values(audienceContributions);
console.log(`✅ 已生成 ${audienceContributions.length} 条观众贡献记录`);

// ==================== 4. 生成工单数据 ====================
console.log("\n🎫 生成工单数据...");

const tickets = [];
const TICKET_USERS = Math.floor(ACTIVE_USERS * 0.15); // 15%用户提交工单

for (let i = 0; i < TICKET_USERS; i++) {
  const userId = randomInt(1, TOTAL_USERS);
  const ticketCount = randomInt(1, 2);
  
  for (let j = 0; j < ticketCount; j++) {
    const createdAt = randomDate(threeWeeksAgo, now);
    const type = ["bug", "feature", "support", "complaint"][randomInt(0, 3)];
    const priority = ["low", "medium", "high", "critical"][randomInt(0, 3)];
    const status = ["open", "in_progress", "resolved", "closed"][randomInt(0, 3)];
    
    tickets.push({
      userId,
      type,
      priority,
      status,
      title: `${type === "bug" ? "Bug反馈" : type === "feature" ? "功能建议" : type === "support" ? "技术支持" : "投诉"}#${i * ticketCount + j + 1}`,
      description: `详细描述内容...`,
      info: JSON.stringify({ 
        browser: ["Chrome", "Firefox", "Safari"][randomInt(0, 2)], 
        os: ["Windows", "macOS", "Linux"][randomInt(0, 2)] 
      }),
      createdAt,
      resolvedAt: status === "resolved" || status === "closed" ? randomDate(createdAt, now) : null,
      resolvedBy: status === "resolved" || status === "closed" ? randomInt(1, 10) : null,
    });
  }
}

await db.insert(schema.tickets).values(tickets);
console.log(`✅ 已生成 ${tickets.length} 条工单记录`);

// ==================== 5. 生成交易数据 ====================
console.log("\n💰 生成交易数据...");

const tradeRecords = [];
const TRADE_TOTAL_POINTS = TOTAL_POINTS * POOL_RATIOS.trade; // 6万
const TRADER_COUNT = Math.floor(ACTIVE_USERS * 0.4); // 40%用户交易

for (let userId = 1; userId <= TRADER_COUNT; userId++) {
  const tradeCount = Math.floor(normalRandom(12, 6)); // 平均12笔交易
  
  for (let i = 0; i < tradeCount; i++) {
    const createdAt = randomDate(threeWeeksAgo, now);
    const tradeType = ["buy", "sell"][randomInt(0, 1)];
    const tradePair = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"][randomInt(0, 3)];
    const amount = randomFloat(0.1, 10, 4);
    const price = randomFloat(100, 50000, 2);
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
      completedAt: status === "completed" ? new Date(createdAt.getTime() + randomInt(1000, 5000)) : null,
    });
  }
}

await db.insert(schema.tradeRecords).values(tradeRecords);
console.log(`✅ 已生成 ${tradeRecords.length} 条交易记录`);

// ==================== 6. 生成积分记录 ====================
console.log("\n🎁 生成积分记录...");

const pointsRecords = [];

// 6.1 P_Genesis积分（创世池）- 12万积分
console.log("  - 生成P_Genesis积分...");
const GENESIS_POINTS = TOTAL_POINTS * POOL_RATIOS.genesis;
const GENESIS_USERS = 100; // 前100名早期用户

for (let userId = 1; userId <= GENESIS_USERS; userId++) {
  const amount = parseFloat((GENESIS_POINTS / GENESIS_USERS).toFixed(2));
  pointsRecords.push({
    userId,
    type: "genesis",
    subType: "early_adopter",
    amount,
    description: `早期用户奖励`,
    status: "approved",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}

// 6.2 P_Eco积分（生态池）- 12万积分
console.log("  - 生成P_Eco积分（主播）...");
// 主播积分：按贡献度分配
const totalCreatorScore = creatorContributions.reduce((sum, c) => sum + c.totalScore, 0);
for (const contrib of creatorContributions) {
  const amount = parseFloat((CREATOR_TOTAL_POINTS * (contrib.totalScore / totalCreatorScore)).toFixed(2));
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "live_stream_host",
    amount,
    description: `直播主播积分`,
    status: "approved",
    relatedId: contrib.streamId,
    approvedAt: contrib.approvedAt,
    approvedBy: contrib.approvedBy,
  });
}

console.log("  - 生成P_Eco积分（观众）...");
// 观众积分：按贡献度分配
const totalAudienceScore = audienceContributions.reduce((sum, c) => sum + c.score, 0);
for (const contrib of audienceContributions) {
  const amount = parseFloat((AUDIENCE_TOTAL_POINTS * (contrib.score / totalAudienceScore)).toFixed(2));
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "watch_stream",
    amount,
    description: `观看直播积分`,
    status: "approved",
    relatedId: contrib.streamId,
    approvedAt: contrib.approvedAt,
    approvedBy: contrib.approvedBy,
  });
}

// 6.3 P_Trade积分（交易池）- 6万积分
console.log("  - 生成P_Trade积分...");
const completedTrades = tradeRecords.filter(t => t.status === "completed");
const totalTradeVolume = completedTrades.reduce((sum, t) => sum + t.volume, 0);

for (const trade of completedTrades) {
  const amount = parseFloat((TRADE_TOTAL_POINTS * (trade.volume / totalTradeVolume)).toFixed(2));
  pointsRecords.push({
    userId: trade.userId,
    type: "trade",
    subType: "trading",
    amount,
    description: `交易积分奖励`,
    status: "approved",
    approvedAt: trade.completedAt,
    approvedBy: 1,
  });
}

await db.insert(schema.pointsRecords).values(pointsRecords);
console.log(`✅ 已生成 ${pointsRecords.length} 条积分记录`);

// 验证总积分
const totalGenerated = pointsRecords.reduce((sum, p) => sum + p.amount, 0);
console.log(`\n📊 积分发放验证：`);
console.log(`  - 目标总积分：${TOTAL_POINTS.toFixed(2)}`);
console.log(`  - 实际发放：${totalGenerated.toFixed(2)}`);
console.log(`  - 差异：${Math.abs(TOTAL_POINTS - totalGenerated).toFixed(2)}`);

// ==================== 7. 生成结算记录 ====================
console.log("\n📊 生成结算记录...");

const settlements = [];
for (let week = 1; week <= WEEKS; week++) {
  const weekStart = new Date(threeWeeksAgo.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const totalPoints = POINTS_PER_WEEK;
  const genesisPoints = parseFloat((totalPoints * POOL_RATIOS.genesis).toFixed(2));
  const ecoPoints = parseFloat((totalPoints * POOL_RATIOS.eco).toFixed(2));
  const tradePoints = parseFloat((totalPoints * POOL_RATIOS.trade).toFixed(2));
  
  settlements.push({
    weekNumber: week,
    year: 2026,
    startDate: weekStart,
    endDate: weekEnd,
    totalPoints,
    genesisPoints,
    ecoPoints,
    tradePoints,
    preDistributionPoints: totalPoints,
    actualDistributionPoints: week < WEEKS ? totalPoints : null,
    status: week < WEEKS ? "distributed" : "confirmed",
    createdBy: 1,
    distributedAt: week < WEEKS ? weekEnd : null,
  });
}

await db.insert(schema.settlements).values(settlements);
console.log(`✅ 已生成 ${settlements.length} 条结算记录`);

// ==================== 8. 生成积分配置 ====================
console.log("\n⚙️  生成积分配置...");

const pointsConfig = {
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
};

await db.insert(schema.pointsConfigs).values(pointsConfig);
console.log(`✅ 已生成积分配置`);

// ==================== 9. 生成核心身份 ====================
console.log("\n🏆 生成核心身份...");

const coreIdentities = [];
for (let userId = 1; userId <= 50; userId++) {
  coreIdentities.push({
    userId,
    identityType: ["founder", "early_contributor", "key_partner"][randomInt(0, 2)],
    allocationPercent: randomFloat(0.5, 2.0, 2),
    status: "active",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}

await db.insert(schema.coreIdentities).values(coreIdentities);
console.log(`✅ 已生成 ${coreIdentities.length} 条核心身份记录`);

// ==================== 10. 生成精选内容 ====================
console.log("\n⭐ 生成精选内容...");

const featuredContents = [];
for (let i = 0; i < 20; i++) {
  const randomStream = streams[randomInt(0, streams.length - 1)];
  featuredContents.push({
    contentType: "stream",
    contentId: randomStream.streamerId,
    title: randomStream.title,
    description: `精选直播内容`,
    featuredAt: randomDate(threeWeeksAgo, now),
    featuredBy: 1,
    status: "active",
  });
}

await db.insert(schema.featuredContents).values(featuredContents);
console.log(`✅ 已生成 ${featuredContents.length} 条精选内容记录`);

// ==================== 最终统计 ====================
console.log("\n" + "=".repeat(60));
console.log("✨ 真实场景数据生成完成！");
console.log("=".repeat(60));
console.log("\n📈 数据统计：");
console.log(`  - 总用户数：${users.length}`);
console.log(`  - 活跃用户：${ACTIVE_USERS}`);
console.log(`  - 主播数量：${STREAMERS}`);
console.log(`  - 直播场次：${streams.length}`);
console.log(`  - 主播贡献：${creatorContributions.length}`);
console.log(`  - 观众贡献：${audienceContributions.length}`);
console.log(`  - 工单数量：${tickets.length}`);
console.log(`  - 交易记录：${tradeRecords.length}`);
console.log(`  - 积分记录：${pointsRecords.length}`);
console.log(`  - 结算记录：${settlements.length}`);
console.log(`  - 核心身份：${coreIdentities.length}`);
console.log(`  - 精选内容：${featuredContents.length}`);

console.log("\n💰 积分发放统计：");
console.log(`  - 总积分：${TOTAL_POINTS.toLocaleString()}`);
console.log(`  - P_Genesis：${(TOTAL_POINTS * POOL_RATIOS.genesis).toLocaleString()} (${(POOL_RATIOS.genesis * 100).toFixed(0)}%)`);
console.log(`  - P_Eco：${(TOTAL_POINTS * POOL_RATIOS.eco).toLocaleString()} (${(POOL_RATIOS.eco * 100).toFixed(0)}%)`);
console.log(`  - P_Trade：${(TOTAL_POINTS * POOL_RATIOS.trade).toLocaleString()} (${(POOL_RATIOS.trade * 100).toFixed(0)}%)`);
console.log(`  - 每周发放：${POINTS_PER_WEEK.toLocaleString()}`);
console.log(`  - 周期：${WEEKS}周`);

await connection.end();
