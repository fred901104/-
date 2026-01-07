# SO Alpha积分管理后台 - 剩余功能实现指南

## 已完成功能总结

### ✅ 第一阶段：数据库架构和积分配置
1. **数据库schema扩展**
   - 新增 `points_configs` 表（积分配置管理）
   - 新增 `audience_contributions` 表（观众贡献数据）
   - 新增 `creator_contributions` 表（主播贡献数据）
   - 新增 `metrics_stats` 表（核心指标统计）

2. **积分配置管理功能**
   - 完整的配置CRUD API
   - 配置管理页面（支持S0/S1/S2阶段配置）
   - 导航栏集成

### ✅ 第二阶段：Dashboard全面升级
1. **环比数据展示**
   - 周环比、月环比数据计算
   - 增长率指标显示（红色下降、绿色上升）

2. **阶段选择器**
   - S0/S1/S2 Alpha阶段切换
   - 基于阶段的数据筛选

3. **12个核心指标卡片**
   - 参与积分贡献人数
   - 直播时长
   - 打赏人数、打赏金额
   - 发帖人数、发帖数、精品贴数
   - 现货交易量、现货交易手续费
   - 合约交易量、合约交易手续费
   - Bug提交数

4. **10000用户模拟数据生成脚本**
   - 完整的S0 Alpha周期模拟
   - 真实感的业务数据生成
   - 积分精确到小数点后两位

---

## 待实现功能清单

### 🔲 P_Eco直播监控台优化

#### 需要的Schema修改
```typescript
// 在 drizzle/schema.ts 的 liveStreams 表中添加：
isFeatured: int("is_featured").default(0).notNull(), // 是否精选内容
isAbnormal: int("is_abnormal").default(0).notNull(), // 是否异常标记
```

#### 需要的API端点（在 server/routers.ts 的 streams 路由中添加）
```typescript
// 1. 观众统计API
audienceStats: protectedProcedure.query(async () => {
  // 从 audience_contributions 表聚合数据
  // 计算 Score_Audience = (打赏手续费 × 5) + (观看时长(h) × 1) + (聊天 × 0.2) + (精选贴 × 5)
});

// 2. CCU采样数据API
ccuSamples: protectedProcedure.input(z.object({ streamId: z.number() })).query(async ({ input }) => {
  // 返回指定直播的CCU采样点数据（每1.5分钟一个点）
});

// 3. 切换精选状态
toggleFeatured: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
  // 切换 isFeatured 字段
});

// 4. 切换异常标记
toggleAbnormal: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
  // 切换 isAbnormal 字段
});
```

#### 前端页面改造
创建 `client/src/pages/Streams-v2.tsx`，包含：
- **Tabs组件**：主播贡献 / 观众贡献 两个Tab
- **主播贡献Tab**：
  - 显示直播列表，计算 Score_Creator
  - 加精/取消精选按钮
  - 标记异常/取消标记按钮
  - 查看CCU详情按钮
- **观众贡献Tab**：
  - 显示观众列表，计算 Score_Audience
  - 展示观看时长、打赏、聊天、精选贴等数据
- **CCU采样弹窗**：
  - AreaChart 心电图可视化
  - 显示采样次数、场均CCU、峰值CCU

---

### 🔲 P_Trade交易账本优化

#### 需要的Schema修改
```typescript
// 在 drizzle/schema.ts 中添加新表：
export const frozenRecords = mysqlTable("frozen_records", {
  id: int("id").autoincrement().primaryKey(),
  tradeId: int("trade_id").notNull(),
  userId: int("user_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  frozenBy: int("frozen_by").notNull(),
  frozenAt: timestamp("frozen_at").defaultNow().notNull(),
  status: mysqlEnum("status", ["frozen", "unfrozen"]).default("frozen").notNull(),
});
```

#### 需要的API端点
```typescript
// 在 trades 路由中添加：
frozenRecords: protectedProcedure.input(z.object({ tradeId: z.number() })).query(async ({ input }) => {
  // 查询指定交易的所有冻结记录
});

freezePoints: protectedProcedure.input(z.object({
  tradeId: z.number(),
  reason: z.string(),
})).mutation(async ({ input, ctx }) => {
  // 冻结交易积分并创建冻结记录
});
```

#### 前端页面改造
在 `client/src/pages/Trades.tsx` 中添加：
- **冻结记录下钻功能**：点击"查看冻结记录"按钮打开Dialog
- **冻结记录列表**：显示该交易的所有冻结历史
- **冻结操作**：输入原因后冻结积分

---

### 🔲 通用筛选和搜索功能

#### 创建通用组件
```typescript
// client/src/components/FilterBar.tsx
export function FilterBar({
  searchPlaceholder,
  onSearchChange,
  filters, // { label, value, options }[]
  onFilterChange,
}) {
  // 搜索框 + 多个Select筛选器
}
```

#### 应用到各个页面
- **工单管理**：按类型、状态、等级、日期范围筛选
- **直播监控**：按主播名、状态（精选/异常）筛选
- **交易账本**：按用户、状态（正常/冻结）、日期范围筛选
- **用户管理**：按角色、标签筛选

---

### 🔲 导出功能

#### 安装依赖
```bash
pnpm add xlsx
```

#### 创建导出工具函数
```typescript
// client/src/lib/export.ts
import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}
```

#### 应用到各个页面
在表格上方添加"导出"按钮，支持：
- 结算报表导出
- 用户积分历史导出
- 工单列表导出
- 交易记录导出

---

## 实现优先级建议

1. **高优先级**（核心业务逻辑）
   - P_Eco观众/主播分离展示
   - P_Trade冻结记录下钻

2. **中优先级**（用户体验）
   - 通用筛选和搜索功能
   - 导出功能

3. **低优先级**（锦上添花）
   - CCU采样心电图可视化
   - 更多数据维度的趋势图

---

## 数据生成脚本使用

运行以下命令生成10000用户的完整测试数据：

```bash
cd /home/ubuntu/so-alpha-admin
node scripts/generate-mock-data.mjs
```

脚本会生成：
- 10000个用户账户
- 12周的积分记录（S0 Alpha周期）
- 动态积分池数据（70%）
- 创世积分池数据（30%）
- 工单、直播、交易等业务数据

---

## 注意事项

1. **Schema修改后必须运行**：`pnpm db:push`
2. **API修改后必须重启服务器**：通过Management UI或命令行
3. **类型安全**：确保所有TypeScript类型正确定义
4. **测试数据**：先运行数据生成脚本，再测试各个功能页面
5. **操作日志**：所有敏感操作（审核、冻结、加精）都要记录到 operation_logs 表

---

## 技术栈参考

- **前端**：React 19 + Tailwind 4 + shadcn/ui + Recharts
- **后端**：tRPC 11 + Express 4 + Drizzle ORM
- **数据库**：MySQL/TiDB
- **图表**：Recharts（折线图、饼图、面积图）
- **表格**：Tanstack Table（未来可考虑集成）
