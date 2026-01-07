import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users as UsersIcon, TrendingUp, Award } from "lucide-react";
import { useState } from "react";

export default function Users() {
  const { data: users, isLoading } = trpc.userManagement.list.useQuery();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const { data: pointsHistory } = trpc.userManagement.pointsHistory.useQuery(
    { userId: selectedUser?.id || 0 },
    { enabled: !!selectedUser }
  );

  const openHistoryDialog = (user: any) => {
    setSelectedUser(user);
    setHistoryDialogOpen(true);
  };

  const totalUsers = users?.length || 0;
  const adminCount = users?.filter(u => u.role === "admin").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground mt-2">
          查看用户列表、积分历史和身份标签管理
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
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">近30天活跃</p>
          </CardContent>
        </Card>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>登录方式</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">#{user.id}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.loginMethod || "未知"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "管理员" : "用户"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell>{new Date(user.lastSignedIn).toLocaleDateString("zh-CN")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openHistoryDialog(user)}>
                        积分历史
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}
