/**
 * 资源分析页面的字典、类型与聚合口径。
 *
 * 结构与《陕西国资云平台项目简报 · 可视化周报》一致：以「上云单位」为最小数据源，
 * 每个单位在各「区域 × 架构」下持有 vCPU / 内存 / 各类存储的配额与已分配量，
 * 页面上的所有图表、进度、明细表、单位卡片都由接口返回的同一份明细聚合而来，因此天然随筛选栏联动。
 *
 * 明细数据通过 @/services/sxxc/healthReport 的 getResourceUnits 获取，本文件只保留类型与纯函数，
 * 不再包含任何演示数据。
 */

/** 筛选条件，空字符串表示「全部」 */
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

/** 区域与架构为固定枚举，同时作为对比/堆叠柱状图的分类轴 */
export const REGIONS = ['专网区', '互联网区'];
export const ARCHS = ['C86', 'ARM'];
export const CHARGE_TYPES = ['商用', '试用', '自用'];

export interface Quota {
  total: number;
  allocated: number;
}

export type QuotaKey = 'cpu' | 'mem' | 'stdBlock' | 'ssd' | 'object' | 'cloudBackup';

/** 明细表 / 进度条中使用的资源类型顺序 */
export const QUOTA_METRICS: {
  key: QuotaKey;
  label: string;
  unit: string;
  color: string;
}[] = [
  { key: 'cpu', label: 'vCPU', unit: '核', color: '#1668dc' },
  { key: 'mem', label: '内存', unit: 'GB', color: '#7e4ce0' },
  { key: 'stdBlock', label: '标准块存储', unit: 'TB', color: '#22b35c' },
  { key: 'ssd', label: 'SSD块存储', unit: 'TB', color: '#12b3a6' },
  { key: 'object', label: '对象存储', unit: 'TB', color: '#d9822b' },
  { key: 'cloudBackup', label: '云外备份', unit: 'TB', color: '#c9483c' },
];

/** 区域简称，用于图表坐标轴（专网区 → 专网） */
export const ZONE_SHORT: Record<string, string> = {
  专网区: '专网',
  互联网区: '互网',
};

/** 各资源池分配率条形图的名称前缀 */
const RATE_PREFIX: Record<QuotaKey, string> = {
  cpu: 'vCPU ',
  mem: '内存-',
  stdBlock: '标存-',
  ssd: 'SSD-',
  object: '对象存-',
  cloudBackup: '云外备份-',
};

