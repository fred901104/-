import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function Settlements() {
  const { data: settlements, isLoading } = trpc.settlements.list.useQuery();
  const { data: latest } = trpc.settlements.latest.useQuery();
  
  // Handle null/undefined latest settlement
  const hasLatest = latest && latest !== null;

  const confirmedCount = settlements?.filter(s => s.status === "confirmed").length || 0;
  const distributedCount = settlements?.filter(s => s.status === "distributed").length || 0;
  const totalPoints = (settlements?.reduce((sum, s) => sum + (s.totalPoints || 0), 0) || 0);

  const statusLabels = {
    preview: { label: "预览中", icon: Clock, color: "text-yellow-600" },
    confirmed: { label: "已确认", icon: CheckCircle, color: "text-blue-600" },
    distributed: { label: "已发放", icon: CheckCircle, color: "text-green-600" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">结算与发放中心</h1>
        <p className="text-muted-foreground mt-2">
          管理每周积分结算、数据回滚和积分发放流程
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计发放</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">历史总积分</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已确认</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">待发放周次</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发放</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distributedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">完成周次</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Settlement */}
      {hasLatest && latest && (
        <Card>
          <CardHeader>
            <CardTitle>当前周结算</CardTitle>
            <CardDescription>
              第{latest.weekNumber}周 ({new Date(latest.startDate).toLocaleDateString("zh-CN")} - {new Date(latest.endDate).toLocaleDateString("zh-CN")})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">总积分</p>
                <p className="text-2xl font-bold mt-1">{latest.totalPoints?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P_Genesis</p>
                <p className="text-2xl font-bold mt-1 text-purple-600">{latest.genesisPoints?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P_Eco</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{latest.ecoPoints?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P_Trade</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{latest.tradePoints?.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <Badge variant={latest.status === "distributed" ? "default" : "secondary"}>
                {statusLabels[latest.status as keyof typeof statusLabels]?.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlements History */}
      <Card>
        <CardHeader>
          <CardTitle>结算历史</CardTitle>
          <CardDescription>查看历史周次的结算记录</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>周次</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>日期范围</TableHead>
                  <TableHead>总积分</TableHead>
                  <TableHead>P_Genesis</TableHead>
                  <TableHead>P_Eco</TableHead>
                  <TableHead>P_Trade</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements?.map((settlement) => {
                  const StatusIcon = statusLabels[settlement.status as keyof typeof statusLabels]?.icon;

                  return (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">第{settlement.weekNumber}周</TableCell>
                      <TableCell>{settlement.year}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(settlement.startDate).toLocaleDateString("zh-CN")} - {new Date(settlement.endDate).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="font-semibold">{settlement.totalPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-purple-600">{settlement.genesisPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-blue-600">{settlement.ecoPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">{settlement.tradePoints?.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusLabels[settlement.status as keyof typeof statusLabels]?.color}`} />}
                          {statusLabels[settlement.status as keyof typeof statusLabels]?.label}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(settlement.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>结算流程说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">1. 每日预估视图 (T-1)</h4>
            <p className="text-muted-foreground">系统每日自动汇总前一天的积分数据，供运营查看和核对</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2. 周结算操作</h4>
            <p className="text-muted-foreground">每周五生成本周总报表，包含P_Genesis、P_Eco、P_Trade三个维度的积分汇总</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3. 异常校对</h4>
            <p className="text-muted-foreground">系统自动标记积分变动超过阈值的用户，供运营人工确认</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">4. 手动修正</h4>
            <p className="text-muted-foreground">支持补录和扣除操作，用于处理特殊情况或修正错误</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">5. 确认发放</h4>
            <p className="text-muted-foreground">运营确认无误后，点击发放按钮，积分更新至用户账户</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
