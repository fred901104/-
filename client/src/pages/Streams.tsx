import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, FilterConfig, FilterValues } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead, SortDirection } from "@/components/SortableTableHead";
import { Radio, Users, Clock, MessageSquare, DollarSign, Star, TrendingUp, Activity, Download } from "lucide-react";
import { exportToExcel, formatDateTime } from "@/lib/exportToExcel";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { UserPointsTable } from "@/components/UserPointsTable";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Streams() {
  // Tab状态
  const [activeTab, setActiveTab] = useState("creator");
  
  // 阶段筛选状态
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(undefined);
  
  // 获取阶段列表
  const { data: stages } = trpc.stageBudget.list.useQuery();
  
  const [filterValues, setFilterValues] = useState<FilterValues>({ search: "" });
  const [selectedStream, setSelectedStream] = useState<number | null>(null);
  const [ccuDialogOpen, setCcuDialogOpen] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 主播贡献排序状态
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // 观众贡献排序状态
  const [audienceSortKey, setAudienceSortKey] = useState<string | null>(null);
  const [audienceSortDirection, setAudienceSortDirection] = useState<SortDirection>(null);
  
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
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  
  const handleAudienceSort = (key: string) => {
    if (audienceSortKey === key) {
      if (audienceSortDirection === null) {
        setAudienceSortDirection("asc");
      } else if (audienceSortDirection === "asc") {
        setAudienceSortDirection("desc");
      } else {
        setAudienceSortKey(null);
        setAudienceSortDirection(null);
      }
    } else {
      setAudienceSortKey(key);
      setAudienceSortDirection("asc");
    }
  };

  // 根据选中的阶段获取数据
  const { data: streams, isLoading } = trpc.streams.list.useQuery(
    selectedStageId ? { stageId: selectedStageId } : undefined
  );
  
  // 获取用户积分统计
  const { data: userPoints, isLoading: isLoadingUserPoints } = trpc.streams.userPoints.useQuery();

  // 导出主播贡献功能
  const handleExportStreams = () => {
    const exportData = sortedStreams.map((item, index) => ({
      '序号': sortedStreams.length - index,
      '开播时间': formatDateTime(item.stream.startTime),
      '主播名称': item.streamer?.name || '-',
      'UID': item.streamer?.openId || '-',
      '直播时长(分钟)': item.stream.duration ? Math.floor(item.stream.duration / 60) : 0,
      '平均CCU': item.stream.avgCcu || 0,
      'P_Eco得分': 0, // TODO: 添加pEcoScore字段到stream表
      '状态': item.stream.endTime ? '已结束' : '直播中',
    }));
    exportToExcel(exportData, '直播监控-主播贡献', '主播列表');
    toast.success(`已导出 ${exportData.length} 条主播数据`);
  };

  // 导出观众贡献功能
  const handleExportAudience = () => {
    // 模拟观众数据（实际应从 API 获取）
    const mockAudience = [
      { id: 1, viewerName: '观众A', viewerId: 'V001', watchMinutes: 120, gifts: 500, pEcoScore: 50, createdAt: new Date() },
      { id: 2, viewerName: '观众B', viewerId: 'V002', watchMinutes: 90, gifts: 300, pEcoScore: 35, createdAt: new Date() },
      { id: 3, viewerName: '观众C', viewerId: 'V003', watchMinutes: 60, gifts: 200, pEcoScore: 25, createdAt: new Date() },
    ];
    const exportData = mockAudience.map((viewer, index) => ({
      '序号': mockAudience.length - index,
      '创建时间': formatDateTime(viewer.createdAt),
      '观众名称': viewer.viewerName,
      'UID': viewer.viewerId,
      '观看时长(分钟)': viewer.watchMinutes,
      '打赏金额': viewer.gifts,
      'P_Eco得分': viewer.pEcoScore,
    }));
    exportToExcel(exportData, '直播监控-观众贡献', '观众列表');
    toast.success(`已导出 ${exportData.length} 条观众数据`);
  };

  const filterConfig: FilterConfig = {
    searchPlaceholder: "搜索主播名称、UID...",
    filters: [
      {
        key: "status",
        label: "状态",
        options: [
          { value: "live", label: "直播中" },
          { value: "offline", label: "已结束" },
        ],
      },
      {
        key: "featured",
        label: "精选状态",
        options: [
          { value: "featured", label: "已加精" },
          { value: "normal", label: "普通" },
        ],
      },
    ],
    showDateRange: true,
  };

  // 模拟CCU采样数据（90秒间隔）
  const generateCCUSamples = () => {
    const samples = [];
    const totalMinutes = 120; // 2小时直播
    const intervalMinutes = 1.5; // 90秒 = 1.5分钟
    const sampleCount = Math.floor(totalMinutes / intervalMinutes);
    
    for (let i = 0; i < sampleCount; i++) {
      const time = i * intervalMinutes;
      const hours = Math.floor(time / 60);
      const minutes = Math.floor(time % 60);
      samples.push({
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        ccu: Math.floor(Math.random() * 50 + 30 + Math.sin(i / 10) * 20),
        timestamp: time,
      });
    }
    return samples;
  };

  const ccuSamples = generateCCUSamples();
  const avgCCU = Math.floor(ccuSamples.reduce((sum, s) => sum + s.ccu, 0) / ccuSamples.length);

  // 计算P_Eco得分
  const calculateCreatorScore = (stream: any) => {
    const streamHours = (stream.duration || 0) / 60; // 转换为小时
    const avgCCU = stream.avgCcu || 0;
    const chatCount = stream.chatCount || 0;
    const tipFees = stream.tipAmount || 0;
    const featuredPosts = stream.featuredPosts || 0;

    const score = 
      (streamHours * 5) +
      (avgCCU * 3) +
      (chatCount * 0.2) +
      (tipFees * 1) +
      (featuredPosts * 5);

    return score.toFixed(2);
  };

  const calculateAudienceScore = (contribution: any) => {
    const watchHours = Math.min((contribution.watchMinutes || 0) / 60, 4); // 最多4小时
    const tipFees = contribution.tipFees || 0;
    const chatCount = contribution.chatCount || 0;
    const featuredPosts = contribution.featuredPosts || 0;

    const score =
      (tipFees * 5) +
      (watchHours * 1) +
      (chatCount * 0.2) +
      (featuredPosts * 5);

    return score.toFixed(2);
  };

  // 排序逻辑
  const sortedStreams = useMemo(() => {
    if (!streams || !sortKey || !sortDirection) return streams || [];
    
    const sorted = [...streams].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case "duration":
          aValue = a.stream.duration || 0;
          bValue = b.stream.duration || 0;
          break;
        case "avgCcu":
          aValue = a.stream.avgCcu || 0;
          bValue = b.stream.avgCcu || 0;
          break;
        case "score":
          aValue = parseFloat(calculateCreatorScore(a.stream));
          bValue = parseFloat(calculateCreatorScore(b.stream));
          break;
        case "startTime":
          aValue = new Date(a.stream.startTime).getTime();
          bValue = new Date(b.stream.startTime).getTime();
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
  }, [streams, sortKey, sortDirection]);
  
  // 分页逻辑
  const paginatedStreams = useMemo(() => {
    if (!sortedStreams) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedStreams.slice(startIndex, endIndex);
  }, [sortedStreams, currentPage, pageSize]);
  
  const totalPages = Math.ceil((sortedStreams?.length || 0) / pageSize);

  const mockAudienceContributionsRaw = [
    {
      id: 1,
      userId: 1001,
      userName: "User_1001",
      watchMinutes: 180,
      tipFees: 5.5,
      chatCount: 25,
      featuredPosts: 1,
      date: "2026-01-07",
    },
    {
      id: 2,
      userId: 1002,
      userName: "User_1002",
      watchMinutes: 240,
      tipFees: 12.3,
      chatCount: 45,
      featuredPosts: 2,
      date: "2026-01-07",
    },
    {
      id: 3,
      userId: 1003,
      userName: "User_1003",
      watchMinutes: 120,
      tipFees: 3.2,
      chatCount: 15,
      featuredPosts: 0,
      date: "2026-01-07",
    },
  ];
  
  // 观众贡献排序逻辑
  const mockAudienceContributions = useMemo(() => {
    if (!audienceSortKey || !audienceSortDirection) {
      return mockAudienceContributionsRaw;
    }
    
    const sorted = [...mockAudienceContributionsRaw].sort((a, b) => {
      const aValue = a[audienceSortKey as keyof typeof a];
      const bValue = b[audienceSortKey as keyof typeof b];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return audienceSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
    
    return sorted;
  }, [audienceSortKey, audienceSortDirection]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">P_Eco 直播监控台</h1>
          <p className="text-muted-foreground mt-1">
            监控主播直播数据、观众贡献和P_Eco积分计算
          </p>
        </div>
        <Button
          onClick={() => {
            handleExportStreams();
          }}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          导出Excel
        </Button>
      </div>

      {/* 阶段筛选器 */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">阶段筛选：</label>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={selectedStageId || ""}
          onChange={(e) => setSelectedStageId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">全部阶段</option>
          {stages?.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.stageName}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Bar */}
      <FilterBar
        config={filterConfig}
        values={filterValues}
        onChange={setFilterValues}
      />

      {/* Tabs for Creator/Audience/UserPoints */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="creator">
            <Radio className="h-4 w-4 mr-2" />
            主播贡献
          </TabsTrigger>
          <TabsTrigger value="audience">
            <Users className="h-4 w-4 mr-2" />
            观众贡献
          </TabsTrigger>
          <TabsTrigger value="userPoints">
            <TrendingUp className="h-4 w-4 mr-2" />
            用户积分获取表
          </TabsTrigger>
        </TabsList>

        {/* Creator Tab */}
        <TabsContent value="creator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>主播直播数据统计</CardTitle>
              <CardDescription>
                Score_Creator = (日有效直播时长 × 5) + (平均CCU × 3) + (有效聊天条数 × 0.2) + (收到打赏手续费 × 1) + (精选内容贴数量 × 5)
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
                        <SortableTableHead
                          sortKey="startTime"
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        >
                          开播时间
                        </SortableTableHead>
                        <TableHead>阶段</TableHead>
                        <TableHead>订单号</TableHead>
                        <TableHead>主播UID</TableHead>
                        <TableHead>主播名称</TableHead>
                        <SortableTableHead
                          sortKey="duration"
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        >
                          直播时长
                        </SortableTableHead>
                        <SortableTableHead
                          sortKey="avgCcu"
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        >
                          平均CCU
                        </SortableTableHead>
                        <TableHead>聊天条数</TableHead>
                        <TableHead>打赏手续费</TableHead>
                        <TableHead>精选贴数</TableHead>
                        <SortableTableHead
                          sortKey="score"
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        >
                          P_Eco得分
                        </SortableTableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作人</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStreams?.map((stream, index) => {
                        const globalIndex = (streams?.length || 0) - ((currentPage - 1) * pageSize + index);
                        const stage = stream.stage;
                        return (
                        <TableRow key={stream.stream.id}>
                          <TableCell className="text-center text-muted-foreground">{globalIndex}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(stream.stream.startTime).toLocaleString('zh-CN', {
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
                            {stage ? (
                              <Badge variant="outline">{stage.stageName}</Badge>
                            ) : (
                              <span className="text-muted-foreground">未分配</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {(() => {
                              const date = new Date(stream.stream.startTime);
                              const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                              const seqNum = String(stream.stream.id).padStart(6, '0');
                              return `${dateStr}-ECO-${seqNum}`;
                            })()}
                          </TableCell>
                          <TableCell className="font-mono">{stream.stream.streamerId}</TableCell>
                          <TableCell className="font-medium">{stream.streamer?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {Math.floor((stream.stream.duration || 0) / 60)}h {(stream.stream.duration || 0) % 60}m
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-muted-foreground" />
                              {stream.stream.avgCcu || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              {stream.stream.interactionCount || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              0.00 U
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-muted-foreground" />
                              0
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {calculateCreatorScore(stream)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {false ? (
                              <Badge variant="destructive">异常</Badge>
                            ) : (
                              <Badge variant="default">正常</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {stream.stream.createdBy && (
                                <div>
                                  <span className="text-muted-foreground">创建:</span> 用户ID: {stream.stream.createdBy}
                                </div>
                              )}
                              {stream.stream.reviewedBy && (
                                <div>
                                  <span className="text-muted-foreground">审核:</span> 用户ID: {stream.stream.reviewedBy}
                                </div>
                              )}
                              {stream.stream.modifiedBy && (
                                <div>
                                  <span className="text-muted-foreground">修改:</span> 用户ID: {stream.stream.modifiedBy}
                                </div>
                              )}
                              {!stream.stream.createdBy && !stream.stream.reviewedBy && !stream.stream.modifiedBy && (
                                <span className="text-muted-foreground">无</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStream(stream.stream.id);
                                  setCcuDialogOpen(true);
                                }}
                              >
                                查看CCU
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.info("冻结功能开发中");
                                }}
                              >
                                冻结
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                  
                  {/* 分页组件 */}
                  {!isLoading && streams && streams.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={streams.length}
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

          {/* CCU Sampling Rules */}
          <Card>
            <CardHeader>
              <CardTitle>CCU采样规则说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>采样间隔：</strong>90秒（1.5分钟）</p>
                <p><strong>计算方式：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>总采样点 CCU = 第1次CCU + 第2次CCU + ... + 第N次CCU</li>
                  <li>总采样次数 (N) = 直播总时长(分钟) / 1.5</li>
                  <li>场均 CCU = 总采样点 CCU / 总采样次数 N</li>
                </ul>
                <p><strong>有效直播规则：</strong>直播间最少5个登录用户同时在线观看才计算时长，日上限8小时</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>观众贡献数据统计</CardTitle>
                  <CardDescription>
                    Score_Audience = (打赏金额手续费 × 5) + (有效观看时长 × 1) + (有效聊天条数 × 0.2) + (精选内容贴数量 × 5)
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExportAudience}
                  className="gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  导出观众数据
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>序号</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>用户UID</TableHead>
                      <TableHead>用户名称</TableHead>
                      <SortableTableHead
                        sortKey="watchMinutes"
                        currentSortKey={audienceSortKey}
                        currentSortDirection={audienceSortDirection}
                        onSort={handleAudienceSort}
                      >
                        观看时长
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="gifts"
                        currentSortKey={audienceSortKey}
                        currentSortDirection={audienceSortDirection}
                        onSort={handleAudienceSort}
                      >
                        打赏手续费
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="chatCount"
                        currentSortKey={audienceSortKey}
                        currentSortDirection={audienceSortDirection}
                        onSort={handleAudienceSort}
                      >
                        聊天条数
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="featuredPosts"
                        currentSortKey={audienceSortKey}
                        currentSortDirection={audienceSortDirection}
                        onSort={handleAudienceSort}
                      >
                        精选贴数
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="pEcoScore"
                        currentSortKey={audienceSortKey}
                        currentSortDirection={audienceSortDirection}
                        onSort={handleAudienceSort}
                      >
                        P_Eco得分
                      </SortableTableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAudienceContributions.map((contribution, index) => {
                      const globalIndex = mockAudienceContributions.length - index;
                      const timestamp = new Date(`${contribution.date}T${10 + index}:${15 + index}:${30 + index}`);
                      return (
                      <TableRow key={contribution.id}>
                        <TableCell className="font-mono">{globalIndex}</TableCell>
                        <TableCell>{timestamp.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '/')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {(() => {
                            const date = new Date(contribution.date);
                            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                            const seqNum = String(contribution.id).padStart(6, '0');
                            return `${dateStr}-ECO-${seqNum}`;
                          })()}
                        </TableCell>
                        <TableCell className="font-mono">{contribution.userId}</TableCell>
                        <TableCell className="font-medium">{contribution.userName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {Math.floor(contribution.watchMinutes / 60)}h {contribution.watchMinutes % 60}m
                            {contribution.watchMinutes > 240 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                已达上限
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            {contribution.tipFees.toFixed(2)} U
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            {contribution.chatCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-muted-foreground" />
                            {contribution.featuredPosts}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {calculateAudienceScore(contribution)}
                          </Badge>
                        </TableCell>
                        <TableCell>{contribution.date}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast.info("冻结功能开发中");
                            }}
                          >
                            冻结
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Audience Rules */}
          <Card>
            <CardHeader>
              <CardTitle>观众贡献规则说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>有效观看时长：</strong>每日累计最多4h（不满1h按比例计算，最小单位1min）</p>
                <p><strong>有效聊天条数：</strong>所有聊天场景，5min内仅算1条</p>
                <p><strong>精选内容贴：</strong>分享+点赞累计≥100 或 UV 50人评论（每个帖子只计算一次）</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* User Points Tab */}
        <TabsContent value="userPoints">
          <UserPointsTable 
            data={userPoints || []} 
            poolName="P_Eco 生态池" 
            isLoading={isLoadingUserPoints}
          />
        </TabsContent>
      </Tabs>

      {/* CCU Sampling Dialog */}
      <Dialog open={ccuDialogOpen} onOpenChange={setCcuDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>CCU采样详情</DialogTitle>
            <DialogDescription>
              90秒间隔采样，共{ccuSamples.length}个采样点，平均CCU: {avgCCU}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* CCU Heart Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CCU心电图</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={ccuSamples}>
                    <defs>
                      <linearGradient id="ccuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval={Math.floor(ccuSamples.length / 10)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ccu" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#ccuGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sampling Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">采样次数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ccuSamples.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">平均CCU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgCCU}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">最高CCU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.max(...ccuSamples.map(s => s.ccu))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">最低CCU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.min(...ccuSamples.map(s => s.ccu))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
