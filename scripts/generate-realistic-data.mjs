import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("🚀 开始生成真实业务数据...");
console.log("📊 数据规模：3周周期 | 50-100主播 | 5000用户");

// 时间范围：最近3周
const now = new Date();
const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

// 辅助函数：生成随机日期
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 辅助函数：生成随机整数
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 辅助函数：生成随机浮点数
function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// 辅助函数：生成正态分布随机数
function normalRandom(mean, stdDev) {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

// 1. 生成5000个用户
console.log("\n📝 生成5000个用户...");
const users = [];
for (let i = 1; i <= 5000; i++) {
  const createdAt = randomDate(threeWeeksAgo, now);
  users.push({
    openId: `user_${i}_${Date.now()}`,
    name: `用户${i}`,
    email: `user${i}@example.com`,
    loginMethod: ["email", "wechat", "phone"][randomInt(0, 2)],
    role: i <= 10 ? "admin" : "user",
    isBlacklisted: Math.random() < 0.02 ? 1 : 0, // 2%黑名单
    blacklistReason: Math.random() < 0.02 ? "违规刷量" : null,
    blacklistedAt: Math.random() < 0.02 ? createdAt : null,
    blacklistedBy: Math.random() < 0.02 ? 1 : null,
    createdAt,
    lastSignedIn: randomDate(createdAt, now),
  });
}

await db.insert(schema.users).values(users);
console.log(`✅ 已生成 ${users.length} 个用户`);

// 2. 生成50-100个主播的直播记录（3周内）
console.log("\n📺 生成直播记录...");
const streamerCount = randomInt(50, 100);
const streams = [];
const creatorContributions = [];

for (let streamerId = 1; streamerId <= streamerCount; streamerId++) {
  // 每个主播在3周内进行5-15次直播
  const streamCount = randomInt(5, 15);
  
  for (let i = 0; i < streamCount; i++) {
    const startTime = randomDate(threeWeeksAgo, now);
    const duration = randomInt(30, 180); // 30-180分钟
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    // 观众数量：正态分布，均值500，标准差200
    const viewerCount = Math.max(10, Math.floor(normalRandom(500, 200)));
    const peakCCU = Math.floor(viewerCount * randomFloat(0.6, 0.9));
    
    // 互动数据
    const likeCount = Math.floor(viewerCount * randomFloat(2, 8));
    const commentCount = Math.floor(viewerCount * randomFloat(0.5, 2));
    const shareCount = Math.floor(viewerCount * randomFloat(0.1, 0.5));
    const giftCount = Math.floor(viewerCount * randomFloat(0.05, 0.3));
    const giftValue = parseFloat((giftCount * randomFloat(10, 100)).toFixed(2));
    
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
    
    // 生成主播贡献记录
    const scoreAudience = parseFloat((viewerCount * 0.5 + likeCount * 0.2 + commentCount * 0.3).toFixed(2));
    const scoreHost = parseFloat((duration * 0.8 + giftValue * 0.1).toFixed(2));
    const ccuSamples = [];
    
    // 生成CCU采样数据（每90秒一个采样点）
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
      totalScore: parseFloat((scoreAudience + scoreHost).toFixed(2)),
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
console.log(`✅ 已生成 ${streams.length} 条直播记录（${streamerCount}个主播）`);

await db.insert(schema.creatorContributions).values(creatorContributions);
console.log(`✅ 已生成 ${creatorContributions.length} 条主播贡献记录`);

// 3. 生成观众贡献记录（5000用户参与）
console.log("\n👥 生成观众贡献记录...");
const audienceContributions = [];

for (let userId = 1; userId <= 5000; userId++) {
  // 每个用户参与0-20次直播观看
  const participationCount = Math.floor(Math.abs(normalRandom(8, 5)));
  
  for (let i = 0; i < participationCount; i++) {
    const randomStream = streams[randomInt(0, streams.length - 1)];
    const watchDuration = randomInt(5, randomStream.duration);
    const likeCount = randomInt(0, 10);
    const commentCount = randomInt(0, 5);
    const shareCount = randomInt(0, 2);
    const giftCount = randomInt(0, 3);
    const giftValue = parseFloat((giftCount * randomFloat(5, 50)).toFixed(2));
    
    const score = parseFloat((
      watchDuration * 0.5 +
      likeCount * 2 +
      commentCount * 3 +
      shareCount * 5 +
      giftValue * 0.1
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

// 4. 生成工单记录
console.log("\n🎫 生成工单记录...");
const tickets = [];

for (let userId = 1; userId <= 5000; userId++) {
  // 10%的用户会提交工单
  if (Math.random() < 0.1) {
    const ticketCount = randomInt(1, 3);
    
    for (let i = 0; i < ticketCount; i++) {
      const createdAt = randomDate(threeWeeksAgo, now);
      const type = ["bug", "feature", "support", "complaint"][randomInt(0, 3)];
      const priority = ["low", "medium", "high", "critical"][randomInt(0, 3)];
      const status = ["open", "in_progress", "resolved", "closed"][randomInt(0, 3)];
      
      tickets.push({
        userId,
        type,
        priority,
        status,
        title: `工单标题_${userId}_${i + 1}`,
        description: `工单详细描述内容...`,
        info: JSON.stringify({ browser: "Chrome", os: "Windows" }),
        createdAt,
        resolvedAt: status === "resolved" || status === "closed" ? randomDate(createdAt, now) : null,
        resolvedBy: status === "resolved" || status === "closed" ? randomInt(1, 10) : null,
      });
    }
  }
}

await db.insert(schema.tickets).values(tickets);
console.log(`✅ 已生成 ${tickets.length} 条工单记录`);

// 5. 生成交易记录
console.log("\n💰 生成交易记录...");
const tradeRecords = [];

for (let userId = 1; userId <= 5000; userId++) {
  // 30%的用户会进行交易
  if (Math.random() < 0.3) {
    const tradeCount = randomInt(1, 10);
    
    for (let i = 0; i < tradeCount; i++) {
      const createdAt = randomDate(threeWeeksAgo, now);
      const tradeType = ["buy", "sell"][randomInt(0, 1)];
      const tradePair = ["BTC/USDT", "ETH/USDT", "SOL/USDT"][randomInt(0, 2)];
      const amount = randomFloat(100, 10000, 2);
      const price = randomFloat(0.1, 100, 2);
      const volume = parseFloat((amount * price).toFixed(2));
      const fee = parseFloat((volume * 0.001).toFixed(2));
      const status = ["completed", "pending", "cancelled"][randomInt(0, 2)];
      
      tradeRecords.push({
        userId,
        tradeType,
        tradePair,
        amount,
        price,
        volume,
        fee,
        status,
        isSuspicious: Math.random() < 0.05 ? 1 : 0, // 5%可疑交易
        createdAt,
        completedAt: status === "completed" ? randomDate(createdAt, now) : null,
      });
    }
  }
}

await db.insert(schema.tradeRecords).values(tradeRecords);
console.log(`✅ 已生成 ${tradeRecords.length} 条交易记录`);

// 6. 生成积分记录
console.log("\n🎁 生成积分记录...");
const pointsRecords = [];

// 为所有贡献生成积分记录
for (const contrib of creatorContributions) {
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "live_stream",
    amount: contrib.totalScore,
    description: `直播贡献积分`,
    status: "approved",
    relatedId: contrib.streamId,
    approvedAt: contrib.approvedAt,
    approvedBy: contrib.approvedBy,
  });
}

for (const contrib of audienceContributions) {
  pointsRecords.push({
    userId: contrib.userId,
    type: "eco",
    subType: "watch_stream",
    amount: contrib.score,
    description: `观看直播积分`,
    status: "approved",
    relatedId: contrib.streamId,
    approvedAt: contrib.approvedAt,
    approvedBy: contrib.approvedBy,
  });
}

// 为部分交易生成积分
for (const trade of tradeRecords) {
  if (trade.status === "completed" && Math.random() < 0.8) {
    pointsRecords.push({
      userId: trade.userId,
      type: "trade",
      subType: "trading",
      amount: parseFloat((trade.volume * 0.01).toFixed(2)),
      description: `交易积分奖励`,
      status: "approved",
      relatedId: trade.id,
      approvedAt: trade.completedAt,
      approvedBy: 1,
    });
  }
}

// 创世池积分（前100名用户）
for (let userId = 1; userId <= 100; userId++) {
  pointsRecords.push({
    userId,
    type: "genesis",
    subType: "early_adopter",
    amount: randomFloat(100, 500, 2),
    description: `早期用户奖励`,
    status: "approved",
    approvedAt: threeWeeksAgo,
    approvedBy: 1,
  });
}

await db.insert(schema.pointsRecords).values(pointsRecords);
console.log(`✅ 已生成 ${pointsRecords.length} 条积分记录`);

// 7. 生成结算记录（3周）
console.log("\n📊 生成结算记录...");
const settlements = [];

for (let week = 1; week <= 3; week++) {
  const weekStart = new Date(threeWeeksAgo.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const totalPoints = randomFloat(50000, 100000, 2);
  const genesisPoints = parseFloat((totalPoints * 0.4).toFixed(2));
  const ecoPoints = parseFloat((totalPoints * 0.4).toFixed(2));
  const tradePoints = parseFloat((totalPoints * 0.2).toFixed(2));
  
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
    actualDistributionPoints: week < 3 ? totalPoints : null,
    status: week < 3 ? "distributed" : "confirmed",
    createdBy: 1,
    distributedAt: week < 3 ? weekEnd : null,
  });
}

await db.insert(schema.settlements).values(settlements);
console.log(`✅ 已生成 ${settlements.length} 条结算记录`);

// 8. 生成核心身份记录
console.log("\n🏆 生成核心身份记录...");
const coreIdentities = [];

// 前50个用户为核心用户
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

// 9. 生成精选内容记录
console.log("\n⭐ 生成精选内容记录...");
const featuredContents = [];

for (let i = 0; i < 30; i++) {
  const randomStream = streams[randomInt(0, streams.length - 1)];
  featuredContents.push({
    contentType: "stream",
    contentId: randomStream.streamerId,
    title: randomStream.title,
    description: `精选直播内容描述`,
    featuredAt: randomDate(threeWeeksAgo, now),
    featuredBy: randomInt(1, 10),
    status: "active",
  });
}

await db.insert(schema.featuredContents).values(featuredContents);
console.log(`✅ 已生成 ${featuredContents.length} 条精选内容记录`);

console.log("\n✨ 真实业务数据生成完成！");
console.log("\n📈 数据统计：");
console.log(`- 用户数：${users.length}`);
console.log(`- 主播数：${streamerCount}`);
console.log(`- 直播记录：${streams.length}`);
console.log(`- 主播贡献：${creatorContributions.length}`);
console.log(`- 观众贡献：${audienceContributions.length}`);
console.log(`- 工单记录：${tickets.length}`);
console.log(`- 交易记录：${tradeRecords.length}`);
console.log(`- 积分记录：${pointsRecords.length}`);
console.log(`- 结算记录：${settlements.length}`);
console.log(`- 核心身份：${coreIdentities.length}`);
console.log(`- 精选内容：${featuredContents.length}`);

await connection.end();
