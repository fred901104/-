import * as XLSX from "xlsx";

/**
 * 导出数据为Excel文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // 将数据转换为工作表
  const ws = XLSX.utils.json_to_sheet(data);

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 生成Excel文件并下载
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * 导出数据为CSV文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
) {
  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // 将数据转换为工作表
  const ws = XLSX.utils.json_to_sheet(data);

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  // 生成CSV文件并下载
  XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
}

/**
 * 格式化结算报表数据用于导出
 */
export function formatSettlementForExport(settlement: any) {
  return {
    "结算周期": settlement.weekNumber,
    "开始日期": new Date(settlement.startDate).toLocaleDateString("zh-CN"),
    "结束日期": new Date(settlement.endDate).toLocaleDateString("zh-CN"),
    "总发放积分": settlement.totalPoints.toFixed(2),
    "P_Genesis积分": settlement.genesisPoints.toFixed(2),
    "P_Eco积分": settlement.ecoPoints.toFixed(2),
    "P_Trade积分": settlement.tradePoints.toFixed(2),
    "参与人数": settlement.participantCount,
    "状态": settlement.status === "pending" ? "待确认" : settlement.status === "confirmed" ? "已确认" : "已发放",
    "创建时间": new Date(settlement.createdAt).toLocaleString("zh-CN"),
  };
}

/**
 * 格式化用户积分历史用于导出
 */
export function formatUserPointsForExport(record: any) {
  return {
    "用户UID": record.userId,
    "用户名": record.user?.name || "Unknown",
    "积分类型": record.type === "genesis" ? "P_Genesis" : record.type === "eco" ? "P_Eco" : "P_Trade",
    "积分变化": record.amount.toFixed(2),
    "当前余额": record.balance.toFixed(2),
    "来源": record.source || "-",
    "备注": record.reason || "-",
    "时间": new Date(record.createdAt).toLocaleString("zh-CN"),
  };
}

/**
 * 格式化工单数据用于导出
 */
export function formatTicketForExport(ticket: any) {
  return {
    "工单号": ticket.ticket.id,
    "用户UID": ticket.ticket.userId,
    "用户名": ticket.user?.name || "Unknown",
    "类型": ticket.ticket.type === "bug" ? "Bug" : ticket.ticket.type === "suggestion" ? "建议" : "必要信息",
    "标题": ticket.ticket.title,
    "优先级": ticket.ticket.priority,
    "状态": ticket.ticket.status === "pending" ? "待审核" : ticket.ticket.status === "approved" ? "已通过" : "已拒绝",
    "积分": ticket.ticket.points?.toFixed(2) || "0.00",
    "提交时间": new Date(ticket.ticket.createdAt).toLocaleString("zh-CN"),
  };
}

/**
 * 格式化交易数据用于导出
 */
export function formatTradeForExport(trade: any) {
  return {
    "交易ID": trade.trade.id,
    "用户UID": trade.trade.userId,
    "用户名": trade.user?.name || "Unknown",
    "交易类型": trade.trade.tradeType === "spot" ? "现货" : "合约",
    "交易对": trade.trade.tradePair,
    "交易量": `$${(trade.trade.volume || 0).toLocaleString()}`,
    "手续费": `$${trade.trade.feeAmount.toFixed(2)}`,
    "持仓时长": `${trade.trade.holdingDuration || 0}h`,
    "有效开单": (trade.trade.orderCount || 0) > 0 ? "是" : "否",
    "积分": trade.trade.points?.toFixed(2) || "0.00",
    "交易时间": new Date(trade.trade.createdAt).toLocaleString("zh-CN"),
  };
}

/**
 * 格式化直播数据用于导出
 */
export function formatStreamForExport(stream: any) {
  return {
    "直播ID": stream.stream.id,
    "主播UID": stream.stream.streamerId,
    "主播名": stream.streamer?.name || "Unknown",
    "直播时长": `${Math.floor((stream.stream.duration || 0) / 60)}h ${(stream.stream.duration || 0) % 60}m`,
    "平均CCU": stream.stream.avgCcu || 0,
    "峰值CCU": stream.stream.peakCcu || 0,
    "互动次数": stream.stream.interactionCount || 0,
    "积分": stream.stream.points?.toFixed(2) || "0.00",
    "开始时间": new Date(stream.stream.startTime).toLocaleString("zh-CN"),
    "结束时间": stream.stream.endTime ? new Date(stream.stream.endTime).toLocaleString("zh-CN") : "进行中",
  };
}
