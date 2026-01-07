import { trpc } from "@/lib/trpc";
import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { Calculator, CheckCircle, Clock, TrendingUp, Download, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportToExcel, formatSettlementForExport } from "@/lib/export";
import { toast } from "sonner";

export default function Settlements() {
  const [distributeDialogOpen, setDistributeDialogOpen] = React.useState(false);
  const [selectedSettlement, setSelectedSettlement] = React.useState<any>(null);
  
  // 筛选状态
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterWeek, setFilterWeek] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: settlements, isLoading, refetch } = trpc.settlements.list.useQuery();
  const { data: latest } = trpc.settlements.latest.useQuery();
  const distributeMutation = trpc.settlements.distribute.useMutation();
  
  // Handle null/undefined latest settlement
  const hasLatest = latest && latest !== null;

  // 筛选逻辑
  const filteredSettlements = useMemo(() => {
    if (!settlements) return [];
    return settlements.filter(s => {
      if (filterYear !== "all" && s.year.toString() !== filterYear) return false;
      if (filterWeek !== "all" && s.weekNumber.toString() !== filterWeek) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      return true;
    });
  }, [settlements, filterYear, filterWeek, filterStatus]);
  
  // 获取可用的年份和周次选项
  const availableYears = useMemo(() => {
    if (!settlements) return [];
    const years = Array.from(new Set(settlements.map(s => s.year)));
    return years.sort((a, b) => b - a);
  }, [settlements]);
  
  const availableWeeks = useMemo(() => {
    if (!settlements) return [];
    const weeks = Array.from(new Set(settlements.map(s => s.weekNumber)));
    return weeks.sort((a, b) => a - b);
  }, [settlements]);
  
  // 分页逻辑
  const paginatedSettlements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSettlements.slice(startIndex, endIndex);
  }, [filteredSettlements, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredSettlements.length / pageSize);
  
  const confirmedCount = filteredSettlements.filter(s => s.status === "confirmed").length || 0;
  const distributedCount = filteredSettlements.filter(s => s.status === "distributed").length || 0;
  const totalPoints = filteredSettlements.reduce((sum, s) => sum + (s.totalPoints || 0), 0) || 0;

  const statusLabels = {
    preview: { label: "预览中", icon: Clock, color: "text-yellow-600" },
    confirmed: { label: "已确认", icon: CheckCircle, color: "text-blue-600" },
    distributed: { label: "已发放", icon: CheckCircle, color: "text-green-600" },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">结算与发放中心</h1>
          <p className="text-muted-foreground mt-2">
            管理每周积分结算、数据回滚和积分发放流程
          </p>
        </div>
        <Button
          onClick={() => {
            if (!settlements || settlements.length === 0) {
              toast.error("没有可导出的数据");
              return;
            }
            const exportData = settlements.map(formatSettlementForExport);
            exportToExcel(exportData, `结算报表_${new Date().toLocaleDateString("zh-CN")}`, "结算记录");
            toast.success("导出成功！");
          }}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
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
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>年份</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="全部年份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年份</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>周次</Label>
              <Select value={filterWeek} onValueChange={setFilterWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="全部周次" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部周次</SelectItem>
                  {availableWeeks.map(week => (
                    <SelectItem key={week} value={week.toString()}>第{week}周</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="preview">预览中</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="distributed">已发放</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterYear("all");
                  setFilterWeek("all");
                  setFilterStatus("all");
                }}
              >
                重置筛选
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            显示 {filteredSettlements.length} / {settlements?.length || 0} 条结算记录
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">序号</TableHead>
                  <TableHead>周次</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>日期范围</TableHead>
                  <TableHead>总积分</TableHead>
                  <TableHead>P_Genesis</TableHead>
                  <TableHead>P_Eco</TableHead>
                  <TableHead>P_Trade</TableHead>
                  <TableHead>预发放积分</TableHead>
                  <TableHead>实际发放</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSettlements?.map((settlement, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index + 1;
                  const StatusIcon = statusLabels[settlement.status as keyof typeof statusLabels]?.icon;

                  return (
                    <TableRow key={settlement.id}>
                      <TableCell className="text-center text-muted-foreground">{globalIndex}</TableCell>
                      <TableCell className="font-medium">第{settlement.weekNumber}周</TableCell>
                      <TableCell>{settlement.year}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(settlement.startDate).toLocaleDateString("zh-CN")} - {new Date(settlement.endDate).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="font-semibold">{settlement.totalPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-purple-600">{settlement.genesisPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-blue-600">{settlement.ecoPoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">{settlement.tradePoints?.toLocaleString()}</TableCell>
                      <TableCell className="text-orange-600 font-medium">
                        {settlement.preDistributionPoints?.toLocaleString() || settlement.totalPoints?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-600 font-bold">
                        {(settlement.actualDistributionPoints || 0) > 0 ? (settlement.actualDistributionPoints || 0).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusLabels[settlement.status as keyof typeof statusLabels]?.color}`} />}
                          {statusLabels[settlement.status as keyof typeof statusLabels]?.label}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(settlement.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                      <TableCell>
                        {settlement.status !== "distributed" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSettlement(settlement);
                              setDistributeDialogOpen(true);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            发放
                          </Button>
                        )}
                        {settlement.status === "distributed" && settlement.distributedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(settlement.distributedAt).toLocaleDateString("zh-CN")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* 分页组件 */}
            {filteredSettlements && filteredSettlements.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredSettlements.length}
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

      {/* Distribute Confirmation Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发放积分</DialogTitle>
            <DialogDescription>
              请确认是否将该周的积分发放给用户？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedSettlement && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">周次：</span>
                <span className="font-medium">第{selectedSettlement.weekNumber}周 ({selectedSettlement.year})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">日期范围：</span>
                <span className="font-medium">
                  {new Date(selectedSettlement.startDate).toLocaleDateString("zh-CN")} - {new Date(selectedSettlement.endDate).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">总积分：</span>
                <span className="font-bold text-lg">{selectedSettlement.totalPoints?.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">P_Genesis：</span>
                  <span className="font-medium">{selectedSettlement.genesisPoints?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">P_Eco：</span>
                  <span className="font-medium">{selectedSettlement.ecoPoints?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">P_Trade：</span>
                  <span className="font-medium">{selectedSettlement.tradePoints?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedSettlement) return;
                try {
                  await distributeMutation.mutateAsync({ 
                    id: selectedSettlement.id,
                    actualPoints: selectedSettlement.totalPoints,
                  });
                  toast.success("积分发放成功！");
                  setDistributeDialogOpen(false);
                  refetch();
                } catch (error: any) {
                  toast.error(error.message || "发放失败，请重试");
                }
              }}
              disabled={distributeMutation.isPending}
            >
              {distributeMutation.isPending ? "发放中..." : "确认发放"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
