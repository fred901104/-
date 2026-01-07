import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, TrendingUp, Users, Activity, 
  ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

const COLORS = {
  genesis: "#8b5cf6",
  eco: "#3b82f6", 
  trade: "#10b981",
};

export default function Dashboard() {
  const [selectedPhase, setSelectedPhase] = useState("S0");
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");

  const { data: overview, isLoading: overviewLoading } = trpc.dashboard.overview.useQuery();
  const { data: trends, isLoading: trendsLoading } = trpc.dashboard.trends.useQuery();
  const { data: config } = trpc.pointsConfig.active.useQuery();

  // 计算环比数据
  const calculateGrowth = (current: number, previous: number): { rate: number; trend: "up" | "down" | "stable" } => {
    if (previous === 0) return { rate: 0, trend: "stable" as const };
    const rate = ((current - previous) / previous) * 100;
    const trend: "up" | "down" | "stable" = rate > 0 ? "up" : rate < 0 ? "down" : "stable";
    return { rate: Math.abs(rate), trend };
  };

  // 模拟环比数据
  const todayGrowth = calculateGrowth(overview?.todayPoints || 0, 850);
  const activeUsersGrowth = calculateGrowth(overview?.activeUsers || 0, 95);

  // 准备饼图数据
  const pieData = overview?.totalPoints ? [
    { name: "P_Genesis", value: overview.totalPoints.genesis, percent: config?.pGenesisPercent || 40 },
    { name: "P_Eco", value: overview.totalPoints.eco, percent: config?.pEcoPercent || 40 },
    { name: "P_Trade", value: overview.totalPoints.trade, percent: config?.pTradePercent || 20 },
  ] : [];

  // 准备趋势图数据（模拟数据，实际应从API获取）
  const generateMockTrendData = (days: number) => {
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        genesis: Math.floor(Math.random() * 500 + 200),
        eco: Math.floor(Math.random() * 500 + 200),
        trade: Math.floor(Math.random() * 200 + 50),
      });
    }
    return data;
  };

  const trendData = trends || generateMockTrendData(30);

  // 核心指标模拟数据
  const generateMetricData = () => {
    const days = timeRange === "day" ? 7 : timeRange === "week" ? 12 : 12;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (timeRange === "day") {
        date.setDate(date.getDate() - i);
        data.push({
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          participants: Math.floor(Math.random() * 500 + 300),
          streamHours: Math.floor(Math.random() * 200 + 100),
          tippers: Math.floor(Math.random() * 150 + 50),
          tipAmount: Math.floor(Math.random() * 5000 + 2000),
          posters: Math.floor(Math.random() * 100 + 30),
          posts: Math.floor(Math.random() * 300 + 100),
          featuredPosts: Math.floor(Math.random() * 20 + 5),
          spotVolume: Math.floor(Math.random() * 100000 + 50000),
          spotFees: Math.floor(Math.random() * 1000 + 500),
          futuresVolume: Math.floor(Math.random() * 200000 + 100000),
          futuresFees: Math.floor(Math.random() * 2000 + 1000),
          bugs: Math.floor(Math.random() * 10 + 2),
        });
      } else if (timeRange === "week") {
        date.setDate(date.getDate() - i * 7);
        data.push({
          label: `W${52 - i}`,
          participants: Math.floor(Math.random() * 2000 + 1500),
          streamHours: Math.floor(Math.random() * 1000 + 600),
          tippers: Math.floor(Math.random() * 600 + 300),
          tipAmount: Math.floor(Math.random() * 30000 + 15000),
          posters: Math.floor(Math.random() * 400 + 200),
          posts: Math.floor(Math.random() * 1500 + 800),
          featuredPosts: Math.floor(Math.random() * 80 + 40),
          spotVolume: Math.floor(Math.random() * 500000 + 300000),
          spotFees: Math.floor(Math.random() * 5000 + 3000),
          futuresVolume: Math.floor(Math.random() * 1000000 + 600000),
          futuresFees: Math.floor(Math.random() * 10000 + 6000),
          bugs: Math.floor(Math.random() * 40 + 20),
        });
      } else {
        date.setMonth(date.getMonth() - i);
        data.push({
          label: `${date.getMonth() + 1}月`,
          participants: Math.floor(Math.random() * 8000 + 6000),
          streamHours: Math.floor(Math.random() * 4000 + 2500),
          tippers: Math.floor(Math.random() * 2500 + 1500),
          tipAmount: Math.floor(Math.random() * 120000 + 80000),
          posters: Math.floor(Math.random() * 1600 + 1000),
          posts: Math.floor(Math.random() * 6000 + 4000),
          featuredPosts: Math.floor(Math.random() * 300 + 200),
          spotVolume: Math.floor(Math.random() * 2000000 + 1500000),
          spotFees: Math.floor(Math.random() * 20000 + 15000),
          futuresVolume: Math.floor(Math.random() * 4000000 + 3000000),
          futuresFees: Math.floor(Math.random() * 40000 + 30000),
          bugs: Math.floor(Math.random() * 150 + 100),
        });
      }
    }
    return data;
  };

  const metricData = generateMetricData();

  const GrowthIndicator = ({ growth }: { growth: { rate: number; trend: "up" | "down" | "stable" } }) => {
    const Icon = growth.trend === "up" ? ArrowUp : growth.trend === "down" ? ArrowDown : Minus;
    const color = growth.trend === "up" ? "text-green-600" : growth.trend === "down" ? "text-red-600" : "text-gray-600";
    
    return (
      <span className={`inline-flex items-center text-xs ${color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {growth.rate.toFixed(1)}%
      </span>
    );
  };

  const MetricChart = ({ data, dataKey, title, color = "#3b82f6" }: { 
    data: any[]; 
    dataKey: string; 
    title: string;
    color?: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">总览仪表盘</h1>
          <p className="text-muted-foreground mt-1">
            实时监控积分池消耗、用户活跃度和各维度积分产出情况
          </p>
        </div>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S0">S0 Alpha</SelectItem>
            <SelectItem value="S1">S1 Beta</SelectItem>
            <SelectItem value="S2">S2 Gamma</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已结算积分</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {overview?.totalPoints.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  已经结算到用户端的总积分
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日新增积分</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold flex items-center gap-2">
                  +{overview?.todayPoints.toLocaleString()}
                  <GrowthIndicator growth={todayGrowth} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  今日预估生成积分
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日活跃用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {overview?.activeUsers.toLocaleString()}
                  <GrowthIndicator growth={activeUsersGrowth} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  参与贡献获得积分的人数
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计参与人数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(overview?.activeUsers || 0) * 12}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  S0 阶段累计参与贡献人数
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>各个池积分占比</CardTitle>
            <CardDescription>
              P_Genesis / P_Eco / P_Trade 周期内，各个分池已经产出积分/对应池可释放积分的占比
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={Object.values(COLORS)[index]} 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>每日积分发放趋势（折线图）</CardTitle>
            <CardDescription>
              近30天各维度积分发放情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="genesis" 
                    stroke={COLORS.genesis} 
                    name="P_Genesis"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="eco" 
                    stroke={COLORS.eco} 
                    name="P_Eco"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trade" 
                    stroke={COLORS.trade} 
                    name="P_Trade"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Core Metrics Trends */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>核心指标趋势</CardTitle>
              <CardDescription>
                查看各维度核心指标的变化趋势
              </CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <TabsList>
                <TabsTrigger value="day">日</TabsTrigger>
                <TabsTrigger value="week">周</TabsTrigger>
                <TabsTrigger value="month">月</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricChart 
              data={metricData} 
              dataKey="participants" 
              title="参与积分贡献人数"
              color="#8b5cf6"
            />
            <MetricChart 
              data={metricData} 
              dataKey="streamHours" 
              title="直播时长（小时）"
              color="#3b82f6"
            />
            <MetricChart 
              data={metricData} 
              dataKey="tippers" 
              title="打赏人数"
              color="#10b981"
            />
            <MetricChart 
              data={metricData} 
              dataKey="tipAmount" 
              title="打赏金额（U）"
              color="#f59e0b"
            />
            <MetricChart 
              data={metricData} 
              dataKey="posters" 
              title="发帖人数"
              color="#ef4444"
            />
            <MetricChart 
              data={metricData} 
              dataKey="posts" 
              title="发帖数"
              color="#ec4899"
            />
            <MetricChart 
              data={metricData} 
              dataKey="featuredPosts" 
              title="精品贴数"
              color="#8b5cf6"
            />
            <MetricChart 
              data={metricData} 
              dataKey="spotVolume" 
              title="现货交易量（U）"
              color="#06b6d4"
            />
            <MetricChart 
              data={metricData} 
              dataKey="spotFees" 
              title="现货手续费（U）"
              color="#0ea5e9"
            />
            <MetricChart 
              data={metricData} 
              dataKey="futuresVolume" 
              title="合约交易量（U）"
              color="#6366f1"
            />
            <MetricChart 
              data={metricData} 
              dataKey="futuresFees" 
              title="合约手续费（U）"
              color="#8b5cf6"
            />
            <MetricChart 
              data={metricData} 
              dataKey="bugs" 
              title="Bug提交数"
              color="#f43f5e"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
