import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    phaseDescription: "",
    totalTokens: "10000000000",
    pointsPoolPercent: "10",
    phaseReleasePercent: "2",
    weekCount: 12,
    dynamicPoolPercent: "70",
    genesisPoolPercent: "30",
    pGenesisPercent: "40",
    pEcoPercent: "40",
    pTradePercent: "20",
    rulesConfig: "",
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
            管理每个阶段的积分释放规则、池子比例和计算规则
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建配置
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新的积分配置</DialogTitle>
              <DialogDescription>
                配置新阶段的积分释放规则和分池比例
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phase">阶段标识</Label>
                  <Input
                    id="phase"
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                    placeholder="S0, S1, S2..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekCount">周期数（周）</Label>
                  <Input
                    id="weekCount"
                    type="number"
                    value={formData.weekCount}
                    onChange={(e) => setFormData({ ...formData, weekCount: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phaseDescription">阶段描述</Label>
                <Textarea
                  id="phaseDescription"
                  value={formData.phaseDescription}
                  onChange={(e) => setFormData({ ...formData, phaseDescription: e.target.value })}
                  placeholder="描述该阶段的目标和特点"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalTokens">代币总量</Label>
                  <Input
                    id="totalTokens"
                    value={formData.totalTokens}
                    onChange={(e) => setFormData({ ...formData, totalTokens: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsPoolPercent">积分池占比(%)</Label>
                  <Input
                    id="pointsPoolPercent"
                    value={formData.pointsPoolPercent}
                    onChange={(e) => setFormData({ ...formData, pointsPoolPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phaseReleasePercent">该阶段释放(%)</Label>
                  <Input
                    id="phaseReleasePercent"
                    value={formData.phaseReleasePercent}
                    onChange={(e) => setFormData({ ...formData, phaseReleasePercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dynamicPoolPercent">动态池占比(%)</Label>
                  <Input
                    id="dynamicPoolPercent"
                    value={formData.dynamicPoolPercent}
                    onChange={(e) => setFormData({ ...formData, dynamicPoolPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genesisPoolPercent">创世池占比(%)</Label>
                  <Input
                    id="genesisPoolPercent"
                    value={formData.genesisPoolPercent}
                    onChange={(e) => setFormData({ ...formData, genesisPoolPercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pGenesisPercent">P_Genesis(%)</Label>
                  <Input
                    id="pGenesisPercent"
                    value={formData.pGenesisPercent}
                    onChange={(e) => setFormData({ ...formData, pGenesisPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pEcoPercent">P_Eco(%)</Label>
                  <Input
                    id="pEcoPercent"
                    value={formData.pEcoPercent}
                    onChange={(e) => setFormData({ ...formData, pEcoPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pTradePercent">P_Trade(%)</Label>
                  <Input
                    id="pTradePercent"
                    value={formData.pTradePercent}
                    onChange={(e) => setFormData({ ...formData, pTradePercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rulesConfig">规则配置 (JSON)</Label>
                <Textarea
                  id="rulesConfig"
                  value={formData.rulesConfig}
                  onChange={(e) => setFormData({ ...formData, rulesConfig: e.target.value })}
                  placeholder='{"eco": {"watchHourScore": 1, "tipFeeMultiplier": 5}, ...}'
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>配置列表</CardTitle>
          <CardDescription>查看和管理所有阶段的积分配置</CardDescription>
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
                  <TableHead>状态</TableHead>
                  <TableHead>阶段</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>周期</TableHead>
                  <TableHead>释放比例</TableHead>
                  <TableHead>分池比例</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs?.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      {config.isActive ? (
                        <Badge variant="default" className="gap-1">
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
                    <TableCell className="font-medium">{config.phase}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {config.phaseDescription || "-"}
                    </TableCell>
                    <TableCell>{config.weekCount}周</TableCell>
                    <TableCell>{config.phaseReleasePercent}%</TableCell>
                    <TableCell className="text-xs">
                      G:{config.pGenesisPercent}% / E:{config.pEcoPercent}% / T:{config.pTradePercent}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(config.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!config.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(config.id)}
                          disabled={setActiveMutation.isPending}
                        >
                          设为激活
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
    </div>
  );
}