export interface CloudUnit {
  id: string;
  /** 上云单位（即租户） */
  name: string;
  chargeType: string;
  region: string;
  arch: string;
  system: string;
  /** 资产类型 */
  type: string;
  /** 主机（台） */
  hosts: number;
  /** 存储容量（GB），用于上云单位明细卡片 */
  storageGB: number;
  quotas: Record<QuotaKey, Quota>;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 图表与表格统一的数值格式：整数千分位，小数保留两位 */
export const formatChartNumber = (value: number): string =>
  Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** 区域 × 架构 组合，作为对比/堆叠柱状图的分类轴 */
export const ZONE_ARCH_LIST: { region: string; arch: string; label: string }[] = REGIONS.reduce<
  { region: string; arch: string; label: string }[]
>(
  (list, region) =>
    list.concat(
      ARCHS.map((arch) => ({
        region,
        arch,
        label: `${ZONE_SHORT[region]}${arch}`,
      }))
    ),
  []
);

/** 从明细中按出现顺序去重提取字符串字段，用于生成筛选下拉选项 */
const distinctValues = (units: CloudUnit[], pick: (unit: CloudUnit) => string): string[] =>
  units.reduce<string[]>((list, unit) => {
    const value = pick(unit);
    return value && list.indexOf(value) === -1 ? list.concat(value) : list;
  }, []);

/** 筛选栏各下拉的选项值，全部由接口明细动态派生 */
export const buildFilterOptions = (units: CloudUnit[]): Record<FilterKey, string[]> => ({
  region: distinctValues(units, (unit) => unit.region),
  tenant: distinctValues(units, (unit) => unit.name),
  system: distinctValues(units, (unit) => unit.system),
  type: distinctValues(units, (unit) => unit.type),
});

/** 按筛选条件过滤明细（空字符串表示「全部」） */
export const filterUnits = (units: CloudUnit[], filters: Pick<ResourceFilters, FilterKey>): CloudUnit[] =>
  units.filter(
    (unit) =>
      (!filters.region || unit.region === filters.region) &&
      (!filters.tenant || unit.name === filters.tenant) &&
      (!filters.system || unit.system === filters.system) &&
      (!filters.type || unit.type === filters.type)
  );

const sumQuota = (units: CloudUnit[], key: QuotaKey): Quota =>
  units.reduce<Quota>(
    (acc, unit) => ({
      total: round2(acc.total + unit.quotas[key].total),
      allocated: round2(acc.allocated + unit.quotas[key].allocated),
    }),
    { total: 0, allocated: 0 }
  );

const rateOf = (quota: Quota) => (quota.total > 0 ? Math.round((quota.allocated / quota.total) * 10000) / 100 : 0);

const pickQuota = (units: CloudUnit[], key: QuotaKey, region: string, arch: string) =>
  sumQuota(
    units.filter((unit) => unit.region === region && unit.arch === arch),
    key
  );

export interface OverviewMetrics {
  /** 上云单位数 */
  unitCount: number;
  /** 上云单位中商用计费的单位数 */
  commercialUnitCount: number;
  /** 云服务器（主机台数） */
  serverCount: number;
  /** 云服务器按计费类型的分布 */
  serverByCharge: { chargeType: string; count: number }[];
  /** vCPU 配额总量（核） */
  cpuTotal: number;
  /** vCPU 分配率（%） */
  cpuAllocRate: string;
  /** 存储容量总量（GB） */
  storageTotalGB: number;
  /** 存储容量总量（TB） */
  storageTotalTB: string;
  /** 业务系统数 */
  systemCount: number;
}

export const buildOverview = (units: CloudUnit[]): OverviewMetrics => {
  const cpu = sumQuota(units, 'cpu');
  const storageTB = sumQuota(units, 'stdBlock').total + sumQuota(units, 'ssd').total + sumQuota(units, 'object').total;
  return {
    unitCount: new Set(units.map((unit) => unit.name)).size,
    commercialUnitCount: new Set(units.filter((unit) => unit.chargeType === '商用').map((unit) => unit.name)).size,
    serverCount: units.reduce((total, unit) => total + unit.hosts, 0),
    serverByCharge: CHARGE_TYPES.map((chargeType) => ({
      chargeType,
      count: units.filter((unit) => unit.chargeType === chargeType).reduce((total, unit) => total + unit.hosts, 0),
    })),
    cpuTotal: Math.round(cpu.total),
    cpuAllocRate: rateOf(cpu).toFixed(2),
    storageTotalGB: Math.round(storageTB * 1024),
    storageTotalTB: storageTB.toFixed(2),
    systemCount: new Set(units.map((unit) => unit.system)).size,
  };
};

export interface ZoneArchUsage {
  label: string;
  region: string;
  arch: string;
  total: number;
  allocated: number;
  rate: number;
}

/** 指定资源在「区域 × 架构」上的总量 / 已分配，用于对比柱状图与堆叠柱状图 */
export const calcZoneArchUsage = (units: CloudUnit[], key: QuotaKey): ZoneArchUsage[] =>
  ZONE_ARCH_LIST.map(({ region, arch, label }) => {
    const quota = pickQuota(units, key, region, arch);
    return {
      label,
      region,
      arch,
      total: quota.total,
      allocated: quota.allocated,
      rate: rateOf(quota),
    };
  });

export interface AllocationRate {
  key: string;
  label: string;
  rate: number;
}

/** 各资源池分配率，用于横向条形图 */
export const calcAllocationRates = (units: CloudUnit[]): AllocationRate[] =>
  QUOTA_METRICS.filter((metric) => metric.key !== 'cloudBackup').reduce<AllocationRate[]>((list, metric) => {
    const items = ZONE_ARCH_LIST.reduce<AllocationRate[]>((rows, { region, arch, label }) => {
      const quota = pickQuota(units, metric.key, region, arch);
      return quota.total > 0
        ? rows.concat({
            key: `${metric.key}-${label}`,
            label: `${RATE_PREFIX[metric.key]}${label}`,
            rate: rateOf(quota),
          })
        : rows;
    }, []);
    return list.concat(items);
  }, []);

export interface AllocationProgress {
  key: QuotaKey;
  label: string;
  unit: string;
  color: string;
  total: number;
  allocated: number;
  rate: number;
}

/** 分配进度卡片的进度条配色 */
const PROGRESS_COLORS: Record<string, string> = {
  stdBlock: '#1668dc',
  ssd: '#7e4ce0',
  object: '#22b35c',
  cpu: '#1668dc',
  mem: '#d9822b',
};

/** 存储 / 计算分配进度，用于进度条卡片 */
export const calcAllocationProgress = (units: CloudUnit[]): AllocationProgress[] =>
  (['stdBlock', 'ssd', 'object', 'cpu', 'mem'] as QuotaKey[]).map((key) => {
    const metric = QUOTA_METRICS.find((item) => item.key === key) as (typeof QUOTA_METRICS)[number];
    const quota = sumQuota(units, key);
    return {
      key,
      label: `${metric.label}(${metric.unit})`,
      unit: metric.unit,
      color: PROGRESS_COLORS[key],
      total: quota.total,
      allocated: quota.allocated,
      rate: rateOf(quota),
    };
  });

export interface DetailCell extends Quota {
  rest: number;
  rate: number;
  /** 该区域架构下是否存在此类资源 */
  exists: boolean;
}

export interface DetailRow {
  key: QuotaKey;
  label: string;
  unit: string;
  color: string;
  cells: DetailCell[];
  total: DetailCell;
}

const toDetailCell = (quota: Quota): DetailCell => ({
  total: quota.total,
  allocated: quota.allocated,
  rest: round2(quota.total - quota.allocated),
  rate: rateOf(quota),
  exists: quota.total > 0,
});

/** 资源使用情况明细表（含云外部署）的行数据 */
export const calcDetailRows = (units: CloudUnit[]): DetailRow[] =>
  QUOTA_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    color: metric.color,
    cells: ZONE_ARCH_LIST.map(({ region, arch }) => toDetailCell(pickQuota(units, metric.key, region, arch))),
    total: toDetailCell(sumQuota(units, metric.key)),
  }));

