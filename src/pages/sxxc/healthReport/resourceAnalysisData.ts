/**
 * 资源分析页面的字典、演示数据与聚合口径。
 *
 * 结构与《陕西国资云平台项目简报 · 可视化周报》一致：以「上云单位」为最小数据源，
 * 每个单位在各「区域 × 架构」下持有 vCPU / 内存 / 各类存储的配额与已分配量，
 * 页面上的所有图表、进度、明细表、单位卡片都由同一份数据聚合而来，因此天然随筛选栏联动。
 *
 * 当前数值为演示数据，接入后端时只需替换 UNIT_SEEDS（或改为接口返回）并保持 CloudUnit 结构不变。
 */

/** 筛选条件，空字符串表示「全部」 */
export const ALL = '';

export interface ResourceFilters {
  region: string;
  tenant: string;
  system: string;
  type: string;
  dimension: string;
}

export type FilterKey = 'region' | 'tenant' | 'system' | 'type';

export interface SelectOption {
  label: string;
  value: string;
}

export const REGIONS = ['专网区', '互联网区'];
export const ARCHS = ['C86', 'ARM'];
export const CHARGE_TYPES = ['商用', '试用', '自用'];
export const ASSET_TYPES = ['物理服务器', '虚拟服务器'];
export const SYSTEMS = ['协同办公', '人力资源', '生产调度', '设备管理', '工业物联', '质量追溯', '采购平台', '供应链', '智慧水务', '客户服务', '数据中台', '运维平台'];

/** 汇总维度，与筛选栏中的「汇总维度」下拉对应 */
export const DIMENSIONS: SelectOption[] = [
  { label: '区域', value: 'region' },
  { label: '租户', value: 'tenant' },
  { label: '业务系统', value: 'system' },
  { label: '资产类型', value: 'type' },
];

export interface Quota {
  total: number;
  allocated: number;
}

export type QuotaKey = 'cpu' | 'mem' | 'stdBlock' | 'ssd' | 'object' | 'cloudBackup';

/** 明细表 / 进度条中使用的资源类型顺序 */
export const QUOTA_METRICS: { key: QuotaKey; label: string; unit: string; color: string }[] = [
  { key: 'cpu', label: 'vCPU', unit: '核', color: '#1668dc' },
  { key: 'mem', label: '内存', unit: 'GB', color: '#7e4ce0' },
  { key: 'stdBlock', label: '标准块存储', unit: 'TB', color: '#22b35c' },
  { key: 'ssd', label: 'SSD块存储', unit: 'TB', color: '#12b3a6' },
  { key: 'object', label: '对象存储', unit: 'TB', color: '#d9822b' },
  { key: 'cloudBackup', label: '云外备份', unit: 'TB', color: '#c9483c' },
];

/** 区域简称，用于图表坐标轴（专网区 → 专网） */
export const ZONE_SHORT: Record<string, string> = { 专网区: '专网', 互联网区: '互网' };

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
  Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toQuota = (allocated: number, rate: number): Quota => ({
  allocated: round2(allocated),
  total: rate > 0 ? round2(allocated / rate) : 0,
});

/** 各区域架构下的基准分配率，用于由「已分配」反推「总量」 */
const BASE_RATES: Record<string, Record<QuotaKey, number>> = {
  '专网区|C86': { cpu: 0.4478, mem: 0.5322, stdBlock: 0.1929, ssd: 0.4271, object: 0.0059, cloudBackup: 0.007 },
  '专网区|ARM': { cpu: 0.0784, mem: 0.0692, stdBlock: 0.1929, ssd: 0, object: 0.0059, cloudBackup: 0.007 },
  '互联网区|C86': { cpu: 0.6021, mem: 0.492, stdBlock: 0.1819, ssd: 0.8106, object: 0.0122, cloudBackup: 0.007 },
  '互联网区|ARM': { cpu: 0.0903, mem: 0.0884, stdBlock: 0.1226, ssd: 0, object: 0.0489, cloudBackup: 0.007 },
};

/** 云外备份仅部分单位使用：[单位, 计费类型, 总量(TB), 已分配(TB)] */
const CLOUD_BACKUP_SEEDS: [string, string, number, number][] = [
  ['水发集团', '商用', 400, 2.79],
  ['环保集团', '试用', 400, 2.8],
];

