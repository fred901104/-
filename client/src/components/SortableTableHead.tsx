import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({
  children,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          {!isActive && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
          {isActive && currentSortDirection === "asc" && <ArrowUp className="h-3 w-3" />}
          {isActive && currentSortDirection === "desc" && <ArrowDown className="h-3 w-3" />}
        </div>
      </div>
    </TableHead>
  );
}
