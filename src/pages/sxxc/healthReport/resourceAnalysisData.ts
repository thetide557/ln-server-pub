/**
 * 资源分析页面共享类型与工具。
 * 数据由后端 /biz/analysis 预聚合接口直接提供（见 services/sxxc/healthReport.ts），
 * 本文件不再承载前端聚合口径。
 */
import type { DetailResourceItem, OverviewCardItem, ResourceUsageData, UnitDetailItem } from '@/services/sxxc/healthReport';

/** 「全部」选项值（空字符串，后端未选择该维度时不传参） */
export const ALL = '';

export interface ResourceFilters {
  region: string;
  tenant: string;
  system: string;
  type: string;
}

export type FilterKey = 'region' | 'tenant' | 'system' | 'type';

export interface SelectOption {
  label: string;
  value: string;
}

/** 截断到小数点后两位（不四舍五入） */
const truncate2 = (value: number) => Math.floor(value * 100) / 100;

/** 图表数值格式化：整数千分位，小数截断两位（不四舍五入） */
export const formatChartNumber = (value: number): string => {
  const truncated = truncate2(value);
  return Number.isInteger(truncated)
    ? truncated.toLocaleString('en-US')
    : truncated.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

/** 从 "xx.xx%" 分配率字符串解析数值（"0%" / 非法值 → 0） */
export const parseRate = (rate: string): number => {
  const value = parseFloat(rate);
  return Number.isFinite(value) ? value : 0;
};

/** 四个数据接口的返回集合（页面展示与 PDF 导出共用同一份结构） */
export interface ReportData {
  overviewCards: OverviewCardItem[];
  resourceUsage: ResourceUsageData;
  detailItems: DetailResourceItem[];
  unitDetails: UnitDetailItem[];
}
