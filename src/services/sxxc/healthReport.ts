/**
 * 分析报表模块接口（服务：ln-server-task，前缀 /biz/analysis）
 *
 * 响应统一包装：{ code, msg, data }，业务数据全部在 data 内（拦截器已按 biz/analysis 白名单放行原始数据）。
 * 文档约定：
 *   - overview 的 value/subValue 为字符串；resourceUsage 的 total/allocated/remaining 为数字、allocationRate 为字符串；
 *     detail 的所有值均为字符串（"-" 或数字字符串）；unitDetail 的四个 Count 字段为数字。
 *   - "-"、"--"、"0%"、"约xx.xx TB" 均为约定展示值，前端原样渲染，不转数字、不替换文案。
 *   - 数据断流时接口正常返回默认值（0 / "-" / "--" / []），前端无需异常分支。
 *   - date 不传 = 查 24 小时前；传过去某天 = 该天 23:59:59 快照；传今天 = 当前时刻。
 */
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

/** 公共筛选参数（全部可选；未选择该维度时不传） */
export interface AnalysisQuery {
  /** 查询日期 yyyy-MM-dd，如 "2026-10-09" */
  date?: string;
  /** 区域（当前监控侧 label 未写入，传参暂不生效） */
  region?: string;
  /** 租户（同 region，暂不生效） */
  tenant?: string;
  /** 业务系统名，取 /filters 返回的 businessSystem[].name */
  busigroup?: string;
  /** 资产类型，取 /filters 返回的 assetType[].name */
  assetType?: string;
}

/* ============================================================================
 * 顶部筛选栏数据接口
 * GET /biz/analysis/filters
 * ========================================================================== */

/** 筛选项条目 */
export interface AnalysisFilterItem {
  name: string;
}

/** 筛选栏数据（后端原始结构，字段可能缺失） */
export interface AnalysisFilterData {
  region: AnalysisFilterItem[];
  tenant: AnalysisFilterItem[];
  businessSystem: AnalysisFilterItem[];
  assetType: AnalysisFilterItem[];
}

/** 筛选栏选项（前端视图模型：四个下拉各自的名字列表） */
export interface AnalysisFilterOptions {
  region: string[];
  tenant: string[];
  system: string[];
  type: string[];
}

/** 后端条目 → 名字字符串，容忍 null / 缺 name / 非对象元素 */
const toName = (item: unknown): string => {
  if (item && typeof item === 'object' && typeof (item as AnalysisFilterItem).name === 'string') {
    return (item as AnalysisFilterItem).name;
  }
  return '';
};

const toNameList = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  return list.map(toName).filter((name) => name !== '');
};

/** 获取顶部筛选栏的四个下拉选项（区域 / 租户 / 业务系统 / 资产类型） */
export function getAnalysisFilters(): Promise<AnalysisFilterOptions> {
  return request(`/sxxcTask/biz/analysis/filters`, {
    method: RequestMethod.Get,
  }).then((res): AnalysisFilterOptions => {
    const data = res?.data ?? {};
    return {
      region: toNameList(data.region),
      tenant: toNameList(data.tenant),
      system: toNameList(data.businessSystem),
      type: toNameList(data.assetType),
    };
  });
}

/* ============================================================================
 * 核心指标概览
 * GET /biz/analysis/overview → data: 卡片数组（顺序固定）
 * ========================================================================== */

/** 概览卡片（value/subValue 均为字符串，"--" 表示无数据，原样展示） */
export interface OverviewCardItem {
  key: string;
  name: string;
  unit: string;
  /** 副标题，如「含商用」「分配率」 */
  subLabel: string;
  value: string;
  subValue: string;
}

/** 获取核心指标概览 5 张卡片 */
export function getAnalysisOverview(params?: AnalysisQuery): Promise<OverviewCardItem[]> {
  return request(`/sxxcTask/biz/analysis/overview`, {
    method: RequestMethod.Get,
    params,
  }).then((res): OverviewCardItem[] => {
    const list = res?.data;
    return Array.isArray(list) ? list : [];
  });
}

/* ============================================================================
 * 资源使用情况（图表数据）
 * GET /biz/analysis/resourceUsage
 * ========================================================================== */

/** 图表分组维度（专网C86 / 专网ARM / 互网C86 / 互网ARM） */
export interface UsageGroup {
  key: string;
  name: string;
}

/** 资源项：总量/已分配/剩余为数字（断流为 0），分配率为 "xx.xx%" 字符串 */
export interface ResourceUsageItem {
  key: string;
  name: string;
  unit: string;
  total: number;
  allocated: number;
  remaining: number;
  allocationRate: string;
}

/** 资源使用率指标定义（PromQL 模板，供单机使用率查询与阈值着色，页面暂不展示） */
export interface UsageRateDef {
  name: string;
  unit: string;
  /** PromQL 模板，含 $ip、$busigroup 占位符 */
  metrics: string;
  maxThreshold: string;
  minThreshold: string;
}

