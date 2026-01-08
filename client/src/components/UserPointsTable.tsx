import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = 'currentPeriodPoints' | 'totalPoints' | string;
type SortDirection = 'asc' | 'desc';

interface UserPointsData {
  userId: number;
  userName: string;
  userOpenId: string;
  currentPeriodPoints: number;
  totalPoints: number;
  stagePoints: Record<string, number>;
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
      user.userOpenId.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <Card>
      <CardHeader>
        <CardTitle>{poolName} - 用户积分获取表</CardTitle>
        <CardDescription>
          查看所有参与者在该积分池的当前周期积分、累计积分和历史阶段积分
        </CardDescription>
        
        {/* 搜索框 */}
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名、UID或OpenID..."
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
                <TableHead>OpenID</TableHead>
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
                  <TableCell colSpan={6 + stageNames.length} className="text-center text-muted-foreground">
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
                    <TableCell className="font-mono text-xs">{user.userOpenId}</TableCell>
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
  );
}
