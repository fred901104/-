import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);

console.log('🌱 Seeding database...');
await connection.execute('DELETE FROM points_records');
await connection.execute('DELETE FROM tickets');
await connection.execute('DELETE FROM live_streams');
await connection.execute('DELETE FROM trade_records');

const [users] = await connection.execute('SELECT id FROM users LIMIT 10');
const userIds = users.map(u => u.id);

if (userIds.length === 0) {
  console.log('⚠ No users found');
  process.exit(0);
}

for (let i = 0; i < 30; i++) {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  const types = ['bug', 'suggestion', 'info'];
  const type = types[Math.floor(Math.random() * types.length)];
  const priorities = ['p0', 'p1', 'p2', 'p3'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const statuses = ['pending', 'approved', 'rejected'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const baseScore = priority === 'p0' ? 500 : priority === 'p1' ? 100 : priority === 'p2' ? 50 : 20;
  const finalScore = status === 'approved' ? baseScore + Math.floor(Math.random() * 50) : 0;
  
  await connection.execute(
    'INSERT INTO tickets (user_id, type, title, content, priority, status, base_score, final_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
    [userId, type, type + ' #' + (i + 1), 'Report content', priority, status, baseScore, finalScore, Math.floor(Math.random() * 30)]
  );
  
  if (status === 'approved') {
    await connection.execute(
      'INSERT INTO points_records (user_id, type, sub_type, amount, description, status, created_at, approved_at) VALUES (?, 'genesis', ?, ?, 'Ticket approved', 'approved', DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))',
      [userId, type, finalScore, Math.floor(Math.random() * 30), Math.floor(Math.random() * 30)]
    );
  }
}

console.log('✓ Generated tickets');
await connection.end();
console.log('✅ Completed!');