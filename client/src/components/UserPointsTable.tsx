import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { exportToExcel, formatDateTime } from "@/lib/exportToExcel";
import { toast } from "sonner";

type SortField = 'currentPeriodPoints' | 'totalPoints' | 'bugCount' | 'suggestionCount' | string;
type SortDirection = 'asc' | 'desc';

interface UserPointsData {
  userId: number;
  userName: string;
  currentPeriodPoints: number;
  totalPoints: number;
  stagePoints: Record<string, number>;
  bugCount?: number;
  suggestionCount?: number;
  bugTickets?: any[];
  suggestionTickets?: any[];
}

interface UserPointsTableProps {
  data: UserPointsData[];
  poolName: string;
  isLoading?: boolean;
}

export function UserPointsTable({ data, poolName, isLoading }: UserPointsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('currentPeriodPoints');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPointsData | null>(null);
  const [detailType, setDetailType] = useState<'bug' | 'suggestion'>('bug');

  // 获取所有阶段名称
  const stageNames = useMemo(() => {
    const stages = new Set<string>();
    data.forEach(user => {
      Object.keys(user.stagePoints).forEach(stage => stages.add(stage));
    });
    return Array.from(stages).sort();
  }, [data]);

  // 筛选和排序数据
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(user => 
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toString().includes(searchTerm)
    );

    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortField === 'currentPeriodPoints') {
        aValue = a.currentPeriodPoints;
        bValue = b.currentPeriodPoints;
      } else if (sortField === 'totalPoints') {
        aValue = a.totalPoints;
        bValue = b.totalPoints;
      } else if (sortField === 'bugCount') {
        aValue = a.bugCount || 0;
        bValue = b.bugCount || 0;
      } else if (sortField === 'suggestionCount') {
        aValue = a.suggestionCount || 0;
        bValue = b.suggestionCount || 0;
      } else {
        // 阶段积分排序
        aValue = a.stagePoints[sortField] || 0;
        bValue = b.stagePoints[sortField] || 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [data, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const exportData = filteredAndSortedData.map((user, index) => {
      const row: any = {
        '排名': index + 1,
        '用户ID': user.userId,
        '用户名': user.userName,
        '当前周期积分': user.currentPeriodPoints,
        '累计积分': user.totalPoints,
        'BUG反馈数': user.bugCount,
        '建议数': user.suggestionCount,
      };
      
      // 添加历史阶段积分列
      stageNames.forEach(stageName => {
        row[stageName] = user.stagePoints[stageName] || 0;
      });
      
      return row;
    });
    
    exportToExcel(exportData, poolName, '用户积分获取表');
    toast.success(`已导出 ${exportData.length} 位用户的积分数据`);
  };

  const handleDetailClick = (user: UserPointsData, type: 'bug' | 'suggestion') => {
    setSelectedUser(user);
    setDetailType(type);
    setDetailDialogOpen(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1 inline" /> : 
      <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{poolName} - 用户积分获取表</CardTitle>
          <CardDescription>加载中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{poolName} - 用户积分获取表</CardTitle>
              <CardDescription>
                查看所有参与者在该积分池的当前周期积分、累计积分和历史阶段积分
              </CardDescription>
            </div>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
          </div>
          
          {/* 搜索框 */}
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名或UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排名</TableHead>
                  <TableHead>用户ID</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('currentPeriodPoints')}
                  >
                    当前周期积分 <SortIcon field="currentPeriodPoints" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('totalPoints')}
                  >
                    累计积分 <SortIcon field="totalPoints" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('bugCount')}
                  >
                    BUG反馈数 <SortIcon field="bugCount" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('suggestionCount')}
                  >
                    建议数 <SortIcon field="suggestionCount" />
                  </TableHead>
                  {stageNames.map(stageName => (
                    <TableHead 
                      key={stageName}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(stageName)}
                    >
                      {stageName} <SortIcon field={stageName} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7 + stageNames.length} className="text-center text-muted-foreground">
                      {searchTerm ? "未找到匹配的用户" : "暂无数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((user, index) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{user.userId}</TableCell>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="font-mono">
                          {user.currentPeriodPoints.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {user.totalPoints.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(user.bugCount || 0) > 0 ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-mono text-red-600"
                            onClick={() => handleDetailClick(user, 'bug')}
                          >
                            {user.bugCount}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(user.suggestionCount || 0) > 0 ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-mono text-blue-600"
                            onClick={() => handleDetailClick(user, 'suggestion')}
                          >
                            {user.suggestionCount}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      {stageNames.map(stageName => (
                        <TableCell key={stageName} className="font-mono">
                          {user.stagePoints[stageName]?.toLocaleString() || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* 统计信息 */}
          <div className="mt-4 text-sm text-muted-foreground">
            共 {filteredAndSortedData.length} 位参与者
            {searchTerm && ` (筛选自 ${data.length} 位)`}
          </div>
        </CardContent>
      </Card>

      {/* 反馈记录详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.userName} - {detailType === 'bug' ? 'BUG反馈记录' : '建议记录'}
            </DialogTitle>
            <DialogDescription>
              查看该用户提交的所有{detailType === 'bug' ? 'BUG反馈' : '功能建议'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedUser && (
              detailType === 'bug' ? selectedUser.bugTickets : selectedUser.suggestionTickets
            )?.map((ticket: any) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">#{ticket.id} - {ticket.title}</CardTitle>
                    <Badge variant={ticket.status === 'approved' ? 'default' : ticket.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {ticket.status === 'approved' ? '已通过' : ticket.status === 'rejected' ? '已拒绝' : '待审核'}
                    </Badge>
                  </div>
                  <CardDescription>
                    提交时间: {formatDateTime(ticket.createdAt)}
                    {ticket.pointsAwarded && ` | 获得积分: ${ticket.pointsAwarded}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{ticket.content}</p>
                </CardContent>
              </Card>
            ))}
            
            {selectedUser && (detailType === 'bug' ? selectedUser.bugTickets : selectedUser.suggestionTickets)?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无{detailType === 'bug' ? 'BUG反馈' : '建议'}记录
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
