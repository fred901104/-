import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Trades() {
  const { data: trades, isLoading, refetch } = trpc.trades.list.useQuery();
  const freezeMutation = trpc.trades.freeze.useMutation();
  
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");

  const handleFreeze = async () => {
    if (!selectedTrade || !freezeReason) {
      toast.error("请填写冻结原因");
      return;
    }

    try {
      await freezeMutation.mutateAsync({
        id: selectedTrade.trade.id,
        reason: freezeReason,
      });

      toast.success("交易已冻结");
      setFreezeDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("操作失败，请重试");
    }
  };

  const openFreezeDialog = (trade: any) => {
    setSelectedTrade(trade);
    setFreezeReason("");
    setFreezeDialogOpen(true);
  };

  const suspiciousCount = trades?.filter(t => t.trade.isSuspicious === 1).length || 0;
  const frozenCount = trades?.filter(t => t.trade.status === "frozen").length || 0;
  const totalVolume = (trades?.reduce((sum, t) => sum + (t.trade.volume || 0), 0) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">P_Trade 交易积分账本</h1>
        <p className="text-muted-foreground mt-2">
          监控用户交易数据、手续费贡献和风控检测，防止刷量对敲
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总交易量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">统计周期内</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可疑交易</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspiciousCount}</div>
            <p className="text-xs text-muted-foreground mt-1">疑似自我对敲</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已冻结</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frozenCount}</div>
            <p className="text-xs text-muted-foreground mt-1">积分已冻结</p>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>交易积分明细</CardTitle>
          <CardDescription>监控异常交易行为并进行风控处理</CardDescription>
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
                  <TableHead>ID</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>交易对</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>手续费(U)</TableHead>
                  <TableHead>持仓时长</TableHead>
                  <TableHead>开单数</TableHead>
                  <TableHead>交易量</TableHead>
                  <TableHead>预估积分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades?.map((item) => {
                  const trade = item.trade;
                  const user = item.user;

                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">#{trade.id}</TableCell>
                      <TableCell>{user?.name || "未知"}</TableCell>
                      <TableCell className="font-mono">{trade.tradePair}</TableCell>
                      <TableCell>
                        <Badge variant={trade.tradeType === "futures" ? "default" : "secondary"}>
                          {trade.tradeType === "futures" ? "合约" : "现货"}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.feeAmount}</TableCell>
                      <TableCell>{Math.round((trade.holdingDuration || 0) / 3600)}小时</TableCell>
                      <TableCell>{trade.orderCount}</TableCell>
                      <TableCell>${trade.volume?.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{trade.estimatedPoints}</TableCell>
                      <TableCell>
                        {trade.status === "frozen" ? (
                          <Badge variant="destructive">已冻结</Badge>
                        ) : trade.isSuspicious === 1 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            可疑
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">正常</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {trade.status === "normal" && trade.isSuspicious === 1 && (
                          <Button size="sm" variant="destructive" onClick={() => openFreezeDialog(item)}>
                            冻结
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Freeze Dialog */}
      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>冻结交易积分</DialogTitle>
            <DialogDescription>
              冻结该交易的积分发放，待人工核查后处理
            </DialogDescription>
          </DialogHeader>

          {selectedTrade && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">交易ID</span>
                  <span className="font-medium">#{selectedTrade.trade.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">用户</span>
                  <span className="font-medium">{selectedTrade.user?.name || "未知"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">预估积分</span>
                  <span className="font-medium">{selectedTrade.trade.estimatedPoints}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="freezeReason">冻结原因</Label>
                <Textarea
                  id="freezeReason"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="请详细说明冻结原因，如：疑似自我对敲、异常交易模式等..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleFreeze}>
              确认冻结
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
