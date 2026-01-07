import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Plus, CheckCircle2, Circle } from "lucide-react";

export default function PointsConfig() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phase: "S0",
    weeklyPointsTarget: 100000,
    pGenesisPercent: "40",
    pEcoPercent: "40",
    pTradePercent: "20",
  });

  const { data: configs, isLoading, refetch } = trpc.pointsConfig.list.useQuery();
  const createMutation = trpc.pointsConfig.create.useMutation({
    onSuccess: () => {
      toast.success("配置创建成功");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const setActiveMutation = trpc.pointsConfig.setActive.useMutation({
    onSuccess: () => {
      toast.success("已切换激活配置");
      refetch();
    },
    onError: (error) => {
      toast.error(`切换失败: ${error.message}`);
    },
  });

  const handleCreate = () => {
    // 验证百分比总和为100
    const total = parseFloat(formData.pGenesisPercent) + parseFloat(formData.pEcoPercent) + parseFloat(formData.pTradePercent);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("三个池的百分比总和必须为100%");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSetActive = (id: number) => {
    setActiveMutation.mutate({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            积分配置管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理每个阶段的周期积分发放目标和分池比例
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建配置
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>创建新的积分配置</DialogTitle>
              <DialogDescription>
                配置新阶段的周期积分发放目标和分池比例
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phase">阶段标识</Label>
                <Input
                  id="phase"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  placeholder="S0, S1, S2..."
                />
                <p className="text-xs text-muted-foreground">
                  例如：S0（第0阶段）、S1（第1阶段）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyPointsTarget">周期预计释放积分</Label>
                <Input
                  id="weeklyPointsTarget"
                  type="number"
                  value={formData.weeklyPointsTarget}
                  onChange={(e) => setFormData({ ...formData, weeklyPointsTarget: parseInt(e.target.value) || 0 })}
                  placeholder="100000"
                />
                <p className="text-xs text-muted-foreground">
                  该阶段每周预计释放的积分总量（按自然周统计和结算）
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pGenesisPercent">P_Genesis占比(%)</Label>
                  <Input
                    id="pGenesisPercent"
                    value={formData.pGenesisPercent}
                    onChange={(e) => setFormData({ ...formData, pGenesisPercent: e.target.value })}
                    placeholder="40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pEcoPercent">P_Eco占比(%)</Label>
                  <Input
                    id="pEcoPercent"
                    value={formData.pEcoPercent}
                    onChange={(e) => setFormData({ ...formData, pEcoPercent: e.target.value })}
                    placeholder="40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pTradePercent">P_Trade占比(%)</Label>
                  <Input
                    id="pTradePercent"
                    value={formData.pTradePercent}
                    onChange={(e) => setFormData({ ...formData, pTradePercent: e.target.value })}
                    placeholder="20"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                三个池的百分比总和必须为100%
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建配置"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Config Card */}
      {configs && configs.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              当前激活配置
            </CardTitle>
            <CardDescription>当前生效的积分释放规则</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeConfig = configs.find(c => c.isActive === 1);
              if (!activeConfig) return <p className="text-muted-foreground">暂无激活配置</p>;
              
              return (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">阶段标识</p>
                    <p className="text-2xl font-bold">{activeConfig.phase}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">周期预计释放积分</p>
                    <p className="text-2xl font-bold">{activeConfig.weeklyPointsTarget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">分池比例</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-purple-600">P_Genesis: {activeConfig.pGenesisPercent}%</Badge>
                      <Badge variant="outline" className="text-blue-600">P_Eco: {activeConfig.pEcoPercent}%</Badge>
                      <Badge variant="outline" className="text-green-600">P_Trade: {activeConfig.pTradePercent}%</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="text-sm">{new Date(activeConfig.createdAt).toLocaleString("zh-CN")}</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* All Configs Table */}
      <Card>
        <CardHeader>
          <CardTitle>所有配置</CardTitle>
          <CardDescription>历史和当前的所有积分配置</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>阶段</TableHead>
                  <TableHead>周期预计释放积分</TableHead>
                  <TableHead>P_Genesis</TableHead>
                  <TableHead>P_Eco</TableHead>
                  <TableHead>P_Trade</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs?.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.phase}</TableCell>
                    <TableCell className="font-semibold">{config.weeklyPointsTarget.toLocaleString()}</TableCell>
                    <TableCell className="text-purple-600">{config.pGenesisPercent}%</TableCell>
                    <TableCell className="text-blue-600">{config.pEcoPercent}%</TableCell>
                    <TableCell className="text-green-600">{config.pTradePercent}%</TableCell>
                    <TableCell>
                      {config.isActive === 1 ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          激活中
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Circle className="h-3 w-3" />
                          未激活
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(config.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {config.isActive !== 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(config.id)}
                          disabled={setActiveMutation.isPending}
                        >
                          激活
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-2">周期说明</p>
            <ul className="list-disc list-inside space-y-1">
              <li>统计周期：按自然日统计数据</li>
              <li>结算周期：按自然周进行结算（周一00:00 - 周日23:59）</li>
              <li>周期数：每个阶段可以包含多个自然周，具体周数可灵活调整</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-2">分池说明</p>
            <ul className="list-disc list-inside space-y-1">
              <li>P_Genesis：创世池，用于工单审核奖励（Bug、建议、必要信息）</li>
              <li>P_Eco：生态池，用于直播生态奖励（主播开播、观众参与）</li>
              <li>P_Trade：交易池，用于交易行为奖励（现货、合约交易）</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
