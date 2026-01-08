import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, AlertCircle, Play, Pause, StopCircle } from "lucide-react";

export default function WeeklyReleaseRules() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    stageId: 1, // 默认选择第一个阶段
    weekNumber: 1,
    weekStartDate: "",
    weekEndDate: "",
    targetPoints: 0,
    genesisRatio: 40,
    ecoRatio: 40,
    tradeRatio: 20,
  });

  const { data: rules, isLoading, refetch } = trpc.weeklyReleaseRules.list.useQuery({});
  
  const createMutation = trpc.weeklyReleaseRules.create.useMutation({
    onSuccess: () => {
      toast.success("周配置创建成功");
      setIsCreateDialogOpen(false);
      setNewRule({
        stageId: 1,
        weekNumber: 1,
        weekStartDate: "",
        weekEndDate: "",
        targetPoints: 0,
        genesisRatio: 40,
        ecoRatio: 40,
        tradeRatio: 20,
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const pauseMutation = trpc.weeklyReleaseRules.pause.useMutation({
    onSuccess: () => {
      toast.success("配置已暂停");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const resumeMutation = trpc.weeklyReleaseRules.resume.useMutation({
    onSuccess: () => {
      toast.success("配置已恢复");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const endMutation = trpc.weeklyReleaseRules.end.useMutation({
    onSuccess: () => {
      toast.success("配置已结束");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newRule.weekStartDate || !newRule.weekEndDate || !newRule.targetPoints) {
      toast.error("请填写所有必填字段");
      return;
    }

    // 验证比例总和为100
    const totalRatio = newRule.genesisRatio + newRule.ecoRatio + newRule.tradeRatio;
    if (totalRatio !== 100) {
      toast.error("池子比例总和必须为100%");
      return;
    }

    // 验证是否为自然周（周一到周日）
    const startDate = new Date(newRule.weekStartDate);
    const endDate = new Date(newRule.weekEndDate);
    if (startDate.getDay() !== 1) {
      toast.error("开始时间必须是周一");
      return;
    }
    if (endDate.getDay() !== 0) {
      toast.error("结束时间必须是周日");
      return;
    }

    createMutation.mutate({
      stageId: newRule.stageId,
      weekNumber: newRule.weekNumber,
      startDate,
      endDate,
      weeklyPointsTarget: newRule.targetPoints,
      pGenesisPercent: newRule.genesisRatio.toString(),
      pEcoPercent: newRule.ecoRatio.toString(),
      pTradePercent: newRule.tradeRatio.toString(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">激活中</span>;
      case "paused":
        return <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">已暂停</span>;
      case "ended":
        return <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">已结束</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">周配置管理</h1>
          <p className="text-muted-foreground mt-1">
            按自然周配置积分释放规则（周一00:00 - 周日23:59）
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建周配置
        </Button>
      </div>

      {/* 说明卡片 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            周配置说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>• <strong>自然周</strong>：配置生效时间必须是完整的自然周（周一00:00 - 周日23:59）</p>
          <p>• <strong>唯一性</strong>：同一时间段只能有一个配置规则生效，重复配置会提示报错</p>
          <p>• <strong>状态管理</strong>：支持激活中、已暂停、已结束三种状态</p>
          <p>• <strong>预算约束</strong>：所有周配置的积分总和不能超过阶段总预算</p>
        </CardContent>
      </Card>

      {/* 周配置列表 */}
      <div className="grid gap-4">
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>第{rule.weekNumber}周</CardTitle>
                  <CardDescription>
                    {new Date(rule.startDate).toLocaleDateString()} - {new Date(rule.endDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {rule.status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseMutation.mutate({ id: rule.id })}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        暂停
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => endMutation.mutate({ id: rule.id })}
                      >
                        <StopCircle className="w-4 h-4 mr-1" />
                        结束
                      </Button>
                    </>
                  )}
                  {rule.status === "paused" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resumeMutation.mutate({ id: rule.id })}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      恢复
                    </Button>
                  )}
                  {getStatusBadge(rule.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">目标积分</p>
                  <p className="text-2xl font-bold">{rule.weeklyPointsTarget.toLocaleString()}积分</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P_Genesis</p>
                  <p className="text-2xl font-bold text-purple-600">{rule.pGenesisPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P_Eco</p>
                  <p className="text-2xl font-bold text-blue-600">{rule.pEcoPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P_Trade</p>
                  <p className="text-2xl font-bold text-green-600">{rule.pTradePercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建周配置</DialogTitle>
            <DialogDescription>
              创建新的周积分释放配置，必须选择完整的自然周（周一到周日）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>周次</Label>
              <Input
                type="number"
                placeholder="例如：1、2、3"
                value={newRule.weekNumber}
                onChange={(e) => setNewRule({ ...newRule, weekNumber: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>周开始时间（周一）</Label>
                <Input
                  type="date"
                  value={newRule.weekStartDate}
                  onChange={(e) => setNewRule({ ...newRule, weekStartDate: e.target.value })}
                />
              </div>
              <div>
                <Label>周结束时间（周日）</Label>
                <Input
                  type="date"
                  value={newRule.weekEndDate}
                  onChange={(e) => setNewRule({ ...newRule, weekEndDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>目标积分</Label>
              <Input
                type="number"
                placeholder="例如：100000"
                value={newRule.targetPoints || ""}
                onChange={(e) => setNewRule({ ...newRule, targetPoints: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>池子比例配置</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label className="text-sm text-purple-600">P_Genesis (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.genesisRatio}
                    onChange={(e) => setNewRule({ ...newRule, genesisRatio: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-sm text-blue-600">P_Eco (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.ecoRatio}
                    onChange={(e) => setNewRule({ ...newRule, ecoRatio: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-sm text-green-600">P_Trade (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.tradeRatio}
                    onChange={(e) => setNewRule({ ...newRule, tradeRatio: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                当前总和：{newRule.genesisRatio + newRule.ecoRatio + newRule.tradeRatio}%（必须为100%）
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
