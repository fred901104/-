import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Plus, AlertTriangle, CheckCircle2, Pause, Play, XCircle, Clock, History } from "lucide-react";

export default function UnifiedPointsConfig() {
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false);
  const [isCreateWeekDialogOpen, setIsCreateWeekDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  const [stageFormData, setStageFormData] = useState({
    stageName: "",
    totalBudget: 1000000,
    startDate: "",
    endDate: "",
  });

  const [weekFormData, setWeekFormData] = useState({
    weekStartDate: "", // 只需要周一的日期
    weeklyPointsTarget: 100000,
    pGenesisPercent: "40",
    pEcoPercent: "40",
    pTradePercent: "20",
  });

  // 查询所有阶段配置
  const { data: stages, isLoading: stagesLoading, refetch: refetchStages } = trpc.stageBudget.list.useQuery();
  
  // 查询选中阶段的周配置
  const { data: weeklyRules, isLoading: weeksLoading, refetch: refetchWeeks } = trpc.weeklyReleaseRules.list.useQuery(
    { stageId: selectedStageId ?? undefined },
    { enabled: selectedStageId !== null }
  );

  // 查询选中阶段的预算使用情况
  const { data: budgetUsage } = trpc.stageBudget.getBudgetUsage.useQuery(
    { id: selectedStageId ?? 0 },
    { enabled: selectedStageId !== null }
  );

  // Mutations
  const createStageMutation = trpc.stageBudget.create.useMutation({
    onSuccess: () => {
      toast.success("阶段配置创建成功");
      setIsCreateStageDialogOpen(false);
      refetchStages();
      setStageFormData({
        stageName: "",
        totalBudget: 1000000,
        startDate: "",
        endDate: "",
      });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const createWeekMutation = trpc.weeklyReleaseRules.create.useMutation({
    onSuccess: () => {
      toast.success("周配置创建成功");
      setIsCreateWeekDialogOpen(false);
      refetchWeeks();
      setWeekFormData({
        weekStartDate: "",
        weeklyPointsTarget: 100000,
        pGenesisPercent: "40",
        pEcoPercent: "40",
        pTradePercent: "20",
      });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const endStageMutation = trpc.stageBudget.end.useMutation({
    onSuccess: () => {
      toast.success("阶段已结束");
      refetchStages();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const pauseWeekMutation = trpc.weeklyReleaseRules.pause.useMutation({
    onSuccess: () => {
      toast.success("周配置已暂停");
      refetchWeeks();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const resumeWeekMutation = trpc.weeklyReleaseRules.resume.useMutation({
    onSuccess: () => {
      toast.success("周配置已恢复");
      refetchWeeks();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const endWeekMutation = trpc.weeklyReleaseRules.end.useMutation({
    onSuccess: () => {
      toast.success("周配置已结束");
      refetchWeeks();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // Handlers
  const handleCreateStage = () => {
    if (!stageFormData.stageName || !stageFormData.startDate || !stageFormData.endDate) {
      toast.error("请填写所有必填字段");
      return;
    }

    createStageMutation.mutate({
      stageName: stageFormData.stageName,
      totalBudget: stageFormData.totalBudget,
      startDate: new Date(stageFormData.startDate),
      endDate: new Date(stageFormData.endDate),
    });
  };

  const handleCreateWeek = () => {
    if (!selectedStageId) {
      toast.error("请先选择一个阶段");
      return;
    }

    if (!weekFormData.weekStartDate) {
      toast.error("请选择周一的日期");
      return;
    }

    // 验证百分比总和为100
    const total = parseFloat(weekFormData.pGenesisPercent) + parseFloat(weekFormData.pEcoPercent) + parseFloat(weekFormData.pTradePercent);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("三个池的百分比总和必须为100%");
      return;
    }

    createWeekMutation.mutate({
      stageId: selectedStageId,
      weekStartDate: new Date(weekFormData.weekStartDate),
      weeklyPointsTarget: weekFormData.weeklyPointsTarget,
      pGenesisPercent: weekFormData.pGenesisPercent,
      pEcoPercent: weekFormData.pEcoPercent,
      pTradePercent: weekFormData.pTradePercent,
    });
  };

  // 找到当前激活的阶段
  const activeStage = stages?.find(s => s.status === "active");

  // 自动选择激活的阶段
  if (activeStage && selectedStageId === null) {
    setSelectedStageId(activeStage.id);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />待生效</Badge>;
      case "active":
        return <Badge className="bg-green-500">激活中</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500">已暂停</Badge>;
      case "ended":
        return <Badge className="bg-gray-500">已结束</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getWarningIcon = (level?: string) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  // 分类周配置：已配置（active/paused/pending）和过往配置（ended）
  const activeWeeklyRules = weeklyRules?.filter(r => r.status !== "ended") || [];
  const historicalWeeklyRules = weeklyRules?.filter(r => r.status === "ended") || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            积分配置管理
          </h1>
          <p className="text-muted-foreground mt-2">
            统一管理阶段总预算和周释放配置
          </p>
        </div>
        <Button onClick={() => setIsCreateStageDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建阶段配置
        </Button>
      </div>

      {/* 当前激活的阶段配置 */}
      {activeStage && budgetUsage && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getWarningIcon(budgetUsage.warningLevel)}
                当前阶段：{activeStage.stageName}
              </span>
              {getStatusBadge(activeStage.status)}
            </CardTitle>
            <CardDescription>
              {new Date(activeStage.startDate).toLocaleDateString()} - {new Date(activeStage.endDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">阶段总预算</p>
                <p className="text-2xl font-bold">{activeStage.totalBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已使用预算</p>
                <p className="text-2xl font-bold">{budgetUsage.usedBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">剩余预算</p>
                <p className="text-2xl font-bold">{budgetUsage.remainingBudget.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>预算使用进度</span>
                <span className="font-semibold">{budgetUsage.usageRate.toFixed(2)}%</span>
              </div>
              <Progress value={budgetUsage.usageRate} className="h-2" />
              {budgetUsage.warningLevel === "critical" && (
                <p className="text-sm text-red-500">⚠️ 预算使用已超过95%，请注意控制</p>
              )}
              {budgetUsage.warningLevel === "warning" && (
                <p className="text-sm text-yellow-600">⚠️ 预算使用已超过80%，请密切关注</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => endStageMutation.mutate({ id: activeStage.id })}
                disabled={endStageMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                结束阶段
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 周配置列表（分为已配置和过往配置） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>周释放配置</CardTitle>
              <CardDescription>
                {selectedStageId ? `阶段 ${stages?.find(s => s.id === selectedStageId)?.stageName} 的周配置列表` : "请先选择一个阶段"}
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateWeekDialogOpen(true)}
              disabled={!selectedStageId || activeStage?.status !== "active"}
            >
              <Plus className="mr-2 h-4 w-4" />
              新建周配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">已配置 ({activeWeeklyRules.length})</TabsTrigger>
              <TabsTrigger value="historical">
                <History className="h-4 w-4 mr-2" />
                过往配置 ({historicalWeeklyRules.length})
              </TabsTrigger>
            </TabsList>

            {/* 已配置列表 */}
            <TabsContent value="active" className="mt-4">
              {weeksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : activeWeeklyRules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>周次</TableHead>
                      <TableHead>时间范围</TableHead>
                      <TableHead>目标积分</TableHead>
                      <TableHead>池子比例</TableHead>
                      <TableHead>实际释放</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeWeeklyRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>第 {rule.weekNumber} 周</TableCell>
                        <TableCell className="text-sm">
                          {new Date(rule.startDate).toLocaleDateString()} - {new Date(rule.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{rule.weeklyPointsTarget.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">
                          G:{rule.pGenesisPercent}% / E:{rule.pEcoPercent}% / T:{rule.pTradePercent}%
                        </TableCell>
                        <TableCell>{rule.actualReleased.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(rule.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rule.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => pauseWeekMutation.mutate({ id: rule.id })}
                                disabled={pauseWeekMutation.isPending}
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {rule.status === "paused" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resumeWeekMutation.mutate({ id: rule.id })}
                                disabled={resumeWeekMutation.isPending}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {rule.status !== "ended" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => endWeekMutation.mutate({ id: rule.id })}
                                disabled={endWeekMutation.isPending}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {selectedStageId ? "暂无周配置，请点击上方按钮创建" : "请先选择一个阶段"}
                </p>
              )}
            </TabsContent>

            {/* 过往配置列表 */}
            <TabsContent value="historical" className="mt-4">
              {weeksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : historicalWeeklyRules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>周次</TableHead>
                      <TableHead>时间范围</TableHead>
                      <TableHead>目标积分</TableHead>
                      <TableHead>池子比例</TableHead>
                      <TableHead>实际释放</TableHead>
                      <TableHead>完成率</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalWeeklyRules.map((rule) => {
                      const completionRate = (rule.actualReleased / rule.weeklyPointsTarget) * 100;
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>第 {rule.weekNumber} 周</TableCell>
                          <TableCell className="text-sm">
                            {new Date(rule.startDate).toLocaleDateString()} - {new Date(rule.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{rule.weeklyPointsTarget.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">
                            G:{rule.pGenesisPercent}% / E:{rule.pEcoPercent}% / T:{rule.pTradePercent}%
                          </TableCell>
                          <TableCell>{rule.actualReleased.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={completionRate >= 100 ? "text-green-600" : "text-yellow-600"}>
                              {completionRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(rule.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  暂无历史配置记录
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 新建阶段配置对话框 */}
      <Dialog open={isCreateStageDialogOpen} onOpenChange={setIsCreateStageDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>新建阶段配置</DialogTitle>
            <DialogDescription>
              创建新的阶段总预算配置（同一时间只能有一个激活的阶段）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">阶段标识 *</Label>
              <Input
                id="stageName"
                value={stageFormData.stageName}
                onChange={(e) => setStageFormData({ ...stageFormData, stageName: e.target.value })}
                placeholder="S0, S1, S2..."
              />
              <p className="text-xs text-muted-foreground">
                例如：S0（第0阶段）、S1（第1阶段）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalBudget">阶段总预算 *</Label>
              <Input
                id="totalBudget"
                type="number"
                value={stageFormData.totalBudget}
                onChange={(e) => setStageFormData({ ...stageFormData, totalBudget: parseInt(e.target.value) || 0 })}
                placeholder="1000000"
              />
              <p className="text-xs text-muted-foreground">
                该阶段的总积分预算上限（天花板）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stageStartDate">阶段开始时间 *</Label>
                <Input
                  id="stageStartDate"
                  type="date"
                  value={stageFormData.startDate}
                  onChange={(e) => setStageFormData({ ...stageFormData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stageEndDate">阶段结束时间 *</Label>
                <Input
                  id="stageEndDate"
                  type="date"
                  value={stageFormData.endDate}
                  onChange={(e) => setStageFormData({ ...stageFormData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateStageDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateStage} disabled={createStageMutation.isPending}>
              {createStageMutation.isPending ? "创建中..." : "创建阶段"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建周配置对话框 */}
      <Dialog open={isCreateWeekDialogOpen} onOpenChange={setIsCreateWeekDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>新建周配置</DialogTitle>
            <DialogDescription>
              为当前阶段创建新的周释放配置（自动计算自然周，从周一00:00到周日24:00）
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weekStartDate">选择周一日期 *</Label>
              <Input
                id="weekStartDate"
                type="date"
                value={weekFormData.weekStartDate}
                onChange={(e) => setWeekFormData({ ...weekFormData, weekStartDate: e.target.value })}
              />
              <p className="text-xs text-red-500">
                请选择周一的日期，系统会自动计算该自然周的开始和结束时间
              </p>
              <p className="text-xs text-muted-foreground">
                周次将根据阶段开始日期自动计算
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weeklyPointsTarget">该周目标积分 *</Label>
              <Input
                id="weeklyPointsTarget"
                type="number"
                value={weekFormData.weeklyPointsTarget}
                onChange={(e) => setWeekFormData({ ...weekFormData, weeklyPointsTarget: parseInt(e.target.value) || 0 })}
                placeholder="100000"
              />
              <p className="text-xs text-muted-foreground">
                该周计划释放的总积分
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pGenesisPercent">P_Genesis占比(%) *</Label>
                <Input
                  id="pGenesisPercent"
                  value={weekFormData.pGenesisPercent}
                  onChange={(e) => setWeekFormData({ ...weekFormData, pGenesisPercent: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pEcoPercent">P_Eco占比(%) *</Label>
                <Input
                  id="pEcoPercent"
                  value={weekFormData.pEcoPercent}
                  onChange={(e) => setWeekFormData({ ...weekFormData, pEcoPercent: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pTradePercent">P_Trade占比(%) *</Label>
                <Input
                  id="pTradePercent"
                  value={weekFormData.pTradePercent}
                  onChange={(e) => setWeekFormData({ ...weekFormData, pTradePercent: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              三个池的百分比总和必须为100%
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWeekDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateWeek} disabled={createWeekMutation.isPending}>
              {createWeekMutation.isPending ? "创建中..." : "创建周配置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
