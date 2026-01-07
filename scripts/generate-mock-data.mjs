import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// S0 Alpha配置
const S0_CONFIG = {
  totalTokens: 10_000_000_000, // 10B
  pointsPoolPercent: 10, // 10%
  phaseReleasePercent: 2, // 2%
  weekCount: 12,
  dynamicPoolPercent: 70,
  genesisPoolPercent: 30,
  pGenesisPercent: 40,
  pEcoPercent: 40,
  pTradePercent: 20,
};

// 计算总积分池
const totalPointsPool = S0_CONFIG.totalTokens * (S0_CONFIG.pointsPoolPercent / 100);
const s0ReleasePoints = totalPointsPool * (S0_CONFIG.phaseReleasePercent / 100);
const dynamicPool = s0ReleasePoints * (S0_CONFIG.dynamicPoolPercent / 100);
const genesisPool = s0ReleasePoints * (S0_CONFIG.genesisPoolPercent / 100);

console.log(`=== SO Alpha 积分配置 ===`);
console.log(`总代币量: ${S0_CONFIG.totalTokens.toLocaleString()}`);
console.log(`积分池总量: ${totalPointsPool.toLocaleString()}`);
console.log(`S0释放总量: ${s0ReleasePoints.toLocaleString()}`);
console.log(`动态池: ${dynamicPool.toLocaleString()}`);
console.log(`创世池: ${genesisPool.toLocaleString()}`);
console.log();

// 生成随机数
const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));
const randomChoice = (arr) => arr[randomInt(0, arr.length)];

// 生成用户名
const generateUsername = (index) => {
  const prefixes = ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta"];
  const suffixes = ["Trader", "Whale", "Builder", "Hunter", "Master", "Pro", "King"];
  return `${randomChoice(prefixes)}${randomChoice(suffixes)}${index}`;
};

// 生成邮箱
const generateEmail = (username) => {
  const domains = ["gmail.com", "outlook.com", "proton.me", "crypto.com"];
  return `${username.toLowerCase()}@${randomChoice(domains)}`;
};

