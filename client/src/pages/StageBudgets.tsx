import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, AlertCircle } from "lucide-react";

export default function StageBudgets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStage, setNewStage] = useState({
    stageName: "",
    totalBudget: 0,
    startDate: "",
    endDate: "",
  });

  const { data: stages, isLoading, refetch } = trpc.stageBudget.list.useQuery();
  const createMutation = trpc.stageBudget.create.useMutation({
    onSuccess: () => {
      toast.success("阶段创建成功");
      setIsCreateDialogOpen(false);
      setNewStage({ stageName: "", totalBudget: 0, startDate: "", endDate: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const endMutation = trpc.stageBudget.end.useMutation({
    onSuccess: () => {
      toast.success("阶段已结束");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newStage.stageName || !newStage.totalBudget || !newStage.startDate || !newStage.endDate) {
      toast.error("请填写所有必填字段");
      return;
    }

    createMutation.mutate({
      stageName: newStage.stageName,
      totalBudget: newStage.totalBudget,
      startDate: new Date(newStage.startDate),
      endDate: new Date(newStage.endDate),
    });
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
          <h1 className="text-3xl font-bold">阶段管理</h1>
          <p className="text-muted-foreground mt-1">
            管理积分发放的阶段预算（S0/S1/S2等）
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建阶段
        </Button>
      </div>

      {/* 说明卡片 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            阶段总预算说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>• <strong>阶段总预算</strong>：设定该阶段可释放的积分上限（预算控制）</p>
          <p>• <strong>约束规则</strong>：该阶段时间范围内所有周实际释放的积分总和 ≤ 阶段总预算</p>
          <p>• <strong>解耦关系</strong>：阶段总预算是"天花板"，周释放配置是"实际执行"</p>
        </CardContent>
      </Card>

      {/* 阶段列表 */}
      <div className="grid gap-4">
        {stages?.map((stage) => (
          <Card key={stage.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{stage.stageName}</CardTitle>
                  <CardDescription>
                    {new Date(stage.startDate).toLocaleDateString()} - {new Date(stage.endDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {stage.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => endMutation.mutate({ id: stage.id })}
                    >
                      结束阶段
                    </Button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    stage.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {stage.status === "active" ? "进行中" : "已结束"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">阶段总预算</p>
                  <p className="text-2xl font-bold">{stage.totalBudget.toLocaleString()}积分</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已使用预算</p>
                  <p className="text-2xl font-bold">{stage.usedBudget.toLocaleString()}积分</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">剩余预算</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(stage.totalBudget - stage.usedBudget).toLocaleString()}积分
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(stage.usedBudget / stage.totalBudget) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  预算使用率：{((stage.usedBudget / stage.totalBudget) * 100).toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建阶段</DialogTitle>
            <DialogDescription>
              创建新的积分发放阶段，设置总预算和时间范围
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>阶段标识</Label>
              <Input
                placeholder="例如：S0、S1、S2"
                value={newStage.stageName}
                onChange={(e) => setNewStage({ ...newStage, stageName: e.target.value })}
              />
            </div>
            <div>
              <Label>阶段总预算（积分）</Label>
              <Input
                type="number"
                placeholder="例如：1000000"
                value={newStage.totalBudget || ""}
                onChange={(e) => setNewStage({ ...newStage, totalBudget: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>开始时间</Label>
              <Input
                type="date"
                value={newStage.startDate}
                onChange={(e) => setNewStage({ ...newStage, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>结束时间</Label>
              <Input
                type="date"
                value={newStage.endDate}
                onChange={(e) => setNewStage({ ...newStage, endDate: e.target.value })}
              />
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
