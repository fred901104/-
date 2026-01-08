import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import type { FilterSummary } from "@/lib/exportToExcel";

export interface ExportColumn {
  key: string;
  label: string;
  enabled: boolean;
}

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filterSummary?: FilterSummary;
  data: any[];
  columns: ExportColumn[];
  onConfirm: (selectedColumns: string[]) => void;
  onCancel: () => void;
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  title,
  filterSummary,
  data,
  columns,
  onConfirm,
  onCancel,
}: ExportPreviewDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(columns.filter(col => col.enabled).map(col => col.key))
  );

  const previewData = useMemo(() => data.slice(0, 10), [data]);

  const toggleColumn = (key: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedColumns(newSelected);
  };

  const toggleAll = () => {
    if (selectedColumns.size === columns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(columns.map(col => col.key)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedColumns));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title} - 导出预览</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* 筛选条件摘要 */}
            {filterSummary && Object.keys(filterSummary).length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-3">筛选条件摘要</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {filterSummary.exportTime && (
                    <div>
                      <span className="text-muted-foreground">导出时间：</span>
                      <span>{filterSummary.exportTime}</span>
                    </div>
                  )}
                  {filterSummary.stage && (
                    <div>
                      <span className="text-muted-foreground">阶段筛选：</span>
                      <span>{filterSummary.stage}</span>
                    </div>
                  )}
                  {(filterSummary.startDate || filterSummary.endDate) && (
                    <div>
                      <span className="text-muted-foreground">日期范围：</span>
                      <span>{filterSummary.startDate || '无'} 至 {filterSummary.endDate || '无'}</span>
                    </div>
                  )}
                  {filterSummary.status && (
                    <div>
                      <span className="text-muted-foreground">状态筛选：</span>
                      <span>{filterSummary.status}</span>
                    </div>
                  )}
                  {filterSummary.type && (
                    <div>
                      <span className="text-muted-foreground">类型筛选：</span>
                      <span>{filterSummary.type}</span>
                    </div>
                  )}
                  {Object.keys(filterSummary).map(key => {
                    if (!['exportTime', 'stage', 'startDate', 'endDate', 'status', 'type'].includes(key) && filterSummary[key]) {
                      return (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}：</span>
                          <span>{filterSummary[key]}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* 数据统计 */}
            <div className="flex items-center justify-between border rounded-lg p-4 bg-primary/5">
              <div>
                <p className="text-sm text-muted-foreground">将要导出的数据条数</p>
                <p className="text-2xl font-bold">{data.length} 条记录</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已选择导出的列</p>
                <p className="text-2xl font-bold">{selectedColumns.size} / {columns.length} 列</p>
              </div>
            </div>

            {/* 自定义导出列 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">选择导出列</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedColumns.size === columns.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {columns.map(col => (
                  <div key={col.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={selectedColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <label
                      htmlFor={`col-${col.key}`}
                      className="text-sm cursor-pointer"
                    >
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 数据预览 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">数据预览（前10条）</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns
                        .filter(col => selectedColumns.has(col.key))
                        .map(col => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.length > 0 ? (
                      previewData.map((row, index) => (
                        <TableRow key={index}>
                          {columns
                            .filter(col => selectedColumns.has(col.key))
                            .map(col => (
                              <TableCell key={col.key}>
                                {row[col.key] !== null && row[col.key] !== undefined
                                  ? String(row[col.key])
                                  : '-'}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={selectedColumns.size}
                          className="text-center text-muted-foreground"
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedColumns.size === 0}
          >
            确认导出 ({data.length} 条记录)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