// 主函数
async function generateMockData() {
  console.log("开始生成10000用户模拟数据...\n");

  const startDate = new Date("2026-01-01");
  const endDate = new Date();
  const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

  // 1. 生成用户
  console.log("1/7 生成用户数据...");
  const users = [];
  const userBatch = [];
  
  for (let i = 1; i <= 10000; i++) {
    const username = generateUsername(i);
    const user = {
      openId: `mock_user_${i}_${Date.now()}`,
      name: username,
      email: generateEmail(username),
      loginMethod: randomChoice(["google", "twitter", "email", "wallet"]),
      role: i <= 10 ? "admin" : "user",
      createdAt: new Date(startDate.getTime() + randomInt(0, daysDiff) * 24 * 60 * 60 * 1000),
      lastSignedIn: new Date(),
    };
    users.push(user);
    userBatch.push(user);

    if (userBatch.length === 100) {
      await db.insert(schema.users).values(userBatch);
      userBatch.length = 0;
      process.stdout.write(`\r  已生成 ${i}/10000 用户`);
    }
  }
  
  if (userBatch.length > 0) {
    await db.insert(schema.users).values(userBatch);
  }
  console.log("\n  ✓ 用户数据生成完成\n");

  // 获取所有用户ID
  const allUsers = await db.select({ id: schema.users.id }).from(schema.users);
  const userIds = allUsers.map(u => u.id);

  // 2. 生成工单数据 (P_Genesis)
  console.log("2/7 生成工单数据...");
  const tickets = [];
  const ticketCount = randomInt(500, 1000);
  
  for (let i = 0; i < ticketCount; i++) {
    const userId = randomChoice(userIds);
    const type = randomChoice(["bug", "suggestion", "critical_info"]);
    const priority = randomChoice(["p0", "p1", "p2", "p3"]);
    const status = randomChoice(["pending", "approved", "rejected"]);
    
    let basePoints = 0;
    if (priority === "p0") basePoints = random(800, 1000);
    else if (priority === "p1") basePoints = random(400, 600);
    else if (priority === "p2") basePoints = random(150, 300);
    else basePoints = random(50, 120);
    
    tickets.push({
      userId,
      type,
      title: `${type === "bug" ? "Bug" : type === "suggestion" ? "建议" : "关键信息"} #${i + 1}`,
      content: `这是一个${type}的详细描述内容。${type === 'bug' ? '重现步骤：1. 打开应用 2. 点击按钮 3. 出现错误' : type === 'suggestion' ? '建议增加这个功能以提升用户体验' : '提供关键产品反馈信息'}`,
      priority,
      status,
      baseScore: status === "approved" ? Math.floor(basePoints) : 0,
      finalScore: status === "approved" ? Math.floor(basePoints) : 0,
      reviewedBy: status !== "pending" ? randomChoice(userIds.slice(0, 10)) : null,
      createdAt: new Date(startDate.getTime() + randomInt(0, daysDiff) * 24 * 60 * 60 * 1000),
    });
  }
  
  await db.insert(schema.tickets).values(tickets);
  console.log(`  ✓ 已生成 ${ticketCount} 条工单\n`);

  // 3. 生成直播数据 (P_Eco - Creator)
  console.log("3/7 生成直播数据...");
  const streams = [];
  const streamCount = randomInt(800, 1500);
  const streamers = userIds.slice(0, 200); // 200个主播
  
  for (let i = 0; i < streamCount; i++) {
    const userId = randomChoice(streamers);
    const durationMinutes = randomInt(30, 240);
    const avgCCU = randomInt(5, 500);
    const peakCCU = avgCCU + randomInt(10, 200);
    const chatMessages = randomInt(50, 2000);
    const isFeatured = Math.random() < 0.1;
    
    streams.push({
      streamerId: userId,
      title: `直播 #${i + 1}`,
      durationMinutes,
      avgCCU,
      peakCCU,
      chatMessages,
      createdAt: new Date(startDate.getTime() + randomInt(0, daysDiff) * 24 * 60 * 60 * 1000),
    });
  }
  
  await db.insert(schema.liveStreams).values(streams);
  console.log(`  ✓ 已生成 ${streamCount} 条直播记录\n`);

  // 4. 生成观众贡献数据 (P_Eco - Audience)
  console.log("4/7 生成观众贡献数据...");
  const audienceContributions = [];
  const activeAudience = userIds.slice(200, 5000); // 4800个活跃观众
  
  for (let day = 0; day < daysDiff; day++) {
    const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const dailyActiveCount = randomInt(1000, 2000);
    
    for (let i = 0; i < dailyActiveCount; i++) {
      const userId = randomChoice(activeAudience);
      const watchMinutes = randomInt(10, 240);
      const tipAmount = Math.random() < 0.2 ? random(1, 100) : 0;
      const chatCount = randomInt(0, 50);
      const featuredPosts = Math.random() < 0.05 ? randomInt(1, 3) : 0;
      
      const score = (tipAmount * 0.03 * 5) + (watchMinutes / 60 * 1) + (chatCount * 0.2) + (featuredPosts * 5);
      
      audienceContributions.push({
        userId,
        date,
        watchDuration: watchMinutes,
        validWatchDuration: Math.min(watchMinutes, 240), // 最多4小时
        tipAmount: parseFloat(tipAmount.toFixed(2)),
        tipFee: parseFloat((tipAmount * 0.03).toFixed(2)),
        tipScore: parseFloat((tipAmount * 0.03 * 5).toFixed(2)),
        watchScore: parseFloat((Math.min(watchMinutes, 240) / 60 * 1).toFixed(2)),
        chatCount,
        validChatCount: Math.floor(chatCount / 2), // 简化：假设一半有效
        chatScore: parseFloat((Math.floor(chatCount / 2) * 0.2).toFixed(2)),
        featuredPostCount: featuredPosts,
        featuredPostScore: parseFloat((featuredPosts * 5).toFixed(2)),
        totalScore: parseFloat(score.toFixed(2)),
      });
    }
    
    if (audienceContributions.length >= 1000) {
      await db.insert(schema.audienceContributions).values(audienceContributions);
      audienceContributions.length = 0;
    }
    
    process.stdout.write(`\r  已生成 ${day + 1}/${daysDiff} 天的观众数据`);
  }
  
  if (audienceContributions.length > 0) {
    await db.insert(schema.audienceContributions).values(audienceContributions);
  }
  console.log("\n  ✓ 观众贡献数据生成完成\n");

  // 5. 生成交易数据 (P_Trade)
  console.log("5/7 生成交易数据...");
  const trades = [];
  const traders = userIds.slice(0, 3000); // 3000个交易者
  const tradeCount = randomInt(50000, 100000);
  
  for (let i = 0; i < tradeCount; i++) {
    const userId = randomChoice(traders);
    const tradeType = randomChoice(["spot", "futures"]);
    const volume = random(100, 50000);
    const fee = volume * (tradeType === "spot" ? 0.001 : 0.0004);
    const holdMinutes = randomInt(5, 1440);
    const isSuspicious = Math.random() < 0.02;
    
    trades.push({
      userId,
      tradeType,
      tradingPair: randomChoice(["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"]),
      volume: parseFloat(volume.toFixed(2)),
      fee: parseFloat(fee.toFixed(2)),
      holdingMinutes: holdMinutes,
      orderCount: randomInt(1, 10),
      status: isSuspicious ? "suspicious" : "normal",
      createdAt: new Date(startDate.getTime() + randomInt(0, daysDiff) * 24 * 60 * 60 * 1000),
    });
    
    if (trades.length >= 1000) {
      await db.insert(schema.tradeRecords).values(trades);
      trades.length = 0;
      process.stdout.write(`\r  已生成 ${i + 1}/${tradeCount} 条交易`);
    }
  }
  
  if (trades.length > 0) {
    await db.insert(schema.tradeRecords).values(trades);
  }
  console.log("\n  ✓ 交易数据生成完成\n");

  // 6. 生成积分记录
  console.log("6/7 生成积分记录...");
  const pointsRecords = [];
  
  // Genesis积分
  const approvedTickets = tickets.filter(t => t.status === "approved");
  for (const ticket of approvedTickets) {
    pointsRecords.push({
      userId: ticket.userId,
      type: "genesis",
      amount: ticket.points,
      source: "ticket",
      sourceId: ticket.userId, // 实际应该是ticket.id
      createdAt: ticket.createdAt,
    });
  }
  
  // Eco积分（简化版，实际应根据完整算法）
  for (const contrib of audienceContributions.slice(0, 5000)) {
    pointsRecords.push({
      userId: contrib.userId,
      type: "eco",
      amount: parseFloat((contrib.score * 0.5).toFixed(2)),
      source: "audience",
      sourceId: contrib.userId,
      createdAt: contrib.date,
    });
  }
  
  // Trade积分
  const settledTrades = trades.filter(t => t.status === "normal");
  for (const trade of settledTrades.slice(0, 10000)) {
    const points = trade.fee * 5 + (trade.holdMinutes > 60 ? 10 : 0);
    pointsRecords.push({
      userId: trade.userId,
      type: "trade",
      amount: parseFloat(points.toFixed(2)),
      source: "trade",
      sourceId: trade.userId,
      createdAt: trade.createdAt,
    });
  }
  
  // 批量插入积分记录
  for (let i = 0; i < pointsRecords.length; i += 1000) {
    await db.insert(schema.pointsRecords).values(pointsRecords.slice(i, i + 1000));
    process.stdout.write(`\r  已生成 ${Math.min(i + 1000, pointsRecords.length)}/${pointsRecords.length} 条积分记录`);
  }
  console.log("\n  ✓ 积分记录生成完成\n");

  // 7. 生成核心身份
  console.log("7/7 生成核心身份数据...");
  const identities = [];
  const ogUsers = userIds.slice(0, 50);
  const coreStreamers = streamers.slice(0, 20);
  const proTraders = traders.slice(0, 30);
  
  for (const userId of ogUsers) {
    identities.push({
      userId,
      identityType: "og",
      weeklyBonus: parseFloat(random(100, 500).toFixed(2)),
      createdBy: 1,
    });
  }
  
  for (const userId of coreStreamers) {
    identities.push({
      userId,
      identityType: "core_streamer",
      weeklyBonus: parseFloat(random(200, 800).toFixed(2)),
      createdBy: 1,
    });
  }
  
  for (const userId of proTraders) {
    identities.push({
      userId,
      identityType: "pro_trader",
      weeklyBonus: parseFloat(random(150, 600).toFixed(2)),
      createdBy: 1,
    });
  }
  
  await db.insert(schema.coreIdentities).values(identities);
  console.log(`  ✓ 已生成 ${identities.length} 个核心身份\n`);

  console.log("=== 数据生成完成 ===");
  console.log(`总用户数: 10000`);
  console.log(`工单数: ${ticketCount}`);
  console.log(`直播数: ${streamCount}`);
  console.log(`交易数: ${tradeCount}`);
  console.log(`积分记录数: ${pointsRecords.length}`);
  console.log(`核心身份数: ${identities.length}`);
}

generateMockData()
  .then(() => {
    console.log("\n✅ 所有数据生成成功！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 数据生成失败:", error);
    process.exit(1);
  });
