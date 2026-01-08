import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterSummary: Record<string, string>;
  totalRecords: number;
  availableColumns: string[];
  onConfirm: (selectedColumns?: string[]) => void;
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  filterSummary,
  totalRecords,
  availableColumns,
  onConfirm,
}: ExportPreviewDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(availableColumns)
  );

  const toggleColumn = (column: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(column)) {
      newSelected.delete(column);
    } else {
      newSelected.add(column);
    }
    setSelectedColumns(newSelected);
  };

  const toggleAll = () => {
    if (selectedColumns.size === availableColumns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(availableColumns));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedColumns));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>导出预览</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 筛选条件摘要 */}
          {filterSummary && Object.keys(filterSummary).length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-3">筛选条件摘要</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(filterSummary).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}：</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 数据统计 */}
          <div className="flex items-center justify-between border rounded-lg p-4 bg-primary/5">
            <div>
              <p className="text-sm text-muted-foreground">将要导出的数据条数</p>
              <p className="text-2xl font-bold">{totalRecords} 条记录</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已选择导出的列</p>
              <p className="text-2xl font-bold">{selectedColumns.size} / {availableColumns.length} 列</p>
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
                {selectedColumns.size === availableColumns.length ? '取消全选' : '全选'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {availableColumns.map(column => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${column}`}
                    checked={selectedColumns.has(column)}
                    onCheckedChange={() => toggleColumn(column)}
                  />
                  <label
                    htmlFor={`col-${column}`}
                    className="text-sm cursor-pointer"
                  >
                    {column}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedColumns.size === 0}
          >
            确认导出 ({totalRecords} 条记录)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
