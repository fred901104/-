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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, XCircle, FileText, Download } from "lucide-react";
import { exportToExcel, formatDateTime } from "@/lib/exportToExcel";
import { useState, useMemo, useEffect } from "react";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead, SortDirection } from "@/components/SortableTableHead";
import { UserPointsTable } from "@/components/UserPointsTable";
import { ExportPreviewDialog } from "@/components/ExportPreviewDialog";
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
  // Tab状态
  const [activeTab, setActiveTab] = useState("tickets");
  
  // 阶段筛选状态（全局）
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(undefined);
  
  // 获取阶段列表
  const { data: stages } = trpc.stageBudget.list.useQuery();
  
  // 根据选中的阶段获取数据
  const { data: tickets, isLoading, refetch } = trpc.tickets.list.useQuery(
    selectedStageId ? { stageId: selectedStageId } : undefined
  );
  
  // 获取用户积分统计（根据阶段筛选）
  const { data: userPoints, isLoading: isLoadingUserPoints } = trpc.tickets.userPoints.useQuery(
    selectedStageId ? { stageId: selectedStageId } : undefined
  );
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
  
  // 排序状态
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // 切换排序方向：null -> asc -> desc -> null
      if (sortDirection === null) {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  const [searchQuery, setSearchQuery] = useState("");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 导出预览对话框状态
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportType, setExportType] = useState<'tickets' | 'userPoints'>('tickets');
  
  // 导出历史记录mutation
  const createExportHistory = trpc.exportHistory.create.useMutation();

  // 导出工单表功能
  const handleExportTickets = () => {
    setExportType('tickets');
    setShowExportPreview(true);
  };
  
  const confirmExportTickets = (selectedColumns?: string[]) => {
    const exportData = sortedTickets.map((item, index) => {
      const date = new Date(item.ticket.createdAt);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const seqNum = String(item.ticket.id).padStart(6, '0');
      const orderNo = `${dateStr}-GEN-${seqNum}`;
      
      return {
        '序号': sortedTickets.length - index,
        '创建时间': formatDateTime(item.ticket.createdAt),
        '订单号': orderNo,
        'UID': item.user?.openId || '-',
        '用户名': item.user?.name || '-',
        '内容': typeLabels[item.ticket.type as keyof typeof typeLabels]?.label || item.ticket.type,
        '工单号': item.ticket.title,
        'BUG等级': item.ticket.priority ? priorityLabels[item.ticket.priority as keyof typeof priorityLabels]?.label : '-',
        '状态': statusLabels[item.ticket.status as keyof typeof statusLabels]?.label,
        '释放积分': item.ticket.finalScore || 0,
        '阶段': item.stage?.stageName || '-',
      };
    });
    
    // 构建筛选条件摘要
    const selectedStage = stages?.find(s => s.id === selectedStageId);
    const filterSummary = {
      exportTime: formatDateTime(new Date()),
      stage: selectedStage ? selectedStage.stageName : '全部阶段',
      type: filterType === 'all' ? '全部类型' : (typeLabels[filterType as keyof typeof typeLabels]?.label || filterType),
      status: filterStatus === 'all' ? '全部状态' : (statusLabels[filterStatus as keyof typeof statusLabels]?.label || filterStatus),
      '搜索关键词': searchQuery || '无',
    };
    
    const filename = `P_Genesis工单列表_${new Date().toLocaleDateString()}.xlsx`;
    exportToExcel(exportData, filename.replace('.xlsx', ''), 'P_Genesis工单列表', filterSummary, selectedColumns);
    
    // 记录导出历史
    createExportHistory.mutate({
      exportType: 'tickets',
      exportTable: 'P_Genesis工单列表',
      recordCount: exportData.length,
      columnCount: selectedColumns ? selectedColumns.length : Object.keys(exportData[0] || {}).length,
      filterConditions: JSON.stringify(filterSummary),
      selectedColumns: selectedColumns ? JSON.stringify(selectedColumns) : undefined,
      filename,
    });
    
    toast.success("工单列表已导出");
  };

  useEffect(() => {
    if (priority) {
      setFinalScore(priorityLabels[priority].score);
    }
  }, [priority]);

  // 筛选和排序逻辑
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter((item) => {
      const ticket = item.ticket;
      
      // 类型筛选
      if (filterType !== "all" && ticket.type !== filterType) {
        return false;
      }
      
      // 状态筛选
      if (filterStatus !== "all" && ticket.status !== filterStatus) {
        return false;
      }
      
      // 等级筛选
      if (filterPriority !== "all" && ticket.priority !== filterPriority) {
        return false;
      }
      
      // 搜索筛选
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ticket.title?.toLowerCase().includes(query);
        const matchesContent = ticket.content?.toLowerCase().includes(query);
        const matchesUid = item.user?.openId?.toLowerCase().includes(query);
        const matchesUserName = item.user?.name?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesContent && !matchesUid && !matchesUserName) {
          return false;
        }
      }
      
      return true;
    });
  }, [tickets, filterType, filterStatus, filterPriority, searchQuery]);

  const sortedTickets = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredTickets;
    
    const sorted = [...filteredTickets].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case "createdAt":
          aValue = new Date(a.ticket.createdAt).getTime();
          bValue = new Date(b.ticket.createdAt).getTime();
          break;
        case "finalScore":
          aValue = a.ticket.finalScore || 0;
          bValue = b.ticket.finalScore || 0;
          break;
        case "priority":
          const priorityOrder = { p0: 4, p1: 3, p2: 2, p3: 1 };
          aValue = priorityOrder[a.ticket.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.ticket.priority as keyof typeof priorityOrder] || 0;
          break;
        case "status":
          const statusOrder = { pending: 3, approved: 2, rejected: 1 };
          aValue = statusOrder[a.ticket.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.ticket.status as keyof typeof statusOrder] || 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [filteredTickets, sortKey, sortDirection]);

  // 分页逻辑
  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedTicket) return;
    
    try {
      await reviewMutation.mutateAsync({
        id: selectedTicket.ticket.id,
        status,
        priority,
        finalScore,
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
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">P_Genesis 创世池</h1>
        <p className="text-muted-foreground mt-2">
          审核用户提交的Bug、建议和必要信息，进行定级打分并发放积分
        </p>
      </div>

      {/* 全局阶段筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-base font-semibold">阶段筛选：</Label>
            <Select 
              value={selectedStageId?.toString() || "all"} 
              onValueChange={(value) => setSelectedStageId(value === "all" ? undefined : parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="全部阶段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {stages?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    {stage.stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              筛选后将同时影响反馈工单表和用户积分获取表
            </p>
          </div>
        </CardContent>
      </Card>

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

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tickets">反馈工单表</TabsTrigger>
          <TabsTrigger value="userPoints">用户积分获取表</TabsTrigger>
        </TabsList>

        {/* Tab 1: 反馈工单表 */}
        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>筛选和搜索</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>内容类型</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="suggestion">建议</SelectItem>
                      <SelectItem value="info">必要信息</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="approved">已通过</SelectItem>
                      <SelectItem value="rejected">已驳回</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>BUG等级</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="p0">P0</SelectItem>
                      <SelectItem value="p1">P1</SelectItem>
                      <SelectItem value="p2">P2</SelectItem>
                      <SelectItem value="p3">P3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>搜索</Label>
                  <Input
                    placeholder="搜索工单号、UID、用户名、内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>反馈工单列表</CardTitle>
                  <CardDescription>共 {filteredTickets.length} 条记录</CardDescription>
                </div>
                <Button
                  onClick={handleExportTickets}
                  className="gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  导出Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">序号</TableHead>
                      <SortableTableHead
                        sortKey="createdAt"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        创建时间
                      </SortableTableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead>工单号</TableHead>
                      <SortableTableHead
                        sortKey="priority"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        BUG等级（可修改）
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="status"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        状态
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="finalScore"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        释放积分
                      </SortableTableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((item, index) => {
                      const ticket = item.ticket;
                      const user = item.user;
                      const stage = item.stage;
                      const TypeIcon = typeLabels[ticket.type as keyof typeof typeLabels]?.icon;
                      const StatusIcon = statusLabels[ticket.status as keyof typeof statusLabels]?.icon;
                      
                      const date = new Date(ticket.createdAt);
                      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                      const seqNum = String(ticket.id).padStart(6, '0');
                      const orderNo = `${dateStr}-GEN-${seqNum}`;
                      
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell>{sortedTickets.length - ((currentPage - 1) * pageSize + index)}</TableCell>
                          <TableCell>{new Date(ticket.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                          <TableCell className="font-mono text-xs">{orderNo}</TableCell>
                          <TableCell>{user?.openId || "-"}</TableCell>
                          <TableCell>{user?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {TypeIcon && <TypeIcon className={`h-4 w-4 ${typeLabels[ticket.type as keyof typeof typeLabels]?.color}`} />}
                              {typeLabels[ticket.type as keyof typeof typeLabels]?.label}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
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
                          <TableCell>
                            {stage ? (
                              <Badge variant="outline">{stage.stageName}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {ticket.createdBy && (
                                <div>
                                  <span className="text-muted-foreground">创建:</span> 用户ID: {ticket.createdBy}
                                </div>
                              )}
                              {ticket.reviewedBy && (
                                <div>
                                  <span className="text-muted-foreground">审核:</span> 用户ID: {ticket.reviewedBy}
                                </div>
                              )}
                              {ticket.modifiedBy && (
                                <div>
                                  <span className="text-muted-foreground">修改:</span> 用户ID: {ticket.modifiedBy}
                                </div>
                              )}
                              {!ticket.createdBy && !ticket.reviewedBy && !ticket.modifiedBy && (
                                <span className="text-muted-foreground">无</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {ticket.status === "pending" && (
                                <Button size="sm" onClick={() => openReviewDialog(item)}>
                                  审核
                                </Button>
                              )}
                            </div>
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
        </TabsContent>

        {/* Tab 2: 用户积分获取表 */}
        <TabsContent value="userPoints">
          <UserPointsTable 
            data={userPoints || []} 
            poolName="P_Genesis 创世池" 
            isLoading={isLoadingUserPoints}
          />
        </TabsContent>
      </Tabs>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>提交用户</Label>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-sm">{selectedTicket.user?.name || "未知用户"}</p>
                    <p className="text-xs text-muted-foreground">{selectedTicket.user?.openId}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>工单类型</Label>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-sm">
                      {typeLabels[selectedTicket.ticket.type as keyof typeof typeLabels]?.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>BUG等级</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p0">P0 - 致命Bug (*50)</SelectItem>
                    <SelectItem value="p1">P1 - 严重Bug (*10)</SelectItem>
                    <SelectItem value="p2">P2 - 一般Bug (*5)</SelectItem>
                    <SelectItem value="p3">P3 - 轻微Bug (*2)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  系统建议分数：{priorityLabels[priority].score} 积分
                </p>
              </div>

              <div className="space-y-2">
                <Label>最终积分</Label>
                <Input
                  type="number"
                  value={finalScore}
                  onChange={(e) => setFinalScore(Number(e.target.value))}
                  placeholder="输入最终积分"
                />
                <p className="text-xs text-muted-foreground">
                  可以根据实际情况调整系统建议分数
                </p>
              </div>

              <div className="space-y-2">
                <Label>审核备注（可选）</Label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="填写审核意见或备注信息..."
                  rows={3}
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
      
      {/* 导出预览对话框 */}
      <ExportPreviewDialog
        open={showExportPreview}
        onOpenChange={setShowExportPreview}
        filterSummary={(() => {
          const selectedStage = stages?.find(s => s.id === selectedStageId);
          if (exportType === 'tickets') {
            return {
              '导出时间': formatDateTime(new Date()),
              '阶段': selectedStage ? selectedStage.stageName : '全部阶段',
              '类型': filterType === 'all' ? '全部类型' : (typeLabels[filterType as keyof typeof typeLabels]?.label || filterType),
              '状态': filterStatus === 'all' ? '全部状态' : (statusLabels[filterStatus as keyof typeof statusLabels]?.label || filterStatus),
              '搜索关键词': searchQuery || '无',
            };
          } else {
            return {
              '导出时间': formatDateTime(new Date()),
              '阶段': selectedStage ? selectedStage.stageName : '全部阶段',
            };
          }
        })()}
        totalRecords={exportType === 'tickets' ? sortedTickets.length : (userPoints?.length || 0)}
        availableColumns={exportType === 'tickets' ? [
          '序号', '创建时间', '订单号', 'UID', '用户名', '内容', '工单号', 'BUG等级', '状态', '释放积分', '阶段'
        ] : [
          '序号', 'UID', '用户名', 'Bug反馈数', '建议数', '总积分'
        ]}
        onConfirm={(selectedColumns) => {
          if (exportType === 'tickets') {
            confirmExportTickets(selectedColumns);
          }
          setShowExportPreview(false);
        }}
      />
    </div>
  );
}
