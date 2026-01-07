import { trpc } from "@/lib/trpc";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Users as UsersIcon, TrendingUp, Award, History, Plus, Minus, Ban, CheckCircle, Search } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead, SortDirection } from "@/components/SortableTableHead";
import { toast } from "sonner";

export default function Users() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [blacklistFilter, setBlacklistFilter] = useState<"all" | "0" | "1">("all");
  
  // 排序状态
  const [sortKey, setSortKey] = useState<"spotTradingVolume" | "futuresTradingVolume" | "totalStreamingMinutes" | "totalWatchingMinutes" | "createdAt" | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === null) {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key as any);
      setSortDirection("asc");
    }
  };
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [adjustPointsDialogOpen, setAdjustPointsDialogOpen] = useState(false);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"genesis" | "eco" | "trade">("genesis");
  const [adjustReason, setAdjustReason] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");

  const { data, isLoading, refetch } = trpc.userManagement.list.useQuery({
    page,
    pageSize,
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    isBlacklisted: blacklistFilter !== "all" ? blacklistFilter : undefined,
    sortKey: sortKey || undefined,
    sortDirection: sortDirection || undefined,
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const { data: pointsHistory } = trpc.userManagement.pointsHistory.useQuery(
    { userId: selectedUser?.id || 0 },
    { enabled: !!selectedUser && historyDialogOpen }
  );

  const adjustPointsMutation = trpc.userManagement.adjustPoints.useMutation();
  const blacklistMutation = trpc.userManagement.blacklist.useMutation();
  const unblacklistMutation = trpc.userManagement.unblacklist.useMutation();

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch("");
    setRoleFilter("all");
    setBlacklistFilter("all");
    setPage(1);
  };

  const openHistoryDialog = (user: any) => {
    setSelectedUser(user);
    setHistoryDialogOpen(true);
  };

  const openAdjustPointsDialog = (user: any) => {
    setSelectedUser(user);
    setAdjustAmount("");
    setAdjustType("genesis");
    setAdjustReason("");
    setAdjustPointsDialogOpen(true);
  };

  const openBlacklistDialog = (user: any) => {
    setSelectedUser(user);
    setBlacklistReason("");
    setBlacklistDialogOpen(true);
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || !adjustAmount || !adjustReason) {
      toast.error("请填写完整信息");
      return;
    }

    try {
      await adjustPointsMutation.mutateAsync({
        userId: selectedUser.id,
        amount: parseInt(adjustAmount),
        type: adjustType,
        reason: adjustReason,
      });
      toast.success("积分调整成功！");
      setAdjustPointsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  const handleBlacklist = async () => {
    if (!selectedUser || !blacklistReason) {
      toast.error("请填写拉黑原因");
      return;
    }

    try {
      await blacklistMutation.mutateAsync({
        userId: selectedUser.id,
        reason: blacklistReason,
      });
      toast.success("已将用户加入黑名单");
      setBlacklistDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  const handleUnblacklist = async (user: any) => {
    try {
      await unblacklistMutation.mutateAsync({ userId: user.id });
      toast.success("已解除黑名单");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  const totalUsers = total;
  const adminCount = users.filter(u => u.role === "admin").length;
  const blacklistedCount = users.filter(u => u.isBlacklisted === 1).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground mt-2">
          查看用户列表、积分历史、调整积分和黑名单管理
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">注册用户总数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理员</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">具有管理权限</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">黑名单用户</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blacklistedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">已被拉黑的用户</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>搜索用户</Label>
              <div className="flex gap-2">
                <Input
                  placeholder=""
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>黑名单状态</Label>
              <Select value={blacklistFilter} onValueChange={(v: any) => setBlacklistFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="0">正常用户</SelectItem>
                  <SelectItem value="1">黑名单</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="opacity-0">操作</Label>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  搜索
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>查看用户基本信息和积分历史</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">序号</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>昵称</TableHead>
                    <TableHead>登录方式</TableHead>
                    <TableHead>绑定X</TableHead>
                    <TableHead>认证主播</TableHead>
                    <SortableTableHead
                      sortKey="spotTradingVolume"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      现货交易量
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="futuresTradingVolume"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      合约交易量
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="totalStreamingMinutes"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      开播时长
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="totalWatchingMinutes"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      观看时长
                    </SortableTableHead>
                    <TableHead>发帖数</TableHead>
                    <TableHead>状态</TableHead>
                    <SortableTableHead
                      sortKey="createdAt"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      注册时间
                    </SortableTableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => {
                    const globalIndex = total - ((page - 1) * pageSize + index);
                    return (
                    <TableRow key={user.id}>
                      <TableCell className="text-center text-muted-foreground">{globalIndex}</TableCell>
                      <TableCell className="font-medium">#{user.id}</TableCell>
                      <TableCell>{user.nickname || user.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.loginMethod || "未知"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.isXBound ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.isStreamerVerified ? (
                          <Badge variant="default">认证</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(user.spotTradingVolume || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(user.futuresTradingVolume || "0").toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.floor((user.totalStreamingMinutes || 0) / 60)}h {(user.totalStreamingMinutes || 0) % 60}m
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.floor((user.totalWatchingMinutes || 0) / 60)}h {(user.totalWatchingMinutes || 0) % 60}m
                      </TableCell>
                      <TableCell className="text-center">
                        {user.totalPosts || 0}
                      </TableCell>
                      <TableCell>
                        {user.isBlacklisted === 1 ? (
                          <Badge variant="destructive">黑名单</Badge>
                        ) : (
                          <Badge variant="outline">正常</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openHistoryDialog(user)}>
                            <History className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAdjustPointsDialog(user)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          {user.isBlacklisted === 1 ? (
                            <Button size="sm" variant="outline" onClick={() => handleUnblacklist(user)}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => openBlacklistDialog(user)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Points History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>积分历史 - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              查看该用户的所有积分变动记录
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">用户ID</p>
                  <p className="font-medium">#{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">姓名</p>
                  <p className="font-medium">{selectedUser.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">邮箱</p>
                  <p className="font-medium">{selectedUser.email || "-"}</p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>子类型</TableHead>
                      <TableHead>积分</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointsHistory?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">
                          {new Date(record.createdAt).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.type === "genesis"
                                ? "default"
                                : record.type === "eco"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {record.type === "genesis"
                              ? "P_Genesis"
                              : record.type === "eco"
                              ? "P_Eco"
                              : "P_Trade"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{record.subType || "-"}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          +{record.amount}
                        </TableCell>
                        <TableCell className="text-sm">{record.description || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "approved"
                                ? "default"
                                : record.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {record.status === "approved"
                              ? "已发放"
                              : record.status === "pending"
                              ? "待审核"
                              : record.status === "frozen"
                              ? "已冻结"
                              : "已驳回"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pointsHistory || pointsHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          暂无积分记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsDialogOpen} onOpenChange={setAdjustPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整积分 - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              为用户补发或扣除积分，需填写调整原因
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>积分类型</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="genesis">P_Genesis</SelectItem>
                  <SelectItem value="eco">P_Eco</SelectItem>
                  <SelectItem value="trade">P_Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>调整数量（正数为补发，负数为扣除）</Label>
              <Input
                type="number"
                placeholder="例如：100 或 -50"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>调整原因</Label>
              <Textarea
                placeholder="请详细说明调整原因..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdjustPoints} disabled={adjustPointsMutation.isPending}>
              {adjustPointsMutation.isPending ? "处理中..." : "确认调整"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blacklist Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拉黑用户 - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              拉黑后该用户将无法继续产生积分
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>拉黑原因</Label>
              <Textarea
                placeholder="请详细说明拉黑原因..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBlacklist} disabled={blacklistMutation.isPending}>
              {blacklistMutation.isPending ? "处理中..." : "确认拉黑"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