export interface UnitCard {
  id: string;
  name: string;
  chargeType: string;
  hosts: number;
  cpu: number;
  mem: number;
  storageGB: number;
}

/** 上云单位资源明细卡片 */
export const calcUnitCards = (units: CloudUnit[]): UnitCard[] =>
  units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    chargeType: unit.chargeType,
    hosts: unit.hosts,
    cpu: Math.round(unit.quotas.cpu.allocated),
    mem: Math.round(unit.quotas.mem.allocated),
    storageGB: unit.storageGB,
  }));

export interface TenantUsage {
  /** 聚合键：单位名 | 计费类型 */
  key: string;
  /** 展示名；同名单位存在多种计费类型时追加「(计费类型)」，如 环保集团(商用) */
  label: string;
  name: string;
  chargeType: string;
  /** 主机数（台） */
  hosts: number;
  /** vCPU 已分配（核） */
  cpuAllocated: number;
  /** 存储容量（GB） */
  storageGB: number;
}

/**
 * 按「租户（上云单位）× 计费类型」聚合，用于租户排行与三维对比图。
 * 默认按主机数降序，排行图可再按各自指标排序。
 */
export const calcTenantUsage = (units: CloudUnit[]): TenantUsage[] => {
  const chargeTypesByName = new Map<string, Set<string>>();
  const map = new Map<string, TenantUsage>();

  units.forEach((unit) => {
    const key = `${unit.name}|${unit.chargeType}`;
    const chargeSet = chargeTypesByName.get(unit.name) ?? new Set<string>();
    chargeSet.add(unit.chargeType);
    chargeTypesByName.set(unit.name, chargeSet);

    const prev = map.get(key);
    const next: TenantUsage = prev
      ? {
          ...prev,
          hosts: prev.hosts + unit.hosts,
          cpuAllocated: round2(prev.cpuAllocated + unit.quotas.cpu.allocated),
          storageGB: prev.storageGB + unit.storageGB,
        }
      : {
          key,
          label: unit.name,
          name: unit.name,
          chargeType: unit.chargeType,
          hosts: unit.hosts,
          cpuAllocated: round2(unit.quotas.cpu.allocated),
          storageGB: unit.storageGB,
        };
    map.set(key, next);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      label: (chargeTypesByName.get(item.name)?.size ?? 0) > 1 ? `${item.name}(${item.chargeType})` : item.name,
    }))
    .sort((a, b) => b.hosts - a.hosts || b.cpuAllocated - a.cpuAllocated || b.storageGB - a.storageGB || a.label.localeCompare(b.label, 'zh-Hans-CN'));
};