export interface ResourceUsageData {
  groups: UsageGroup[];
  resources: ResourceUsageItem[];
  usageRate: UsageRateDef[];
}

const toNum = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const toStr = (value: unknown): string => (typeof value === 'string' ? value : '');

/** 获取资源使用情况图表数据 */
export function getAnalysisResourceUsage(params?: AnalysisQuery): Promise<ResourceUsageData> {
  return request(`/sxxcTask/biz/analysis/resourceUsage`, {
    method: RequestMethod.Get,
    params,
  }).then((res): ResourceUsageData => {
    const data = res?.data ?? {};
    return {
      groups: Array.isArray(data.groups)
        ? data.groups.map((item: any) => ({ key: toStr(item?.key), name: toStr(item?.name) }))
        : [],
      resources: Array.isArray(data.resources)
        ? data.resources.map((item: any) => ({
            key: toStr(item?.key),
            name: toStr(item?.name),
            unit: toStr(item?.unit),
            total: toNum(item?.total),
            allocated: toNum(item?.allocated),
            remaining: toNum(item?.remaining),
            allocationRate: toStr(item?.allocationRate),
          }))
        : [],
      usageRate: Array.isArray(data.usageRate)
        ? data.usageRate.map((item: any) => ({
            name: toStr(item?.name),
            unit: toStr(item?.unit),
            metrics: toStr(item?.metrics),
            maxThreshold: toStr(item?.maxThreshold),
            minThreshold: toStr(item?.minThreshold),
          }))
        : [],
    };
  });
}

/* ============================================================================
 * 资源使用明细表
 * GET /biz/analysis/detail → data: 资源行数组（固定 5 行）
 * 所有值均为字符串：无数据为 "-"，有数据为数字字符串或 "xx.xx%"，原样渲染
 * ========================================================================== */

/** 明细表数值单元格（字符串，"-" 表示无数据） */
export interface DetailCellItem {
  total: string;
  allocated: string;
  remaining: string;
  allocationRate: string;
}

/** 明细表资源行：总体合计 + 各分组明细 */
export interface DetailResourceItem {
  key: string;
  name: string;
  unit: string;
  total: string;
  allocated: string;
  remaining: string;
  allocationRate: string;
  groups: DetailGroupItem[];
}

/** 分组明细单元格带分组标识 */
export interface DetailGroupItem extends DetailCellItem {
  key: string;
  name: string;
}

/** 获取资源使用明细表数据 */
export function getAnalysisDetail(params?: AnalysisQuery): Promise<DetailResourceItem[]> {
  return request(`/sxxcTask/biz/analysis/detail`, {
    method: RequestMethod.Get,
    params,
  }).then((res): DetailResourceItem[] => {
    const list = res?.data;
    if (!Array.isArray(list)) return [];
    return list.map((row: any) => ({
      key: toStr(row?.key),
      name: toStr(row?.name),
      unit: toStr(row?.unit),
      total: toStr(row?.total),
      allocated: toStr(row?.allocated),
      remaining: toStr(row?.remaining),
      allocationRate: toStr(row?.allocationRate),
      groups: Array.isArray(row?.groups)
        ? row.groups.map((group: any) => ({
            key: toStr(group?.key),
            name: toStr(group?.name),
            total: toStr(group?.total),
            allocated: toStr(group?.allocated),
            remaining: toStr(group?.remaining),
            allocationRate: toStr(group?.allocationRate),
          }))
        : [],
    }));
  });
}

/* ============================================================================
 * 上云单位资源明细（同时供三个租户排名图使用，前端复用同一次请求）
 * GET /biz/analysis/unitDetail
 * ========================================================================== */

/** 上云单位明细条目（hostCount 只统计在线资产 asset_up==1） */
export interface UnitDetailItem {
  name: string;
  /** 服务类型（商用/试用），label 待接入，当前固定 "--" */
  serviceType: string;
  /** 在线主机数（台） */
  hostCount: number;
  /** CPU 核数（核） */
  cpuCount: number;
  /** 内存总量（GB） */
  memCount: number;
  /** 存储总量（GB） */
  storageCount: number;
}

/** 获取上云单位资源明细（与三个租户排名图数据同源） */
export function getAnalysisUnitDetail(params?: AnalysisQuery): Promise<UnitDetailItem[]> {
  return request(`/sxxcTask/biz/analysis/unitDetail`, {
    method: RequestMethod.Get,
    params,
  }).then((res): UnitDetailItem[] => {
    const list = res?.data;
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      name: toStr(item?.name),
      serviceType: toStr(item?.serviceType),
      hostCount: toNum(item?.hostCount),
      cpuCount: toNum(item?.cpuCount),
      memCount: toNum(item?.memCount),
      storageCount: toNum(item?.storageCount),
    }));
  });
}
