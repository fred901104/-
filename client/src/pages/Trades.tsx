import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, FilterConfig, FilterValues } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { AlertCircle, CheckCircle, Lock, Unlock, TrendingUp, DollarSign, Clock, AlertTriangle, Download } from "lucide-react";
import { exportToExcel, formatTradeForExport } from "@/lib/export";
import { toast } from "sonner";

export default function Trades() {
  const [filterValues, setFilterValues] = useState<FilterValues>({ search: "" });
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [frozenDetailsOpen, setFrozenDetailsOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: trades, isLoading } = trpc.trades.list.useQuery();
  const freezeMutation = trpc.trades.freeze.useMutation();

  const filterConfig: FilterConfig = {
    searchPlaceholder: "搜索用户UID、交易对...",
    filters: [
      {
        key: "type",
        label: "交易类型",
        options: [
          { value: "spot", label: "现货" },
          { value: "futures", label: "合约" },
        ],
      },
      {
        key: "status",
        label: "积分状态",
        options: [
          { value: "normal", label: "正常" },
          { value: "frozen", label: "已冻结" },
          { value: "suspicious", label: "可疑" },
        ],
      },
    ],
    showDateRange: true,
  };

  // 分页逻辑
  const paginatedTrades = useMemo(() => {
    if (!trades) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return trades.slice(startIndex, endIndex);
  }, [trades, currentPage, pageSize]);
  
  const totalPages = Math.ceil((trades?.length || 0) / pageSize);

  // 模拟冻结记录数据
  const mockFrozenRecords = [
    {
      id: 1,
      tradeId: 12345,
      userId: 1001,
      amount: 25.50,
      reason: "自我对敲检测",
      frozenAt: "2026-01-06 14:30:00",
      frozenBy: "System",
    },
    {
      id: 2,
      tradeId: 12346,
      userId: 1001,
      amount: 18.30,
      reason: "高频对倒",
      frozenAt: "2026-01-06 15:45:00",
      frozenBy: "System",
    },
    {
      id: 3,
      tradeId: 12347,
      userId: 1001,
      amount: 32.10,
      reason: "同IP关联账户",
      frozenAt: "2026-01-06 16:20:00",
      frozenBy: "Admin",
    },
  ];

  const handleFreeze = async (trade: any) => {
    try {
      await freezeMutation.mutateAsync({ 
        id: trade.trade.id, 
        reason: "手动冻结" 
      });
      toast.success("积分已冻结");
      setFreezeDialogOpen(false);
    } catch (error) {
      toast.error("冻结失败");
    }
  };

  const handleUnfreeze = async (trade: any) => {
    toast.info("解冻功能待实现");
  };

  const calculateTradePoints = (trade: any) => {
    const feePoints = (trade.fee || 0) * 10; // 手续费 * 10
    const holdingBonus = (trade.holdingDuration || 0) * 0.1; // 持仓时长奖励
    const openBonus = trade.isValidOpen ? 5 : 0; // 有效开单奖励
    return (feePoints + holdingBonus + openBonus).toFixed(2);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">P_Trade 交易积分账本</h1>
          <p className="text-muted-foreground mt-1">
            监控交易数据、积分计算和风控检测
          </p>
        </div>
        <Button
          onClick={() => {
            if (!trades || trades.length === 0) {
              toast.error("没有可导出的数据");
              return;
            }
            const exportData = trades.map(formatTradeForExport);
            exportToExcel(exportData, `交易记录_${new Date().toLocaleDateString("zh-CN")}`, "交易数据");
            toast.success("导出成功！");
          }}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        config={filterConfig}
        values={filterValues}
        onChange={setFilterValues}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总交易量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234,567</div>
            <p className="text-xs text-muted-foreground mt-1">
              现货 + 合约
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总手续费
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,345</div>
            <p className="text-xs text-muted-foreground mt-1">
              累计手续费收入
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              已发放积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">123,456</div>
            <p className="text-xs text-muted-foreground mt-1">
              正常发放积分
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              冻结积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">1,234</div>
            <p className="text-xs text-muted-foreground mt-1">
              可疑交易冻结
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>交易积分明细</CardTitle>
          <CardDescription>
            手续费贡献、持仓时长、有效开单数统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">序号</TableHead>
                    <TableHead>交易时间</TableHead>
                    <TableHead>用户UID</TableHead>
                    <TableHead>交易类型</TableHead>
                    <TableHead>交易对</TableHead>
                    <TableHead>交易量</TableHead>
                    <TableHead>手续费</TableHead>
                    <TableHead>持仓时长</TableHead>
                    <TableHead>有效开单</TableHead>
                    <TableHead>计算积分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrades?.map((trade, index) => {
                    const globalIndex = (trades?.length || 0) - ((currentPage - 1) * pageSize + index);
                    const isSuspicious = Math.random() > 0.8; // 模拟可疑检测
                    const isFrozen = Math.random() > 0.9; // 模拟冻结状态
                    
                    return (
                      <TableRow key={trade.trade.id}>
                        <TableCell className="text-center text-muted-foreground">{globalIndex}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(trade.trade.createdAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </TableCell>
                        <TableCell className="font-mono">{trade.trade.userId}</TableCell>
                        <TableCell>
                          <Badge variant={trade.trade.tradeType === "spot" ? "default" : "secondary"}>
                            {trade.trade.tradeType === "spot" ? "现货" : "合约"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{trade.trade.tradePair}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            ${(trade.trade.volume || 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            ${trade.trade.feeAmount.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {trade.trade.holdingDuration || 0}h
                          </div>
                        </TableCell>
                        <TableCell>
                          {(trade.trade.orderCount || 0) > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {calculateTradePoints(trade)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isFrozen ? (
                            <Badge variant="destructive" className="gap-1">
                              <Lock className="h-3 w-3" />
                              已冻结
                            </Badge>
                          ) : isSuspicious ? (
                            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                              <AlertTriangle className="h-3 w-3" />
                              可疑
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              正常
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {isFrozen ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTrade(trade);
                                    setFrozenDetailsOpen(true);
                                  }}
                                >
                                  查看详情
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  onClick={() => handleUnfreeze(trade)}
                                >
                                  <Unlock className="h-3 w-3 mr-1" />
                                  解冻
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrade(trade);
                                  setFreezeDialogOpen(true);
                                }}
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                冻结
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* 分页组件 */}
              {!isLoading && trades && trades.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={trades.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Control Info */}
      <Card>
        <CardHeader>
          <CardTitle>风控规则说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>自我对敲检测：</strong>同IP或关联账户高频对倒交易</p>
            <p><strong>刷量检测：</strong>异常高频交易、极小金额反复交易</p>
            <p><strong>积分冻结：</strong>可疑交易积分自动冻结，待人工审核</p>
            <p><strong>解冻流程：</strong>运营审核后可手动解冻，积分重新发放</p>
          </div>
        </CardContent>
      </Card>

      {/* Freeze Dialog */}
      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>冻结积分</DialogTitle>
            <DialogDescription>
              确认冻结该交易的积分？冻结后需要人工审核才能解冻。
            </DialogDescription>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-2 text-sm">
              <p><strong>用户UID:</strong> {selectedTrade.userId}</p>
              <p><strong>交易对:</strong> {selectedTrade.pair}</p>
              <p><strong>计算积分:</strong> {calculateTradePoints(selectedTrade)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => selectedTrade && handleFreeze(selectedTrade)}>
              确认冻结
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Frozen Details Dialog */}
      <Dialog open={frozenDetailsOpen} onOpenChange={setFrozenDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>冻结记录详情</DialogTitle>
            <DialogDescription>
              查看该用户的所有冻结记录（共{mockFrozenRecords.length}条）
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>交易ID</TableHead>
                  <TableHead>冻结积分</TableHead>
                  <TableHead>冻结原因</TableHead>
                  <TableHead>冻结时间</TableHead>
                  <TableHead>操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFrozenRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.tradeId}</TableCell>
                    <TableCell className="font-bold text-orange-600">
                      {record.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{record.reason}</TableCell>
                    <TableCell>{record.frozenAt}</TableCell>
                    <TableCell>
                      <Badge variant={record.frozenBy === "System" ? "secondary" : "default"}>
                        {record.frozenBy}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">累计冻结积分</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {mockFrozenRecords.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
