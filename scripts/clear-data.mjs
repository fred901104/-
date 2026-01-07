import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🗑️  开始清空数据库...");

const tables = [
  "points_records",
  "settlements",
  "trade_records",
  "tickets",
  "audience_contributions",
  "creator_contributions",
  "live_streams",
  "featured_contents",
  "core_identities",
  "operation_logs",
  "metrics_stats",
];

for (const table of tables) {
  try {
    await connection.query(`DELETE FROM ${table}`);
    console.log(`✅ 已清空表: ${table}`);
  } catch (error) {
    console.log(`⚠️  清空表失败: ${table}`, error.message);
  }
}

// 只保留管理员用户，删除其他用户
await connection.query(`DELETE FROM users WHERE role != 'admin'`);
console.log(`✅ 已清空非管理员用户`);

// 重置自增ID
for (const table of tables) {
  try {
    await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  } catch (error) {
    // 忽略错误
  }
}

console.log("\n✨ 数据库清空完成！");
await connection.end();
