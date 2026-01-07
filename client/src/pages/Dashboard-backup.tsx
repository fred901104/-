import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, TrendingUp, Users, Activity, 
  ArrowUp, ArrowDown, Minus,
  Radio, MessageSquare, DollarSign, FileText,
  BarChart3, LineChart as LineChartIcon
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from "recharts";

const COLORS = {
  genesis: "#8b5cf6",
  eco: "#3b82f6", 
  trade: "#10b981",
};

export default function Dashboard() {
  const [selectedPhase, setSelectedPhase] = useState("S0");
  const [metricsView, setMetricsView] = useState<"daily" | "cumulative">("daily");

  const { data: overview, isLoading: overviewLoading } = trpc.dashboard.overview.useQuery();
  const { data: trends, isLoading: trendsLoading } = trpc.dashboard.trends.useQuery();
  const { data: config } = trpc.pointsConfig.active.useQuery();
  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery({ 
    phase: selectedPhase 
  });

  // 计算环比数据
  const calculateGrowth = (current: number, previous: number): { rate: number; trend: "up" | "down" | "stable" } => {
    if (previous === 0) return { rate: 0, trend: "stable" as const };
    const rate = ((current - previous) / previous) * 100;
    const trend: "up" | "down" | "stable" = rate > 0 ? "up" : rate < 0 ? "down" : "stable";
    return { rate: Math.abs(rate), trend };
  };

  // 模拟环比数据（实际应从API获取）
  const todayGrowth = calculateGrowth(overview?.todayPoints || 0, 850);
  const activeUsersGrowth = calculateGrowth(overview?.activeUsers || 0, 95);

  // 准备饼图数据
  const pieData = overview?.totalPoints ? [
    { name: "P_Genesis", value: overview.totalPoints.genesis, percent: config?.pGenesisPercent || 40 },
    { name: "P_Eco", value: overview.totalPoints.eco, percent: config?.pEcoPercent || 40 },
    { name: "P_Trade", value: overview.totalPoints.trade, percent: config?.pTradePercent || 20 },
  ] : [];

  // 准备折线图数据
  const lineData = trends?.map(t => ({
    date: new Date(t.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    P_Genesis: Number(t.genesis),
    P_Eco: Number(t.eco),
    P_Trade: Number(t.trade),
  })) || [];

  // 核心指标数据
  const coreMetrics = [
    { 
      label: "参与积分贡献人数", 
      value: metrics?.contributorsCount || 0,
      icon: Users,
      color: "text-blue-600"
    },
    { 
      label: "直播总时长", 
      value: `${(metrics?.totalStreamHours || 0).toFixed(1)}h`,
      icon: Radio,
      color: "text-purple-600"
    },
    { 
      label: "打赏人数", 
      value: metrics?.tippersCount || 0,
      icon: Users,
      color: "text-green-600"
    },
    { 
      label: "打赏金额", 
      value: `$${(metrics?.totalTipAmount || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600"
    },
    { 
      label: "发帖人数", 
      value: metrics?.postersCount || 0,
      icon: MessageSquare,
      color: "text-orange-600"
    },
    { 
      label: "发帖总数", 
      value: metrics?.totalPosts || 0,
      icon: FileText,
      color: "text-amber-600"
    },
    { 
      label: "精品贴数", 
      value: metrics?.featuredPosts || 0,
      icon: FileText,
      color: "text-yellow-600"
    },
    { 
      label: "现货交易量", 
      value: `$${(metrics?.spotVolume || 0).toLocaleString()}`,
      icon: BarChart3,
      color: "text-cyan-600"
    },
    { 
      label: "现货手续费", 
      value: `$${(metrics?.spotFees || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-teal-600"
    },
    { 
      label: "合约交易量", 
      value: `$${(metrics?.futuresVolume || 0).toLocaleString()}`,
      icon: LineChartIcon,
      color: "text-indigo-600"
    },
    { 
      label: "合约手续费", 
      value: `$${(metrics?.futuresFees || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-violet-600"
    },
    { 
      label: "Bug提交数", 
      value: metrics?.bugReports || 0,
      icon: FileText,
      color: "text-red-600"
    },
  ];

  const GrowthIndicator = ({ growth }: { growth: { rate: number; trend: "up" | "down" | "stable" } }) => {
    if (growth.trend === "stable") {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Minus className="h-3 w-3" />
          持平
        </span>
      );
    }
    
    const Icon = growth.trend === "up" ? ArrowUp : ArrowDown;
    const colorClass = growth.trend === "up" ? "text-green-600" : "text-red-600";
    
    return (
      <span className={`text-xs font-medium flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-3 w-3" />
        {growth.rate.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">总览仪表盘</h1>
          <p className="text-muted-foreground mt-2">
            实时监控积分池消耗、用户活跃度和各维度积分产出情况
          </p>
        </div>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S0">S0 Alpha</SelectItem>
            <SelectItem value="S1">S1 Beta</SelectItem>
            <SelectItem value="S2">S2 Gamma</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已结算积分</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-24" />
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
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    +{overview?.todayPoints.toLocaleString()}
                  </div>
                  <GrowthIndicator growth={todayGrowth} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  今日预估产生积分
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
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {overview?.activeUsers.toLocaleString()}
                  </div>
                  <GrowthIndicator growth={activeUsersGrowth} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  今日参与贡献获得积分的人数
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
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(metrics?.totalContributors || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPhase} 阶段累计参与贡献人数
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
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
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent}%`}
                    outerRadius={80}
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
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="P_Genesis" stroke={COLORS.genesis} />
                  <Line type="monotone" dataKey="P_Eco" stroke={COLORS.eco} />
                  <Line type="monotone" dataKey="P_Trade" stroke={COLORS.trade} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 核心指标趋势 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>核心指标趋势</CardTitle>
              <CardDescription>
                {selectedPhase} 阶段各维度关键数据统计
              </CardDescription>
            </div>
            <Tabs value={metricsView} onValueChange={(v) => setMetricsView(v as "daily" | "cumulative")}>
              <TabsList>
                <TabsTrigger value="daily">每日</TabsTrigger>
                <TabsTrigger value="cumulative">累积</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {coreMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {metric.label}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${metric.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
