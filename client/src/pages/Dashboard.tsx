import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Coins, Activity } from "lucide-react";
import { Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = {
  genesis: "#8b5cf6",
  eco: "#3b82f6",
  trade: "#10b981",
};

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = trpc.dashboard.overview.useQuery();
  const { data: trends, isLoading: trendsLoading } = trpc.dashboard.trends.useQuery();

  const pieData = overview?.totalPoints
    ? [
        { name: "P_Genesis", value: overview.totalPoints.genesis, color: COLORS.genesis },
        { name: "P_Eco", value: overview.totalPoints.eco, color: COLORS.eco },
        { name: "P_Trade", value: overview.totalPoints.trade, color: COLORS.trade },
      ]
    : [];

  const lineData = trends?.map((t) => ({
    date: new Date(t.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    P_Genesis: Number(t.genesis) || 0,
    P_Eco: Number(t.eco) || 0,
    P_Trade: Number(t.trade) || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">总览仪表盘</h1>
        <p className="text-muted-foreground mt-2">
          实时监控积分池消耗、用户活跃度和各维度积分产出情况
        </p>
      </div>

      {/* Stats Cards */}
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
                <div className="text-2xl font-bold">
                  +{overview?.todayPoints.toLocaleString()}
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
                <div className="text-2xl font-bold">
                  {overview?.activeUsers.toLocaleString()}
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
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">正常</div>
            <p className="text-xs text-muted-foreground mt-1">
              所有服务运行正常
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
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
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="P_Genesis"
                    stroke={COLORS.genesis}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="P_Eco"
                    stroke={COLORS.eco}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="P_Trade"
                    stroke={COLORS.trade}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>核心指标说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.genesis }} />
                P_Genesis (任务与工单)
              </h3>
              <p className="text-sm text-muted-foreground">
                包含Bug提交、建议反馈、核心身份奖励等人工评估部分
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.eco }} />
                P_Eco (直播与生态)
              </h3>
              <p className="text-sm text-muted-foreground">
                观众时长、主播时长、CCU采集、内容互动等生态贡献
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.trade }} />
                P_Trade (交易贡献)
              </h3>
              <p className="text-sm text-muted-foreground">
                现货/合约手续费、持仓量、开单次数等交易数据
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
