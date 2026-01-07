import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Radio, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function Streams() {
  const { data: streams, isLoading } = trpc.streams.list.useQuery();
  const [selectedStream, setSelectedStream] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const openDetailDialog = (stream: any) => {
    setSelectedStream(stream);
    setDetailDialogOpen(true);
  };

  const anomalousCount = streams?.filter(s => s.stream.isAnomalous === 1).length || 0;
  const totalStreams = streams?.length || 0;
  const avgCcu = (streams?.reduce((sum, s) => sum + (s.stream.avgCcu || 0), 0) || 0) / (totalStreams || 1);

  // Parse CCU samples for chart
  const ccuChartData = selectedStream?.stream.ccuSamples
    ? JSON.parse(selectedStream.stream.ccuSamples).map((ccu: number, index: number) => ({
        time: `${index}min`,
        ccu,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">P_Eco 直播监控台</h1>
        <p className="text-muted-foreground mt-2">
          监控主播直播数据、CCU采样和异常检测，验证真实性并发放积分
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总直播场次</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStreams}</div>
            <p className="text-xs text-muted-foreground mt-1">统计周期内</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">异常直播</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{anomalousCount}</div>
            <p className="text-xs text-muted-foreground mt-1">疑似挂机或刷量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均CCU</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgCcu)}</div>
            <p className="text-xs text-muted-foreground mt-1">平均在线观众</p>
          </CardContent>
        </Card>
      </div>

      {/* Streams Table */}
      <Card>
        <CardHeader>
          <CardTitle>直播数据监控列表</CardTitle>
          <CardDescription>点击查看详情可查看CCU采样心电图</CardDescription>
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
                  <TableHead>主播</TableHead>
                  <TableHead>直播时长</TableHead>
                  <TableHead>有效时长</TableHead>
                  <TableHead>平均CCU</TableHead>
                  <TableHead>峰值CCU</TableHead>
                  <TableHead>互动数</TableHead>
                  <TableHead>预估积分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams?.map((item) => {
                  const stream = item.stream;
                  const streamer = item.streamer;

                  return (
                    <TableRow key={stream.id}>
                      <TableCell className="font-medium">#{stream.id}</TableCell>
                      <TableCell>{streamer?.name || "未知"}</TableCell>
                      <TableCell>{Math.round((stream.duration || 0) / 60)}分钟</TableCell>
                      <TableCell>{Math.round((stream.validDuration || 0) / 60)}分钟</TableCell>
                      <TableCell>{stream.avgCcu}</TableCell>
                      <TableCell>{stream.peakCcu}</TableCell>
                      <TableCell>{stream.interactionCount}</TableCell>
                      <TableCell className="font-semibold">{stream.estimatedPoints}</TableCell>
                      <TableCell>
                        {stream.isAnomalous === 1 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            异常
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">正常</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openDetailDialog(item)}>
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>直播详情 #{selectedStream?.stream.id}</DialogTitle>
            <DialogDescription>
              CCU采样心电图 - 正常直播应有波动，平直横线表示可能存在机器人
            </DialogDescription>
          </DialogHeader>

          {selectedStream && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">主播</p>
                  <p className="font-medium">{selectedStream.streamer?.name || "未知"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">直播时长</p>
                  <p className="font-medium">{Math.round((selectedStream.stream.duration || 0) / 60)}分钟</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">有效时长</p>
                  <p className="font-medium">{Math.round((selectedStream.stream.validDuration || 0) / 60)}分钟</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均CCU</p>
                  <p className="font-medium">{selectedStream.stream.avgCcu}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">峰值CCU</p>
                  <p className="font-medium">{selectedStream.stream.peakCcu}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">互动数</p>
                  <p className="font-medium">{selectedStream.stream.interactionCount}</p>
                </div>
              </div>

              {selectedStream.stream.isAnomalous === 1 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    异常检测
                  </div>
                  <p className="text-sm text-red-700">
                    {selectedStream.stream.anomalyReason || "CCU曲线异常平直，互动数极低，疑似脚本挂机"}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-4">CCU采样心电图</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ccuChartData}>
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ccu"
                      stroke={selectedStream.stream.isAnomalous === 1 ? "#dc2626" : "#3b82f6"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  每60-90秒采样一次，正常曲线应有自然波动
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
