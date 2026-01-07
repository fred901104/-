import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  searchPlaceholder?: string;
  searchFields?: string[];
  filters?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
  showDateRange?: boolean;
}

export interface FilterValues {
  search: string;
  [key: string]: any;
  dateFrom?: Date;
  dateTo?: Date;
}

interface FilterBarProps {
  config: FilterConfig;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset?: () => void;
}

export function FilterBar({ config, values, onChange, onReset }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (search: string) => {
    onChange({ ...values, search });
  };

  const handleFilterChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", date: Date | undefined) => {
    onChange({ ...values, [key]: date });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange({
        search: "",
        dateFrom: undefined,
        dateTo: undefined,
      });
    }
  };

  const hasActiveFilters = values.search || 
    (config.filters?.some(f => values[f.key])) ||
    values.dateFrom ||
    values.dateTo;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={config.searchPlaceholder || "搜索..."}
            value={values.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Custom Filters */}
            {config.filters?.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <label className="text-sm font-medium">{filter.label}</label>
                <Select
                  value={values[filter.key] || "all"}
                  onValueChange={(value) => handleFilterChange(filter.key, value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Date Range */}
            {config.showDateRange && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">开始日期</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !values.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {values.dateFrom ? format(values.dateFrom, "yyyy-MM-dd") : "选择日期"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={values.dateFrom}
                        onSelect={(date) => handleDateChange("dateFrom", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">结束日期</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !values.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {values.dateTo ? format(values.dateTo, "yyyy-MM-dd") : "选择日期"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={values.dateTo}
                        onSelect={(date) => handleDateChange("dateTo", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">活跃筛选：</span>
              {values.search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded">
                  搜索: {values.search}
                </span>
              )}
              {config.filters?.map((filter) => {
                const value = values[filter.key];
                if (!value) return null;
                const option = filter.options.find(o => o.value === value);
                return (
                  <span key={filter.key} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded">
                    {filter.label}: {option?.label || value}
                  </span>
                );
              })}
              {values.dateFrom && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded">
                  从: {format(values.dateFrom, "yyyy-MM-dd")}
                </span>
              )}
              {values.dateTo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded">
                  到: {format(values.dateTo, "yyyy-MM-dd")}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
