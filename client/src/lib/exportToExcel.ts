import * as XLSX from 'xlsx';

/**
 * 筛选条件摘要配置
 */
export interface FilterSummary {
  /** 导出时间 */
  exportTime?: string;
  /** 阶段筛选 */
  stage?: string;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 状态筛选 */
  status?: string;
  /** 类型筛选 */
  type?: string;
  /** 其他筛选条件 */
  [key: string]: string | undefined;
}

/**
 * 导出数据为Excel文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 * @param filterSummary 筛选条件摘要（可选）
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1',
  filterSummary?: FilterSummary
) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  if (filterSummary && Object.keys(filterSummary).length > 0) {
    // 构建筛选条件摘要数据
    const summaryData: any[][] = [];
    summaryData.push(['━━━ 筛选条件摘要 ━━━']);
    
    if (filterSummary.exportTime) {
      summaryData.push(['导出时间:', filterSummary.exportTime]);
    }
    if (filterSummary.stage) {
      summaryData.push(['阶段筛选:', filterSummary.stage]);
    }
    if (filterSummary.startDate || filterSummary.endDate) {
      const dateRange = `${filterSummary.startDate || '无'} 至 ${filterSummary.endDate || '无'}`;
      summaryData.push(['日期范围:', dateRange]);
    }
    if (filterSummary.status) {
      summaryData.push(['状态筛选:', filterSummary.status]);
    }
    if (filterSummary.type) {
      summaryData.push(['类型筛选:', filterSummary.type]);
    }
    
    // 添加其他自定义筛选条件
    Object.keys(filterSummary).forEach(key => {
      if (!['exportTime', 'stage', 'startDate', 'endDate', 'status', 'type'].includes(key) && filterSummary[key]) {
        summaryData.push([key + ':', filterSummary[key]]);
      }
    });
    
    summaryData.push([]);
    summaryData.push([`━━━ 数据列表（共 ${data.length} 条记录） ━━━`]);
    summaryData.push([]);
    
    // 创建工作表，先添加筛选条件摘要
    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // 然后添加数据表格
    XLSX.utils.sheet_add_json(worksheet, data, { origin: -1, skipHeader: false });
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  } else {
    // 没有筛选条件摘要，直接导出数据
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // 生成Excel文件并触发下载
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fullFilename = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * 格式化日期时间为字符串
 * @param date 日期对象或时间戳
 * @returns 格式化后的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
