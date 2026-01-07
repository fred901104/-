import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  type: "text" | "select" | "dateRange" | "numberRange";
  key: string;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface FilterValues {
  [key: string]: any;
}

interface AdvancedFilterProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onSearch: () => void;
  onReset: () => void;
  quickFilters?: { label: string; values: FilterValues }[];
}

export function AdvancedFilter({
  filters,
  values,
  onChange,
  onSearch,
  onReset,
  quickFilters = [],
}: AdvancedFilterProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleQuickFilter = (quickValues: FilterValues) => {
    onChange({ ...values, ...quickValues });
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case "text":
        return (
          <Input
            placeholder={filter.placeholder || filter.label}
            value={values[filter.key] || ""}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="w-full"
          />
        );

      case "select":
        return (
          <Select
            value={values[filter.key] || ""}
            onValueChange={(value) => handleChange(filter.key, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={filter.placeholder || filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {filter.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "dateRange":
        return (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !values[`${filter.key}_start`] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {values[`${filter.key}_start`] ? (
                    format(values[`${filter.key}_start`], "PPP", { locale: zhCN })
                  ) : (
                    "开始日期"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={values[`${filter.key}_start`]}
                  onSelect={(date) => handleChange(`${filter.key}_start`, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">至</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !values[`${filter.key}_end`] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {values[`${filter.key}_end`] ? (
                    format(values[`${filter.key}_end`], "PPP", { locale: zhCN })
                  ) : (
                    "结束日期"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={values[`${filter.key}_end`]}
                  onSelect={(date) => handleChange(`${filter.key}_end`, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case "numberRange":
        return (
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="最小值"
              value={values[`${filter.key}_min`] || ""}
              onChange={(e) => handleChange(`${filter.key}_min`, e.target.value)}
              className="w-full"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="最大值"
              value={values[`${filter.key}_max`] || ""}
              onChange={(e) => handleChange(`${filter.key}_max`, e.target.value)}
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground self-center">快捷筛选：</span>
          {quickFilters.map((quick, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(quick.values)}
            >
              {quick.label}
            </Button>
          ))}
        </div>
      )}

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filters.map((filter) => (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium">{filter.label}</label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>
        <Button onClick={onSearch}>
          搜索
        </Button>
      </div>
    </div>
  );
}
