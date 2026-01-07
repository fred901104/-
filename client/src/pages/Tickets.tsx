import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, XCircle, FileText, Download } from "lucide-react";
import { exportToExcel, formatTicketForExport } from "@/lib/export";
import { useState, useMemo, useEffect } from "react";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";

const priorityLabels = {
  p0: { label: "P0 (*50)", color: "destructive" as const, score: 500 },
  p1: { label: "P1 (*10)", color: "default" as const, score: 100 },
  p2: { label: "P2 (*5)", color: "secondary" as const, score: 50 },
  p3: { label: "P3 (*2)", color: "outline" as const, score: 20 },
};

const typeLabels = {
  bug: { label: "Bug", icon: AlertCircle, color: "text-red-600" },
  suggestion: { label: "建议", icon: FileText, color: "text-blue-600" },
  info: { label: "必要信息", icon: FileText, color: "text-green-600" },
};

const statusLabels = {
  pending: { label: "待审核", icon: Clock, color: "text-yellow-600" },
  approved: { label: "已通过", icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "已驳回", icon: XCircle, color: "text-red-600" },
};

export default function Tickets() {
  const { data: tickets, isLoading, refetch } = trpc.tickets.list.useQuery();
  const reviewMutation = trpc.tickets.review.useMutation();
  
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [priority, setPriority] = useState<"p0" | "p1" | "p2" | "p3">("p1");
  const [finalScore, setFinalScore] = useState(100);
  const [reviewNote, setReviewNote] = useState("");
  
  // 筛选状态
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 筛选逻辑
  const filteredTickets = tickets?.filter(item => {
    const ticket = item.ticket;
    if (filterType !== "all" && ticket.type !== filterType) return false;
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false;
    if (filterPriority !== "all" && ticket.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title?.toLowerCase().includes(query) ||
        ticket.id?.toString().includes(query) ||
        ticket.userId?.toString().includes(query)
      );
    }
    return true;
  }) || [];
  
  // 分页逻辑
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  
  // 当筛选条件改变时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus, filterPriority, searchQuery]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedTicket) return;

    try {
      await reviewMutation.mutateAsync({
        id: selectedTicket.ticket.id,
        priority,
        finalScore,
        status,
        reviewNote,
      });

      toast.success(status === "approved" ? "工单已通过审核" : "工单已驳回");
      setReviewDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("操作失败，请重试");
    }
  };

  const openReviewDialog = (ticket: any) => {
    setSelectedTicket(ticket);
    setPriority("p1");
    setFinalScore(100);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  const pendingCount = tickets?.filter(t => t.ticket.status === "pending").length || 0;
  const approvedCount = tickets?.filter(t => t.ticket.status === "approved").length || 0;
  const rejectedCount = tickets?.filter(t => t.ticket.status === "rejected").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">P_Genesis 工单管理</h1>
          <p className="text-muted-foreground mt-2">
            审核用户提交的Bug、建议和必要信息，进行定级打分并发放积分
          </p>
        </div>
        <Button
          onClick={() => {
            if (!tickets || tickets.length === 0) {
              toast.error("没有可导出的数据");
              return;
            }
            const exportData = tickets.map(formatTicketForExport);
            exportToExcel(exportData, `工单列表_${new Date().toLocaleDateString("zh-CN")}`, "工单记录");
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
            <CardTitle className="text-sm font-medium">待审核</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">需要处理的工单</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已通过</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">已发放积分</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已驳回</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">不符合要求</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>筛选和搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>工单类型</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="suggestion">建议</SelectItem>
                  <SelectItem value="info">必要信息</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>工单状态</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="全部优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  <SelectItem value="p0">P0</SelectItem>
                  <SelectItem value="p1">P1</SelectItem>
                  <SelectItem value="p2">P2</SelectItem>
                  <SelectItem value="p3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>搜索</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="工单号/UID/提交人"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterType("all");
                    setFilterStatus("all");
                    setFilterPriority("all");
                    setSearchQuery("");
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            显示 {filteredTickets.length} / {tickets?.length || 0} 条工单
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>反馈工单列表</CardTitle>
          <CardDescription>点击“审核”按钮进行定级打分</CardDescription>
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
                  <TableHead className="w-[60px]">序号</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>工单号</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>BUG等级（可修改）</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>释放积分</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets?.map((item, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index + 1;
                  const ticket = item.ticket;
                  const user = item.user;
                  const TypeIcon = typeLabels[ticket.type as keyof typeof typeLabels]?.icon;
                  const StatusIcon = statusLabels[ticket.status as keyof typeof statusLabels]?.icon;

                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="text-center text-muted-foreground">{globalIndex}</TableCell>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {TypeIcon && <TypeIcon className={`h-4 w-4 ${typeLabels[ticket.type as keyof typeof typeLabels]?.color}`} />}
                          {typeLabels[ticket.type as keyof typeof typeLabels]?.label}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.title}</TableCell>
                      <TableCell>{user?.name || "未知"}</TableCell>
                      <TableCell>
                        {ticket.priority ? (
                          <Badge variant={priorityLabels[ticket.priority as keyof typeof priorityLabels]?.color}>
                            {priorityLabels[ticket.priority as keyof typeof priorityLabels]?.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusLabels[ticket.status as keyof typeof statusLabels]?.color}`} />}
                          {statusLabels[ticket.status as keyof typeof statusLabels]?.label}
                        </div>
                      </TableCell>
                      <TableCell>{ticket.finalScore || 0}</TableCell>
                      <TableCell>{new Date(ticket.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                      <TableCell>
                        {ticket.status === "pending" && (
                          <Button size="sm" onClick={() => openReviewDialog(item)}>
                            审核
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filteredTickets.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredTickets.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审核工单 #{selectedTicket?.ticket.id}</DialogTitle>
            <DialogDescription>
              根据P0-P3规则进行定级打分，系统将自动计算建议分数
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div>
                <Label>工单内容</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedTicket.ticket.title}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedTicket.ticket.content}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="priority">优先级定级</Label>
                <Select value={priority} onValueChange={(v: any) => {
                  setPriority(v);
                  setFinalScore(priorityLabels[v as keyof typeof priorityLabels]?.score || 100);
                }}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p0">P0 - 严重Bug (*50倍) - 基础分500</SelectItem>
                    <SelectItem value="p1">P1 - 重要Bug (*10倍) - 基础分100</SelectItem>
                    <SelectItem value="p2">P2 - 一般Bug (*5倍) - 基础分50</SelectItem>
                    <SelectItem value="p3">P3 - 轻微Bug (*2倍) - 基础分20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="finalScore">最终积分（可手动调整）</Label>
                <Input
                  id="finalScore"
                  type="number"
                  value={finalScore}
                  onChange={(e) => setFinalScore(Number(e.target.value))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  基础分：{priorityLabels[priority]?.score}，可根据实际情况微调
                </p>
              </div>

              <div>
                <Label htmlFor="reviewNote">审核备注（可选）</Label>
                <Textarea
                  id="reviewNote"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="记录审核理由或其他说明..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => handleReview("rejected")}>
              驳回
            </Button>
            <Button onClick={() => handleReview("approved")}>
              通过并发放积分
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
