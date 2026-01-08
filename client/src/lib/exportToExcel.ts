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
  // 如果有筛选条件摘要，在数据前面添加空行和摘要信息
  let worksheetData: any[] = [];
  
  if (filterSummary) {
    // 添加标题行
    worksheetData.push({ '筛选条件摘要': '' });
    
    // 添加筛选条件
    if (filterSummary.exportTime) {
      worksheetData.push({ '筛选条件摘要': '导出时间', '值': filterSummary.exportTime });
    }
    if (filterSummary.stage) {
      worksheetData.push({ '筛选条件摘要': '阶段筛选', '值': filterSummary.stage });
    }
    if (filterSummary.startDate || filterSummary.endDate) {
      const dateRange = `${filterSummary.startDate || '无'} 至 ${filterSummary.endDate || '无'}`;
      worksheetData.push({ '筛选条件摘要': '日期范围', '值': dateRange });
    }
    if (filterSummary.status) {
      worksheetData.push({ '筛选条件摘要': '状态筛选', '值': filterSummary.status });
    }
    if (filterSummary.type) {
      worksheetData.push({ '筛选条件摘要': '类型筛选', '值': filterSummary.type });
    }
    
    // 添加其他自定义筛选条件
    Object.keys(filterSummary).forEach(key => {
      if (!['exportTime', 'stage', 'startDate', 'endDate', 'status', 'type'].includes(key) && filterSummary[key]) {
        worksheetData.push({ '筛选条件摘要': key, '值': filterSummary[key] });
      }
    });
    
    // 添加空行分隔
    worksheetData.push({});
    worksheetData.push({ '筛选条件摘要': '数据列表', '值': `共 ${data.length} 条记录` });
    worksheetData.push({});
  }
  
  // 添加实际数据
  worksheetData = worksheetData.concat(data);

  // 创建工作簿
  const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: false });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

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