/** 上云单位演示数据：[单位, 计费类型, 主机(台), CPU(核), 内存(GB), 存储(GB), 区域, 架构] */
const UNIT_SEEDS: [string, string, number, number, number, number, string, string][] = [
  ['利用外资', '商用', 76, 856, 1544, 53548, '专网区', 'C86'],
  ['工业云', '商用', 64, 465, 1329, 27772, '专网区', 'C86'],
  ['环保集团', '商用', 50, 1232, 3216, 37520, '互联网区', 'C86'],
  ['国资研究院', '商用', 45, 734, 2276, 38702, '互联网区', 'C86'],
  ['陕数集团', '商用', 18, 312, 1072, 15000, '专网区', 'ARM'],
  ['陕药集团', '试用', 17, 136, 816, 12858, '互联网区', 'ARM'],
  ['环保集团', '试用', 15, 188, 736, 7700, '互联网区', 'C86'],
  ['丝路数据', '商用', 11, 88, 336, 4140, '互联网区', 'ARM'],
  ['水发集团', '商用', 9, 136, 576, 13616, '互联网区', 'ARM'],
  ['农发数智', '商用', 9, 72, 144, 4648, '专网区', 'C86'],
  ['元景数创', '商用', 12, 288, 1080, 17962, '互联网区', 'C86'],
  ['华岳国际', '试用', 5, 88, 176, 900, '专网区', 'ARM'],
  ['国际经贸', '试用', 4, 32, 176, 960, '互联网区', 'ARM'],
  ['卫健人才', '试用', 1, 8, 16, 250, '互联网区', 'ARM'],
];

const buildUnits = (): CloudUnit[] =>
  UNIT_SEEDS.map(([name, chargeType, hosts, cpu, mem, storage, region, arch], index) => {
    const rates = BASE_RATES[`${region}|${arch}`];
    const storageTB = storage / 1024;
    const stdRatio = arch === 'C86' ? 0.6 : 0.85;
    const ssdRatio = arch === 'C86' ? 0.25 : 0;
    const objectRatio = arch === 'C86' ? 0.15 : 0.15;
    const backup = CLOUD_BACKUP_SEEDS.find(([unitName, unitCharge]) => unitName === name && unitCharge === chargeType);

    return {
      id: `UNIT-${String(index + 1).padStart(2, '0')}`,
      name,
      chargeType,
      region,
      arch,
      system: SYSTEMS[index % SYSTEMS.length],
      type: index % 5 === 0 ? '物理服务器' : '虚拟服务器',
      hosts,
      storageGB: storage,
      quotas: {
        cpu: toQuota(cpu, rates.cpu),
        mem: toQuota(mem, rates.mem),
        stdBlock: toQuota(storageTB * stdRatio, rates.stdBlock),
        ssd: toQuota(storageTB * ssdRatio, rates.ssd),
        object: toQuota(storageTB * objectRatio, rates.object),
        cloudBackup: backup ? { total: backup[2], allocated: backup[3] } : { total: 0, allocated: 0 },
      },
    };
  });

export const UNITS: CloudUnit[] = buildUnits();

/** 上云单位下拉选项（同名单位的商用/试用拆分合并为一个选项） */
export const TENANTS: string[] = UNITS.reduce<string[]>((list, unit) => (list.indexOf(unit.name) > -1 ? list : list.concat(unit.name)), []);

/** 区域 × 架构 组合，作为对比/堆叠柱状图的分类轴 */
export const ZONE_ARCH_LIST: { region: string; arch: string; label: string }[] = REGIONS.reduce<{ region: string; arch: string; label: string }[]>(
  (list, region) => list.concat(ARCHS.map((arch) => ({ region, arch, label: `${ZONE_SHORT[region]}${arch}` }))),
  [],
);

export const filterUnits = (filters: Pick<ResourceFilters, FilterKey>): CloudUnit[] =>
  UNITS.filter(
    (unit) =>
      (!filters.region || unit.region === filters.region) && (!filters.tenant || unit.name === filters.tenant) && (!filters.system || unit.system === filters.system) && (!filters.type || unit.type === filters.type),
  );

const sumQuota = (units: CloudUnit[], key: QuotaKey): Quota =>
  units.reduce<Quota>((acc, unit) => ({ total: round2(acc.total + unit.quotas[key].total), allocated: round2(acc.allocated + unit.quotas[key].allocated) }), { total: 0, allocated: 0 });

const rateOf = (quota: Quota) => (quota.total > 0 ? Math.round((quota.allocated / quota.total) * 10000) / 100 : 0);

const pickQuota = (units: CloudUnit[], key: QuotaKey, region: string, arch: string) => sumQuota(units.filter((unit) => unit.region === region && unit.arch === arch), key);

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
    return { label, region, arch, total: quota.total, allocated: quota.allocated, rate: rateOf(quota) };
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
      return quota.total > 0 ? rows.concat({ key: `${metric.key}-${label}`, label: `${RATE_PREFIX[metric.key]}${label}`, rate: rateOf(quota) }) : rows;
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
    const metric = QUOTA_METRICS.find((item) => item.key === key);
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
