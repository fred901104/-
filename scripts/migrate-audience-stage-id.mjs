/**
 * 数据迁移脚本：为audienceContributions表填充stageId字段
 * 
 * 逻辑：根据观众贡献的date字段，查找该日期所属的阶段（从stageBudgets表）
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { audienceContributions, stageBudgets } from '../drizzle/schema.js';
import { sql, and, gte, lte, isNull } from 'drizzle-orm';

async function main() {
  console.log('开始迁移audienceContributions表的stageId字段...\n');

  // 创建数据库连接
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. 获取所有阶段配置
    const stages = await db.select().from(stageBudgets).orderBy(stageBudgets.startDate);
    
    if (stages.length === 0) {
      console.log('⚠️  没有找到阶段配置，跳过迁移');
      return;
    }

    console.log(`找到 ${stages.length} 个阶段配置：`);
    stages.forEach(stage => {
      console.log(`  - ${stage.stageName} (ID: ${stage.id}): ${stage.startDate} ~ ${stage.endDate || '进行中'}`);
    });
    console.log('');

    // 2. 获取所有stageId为空的观众贡献记录
    const contributions = await db
      .select()
      .from(audienceContributions)
      .where(isNull(audienceContributions.stageId));

    if (contributions.length === 0) {
      console.log('✅ 所有记录的stageId已填充，无需迁移');
      return;
    }

    console.log(`找到 ${contributions.length} 条需要填充stageId的记录\n`);

    // 3. 为每条记录匹配对应的阶段
    let updatedCount = 0;
    let skippedCount = 0;

    for (const contribution of contributions) {
      const contributionDate = new Date(contribution.date);
      
      // 查找该日期所属的阶段
      const matchedStage = stages.find(stage => {
        const startDate = new Date(stage.startDate);
        const endDate = stage.endDate ? new Date(stage.endDate) : new Date('2099-12-31');
        
        return contributionDate >= startDate && contributionDate <= endDate;
      });

      if (matchedStage) {
        // 更新记录的stageId
        await db
          .update(audienceContributions)
          .set({ stageId: matchedStage.id })
          .where(sql`${audienceContributions.id} = ${contribution.id}`);
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`已处理 ${updatedCount} 条记录...`);
        }
      } else {
        skippedCount++;
        console.log(`⚠️  记录 ID ${contribution.id} (日期: ${contributionDate.toISOString().split('T')[0]}) 无法匹配到任何阶段`);
      }
    }

    console.log('\n迁移完成！');
    console.log(`  ✅ 成功更新: ${updatedCount} 条`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  跳过: ${skippedCount} 条（无法匹配阶段）`);
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
