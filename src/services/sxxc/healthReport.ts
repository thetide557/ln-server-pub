/**
 * 健康报告 · 资源分析模块接口
 *
 * 后端契约约定（路径以后端网关实际配置为准）：
 *   GET /sxxcHealth/resourceAnalysis/units
 *   入参（均可选，空值表示全部）：region / tenant / system / type
 *   返回：{ dat: RawCloudUnitRecord[] }
 *
 * 前端保留全部聚合口径（见 resourceAnalysisData.ts），接口只需返回「上云单位」明细，
 * 页面上的概览指标、图表、明细表、单位卡片均由该明细在前端聚合而来。
 */
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

/** 资源池配额，单位以各资源自身口径为准（vCPU:核 / 内存:GB / 存储:TB） */
export interface QuotaRecord {
  /** 配额总量 */
  total: number;
  /** 已分配量 */
  allocated: number;
}

export type QuotaKeyRecord = 'cpu' | 'mem' | 'stdBlock' | 'ssd' | 'object' | 'cloudBackup';

/** normalize 后的完整资源池配额，六个资源池均有值（未使用为 0） */
export type CloudUnitQuotas = Record<QuotaKeyRecord, QuotaRecord>;

/** 上云单位资源明细（前端视图模型，字段与 resourceAnalysisData.ts 的 CloudUnit 同构） */
export interface CloudUnitRecord {
  id: string;
  /** 上云单位（即租户） */
  name: string;
  /** 计费类型：商用 / 试用 / 自用 */
  chargeType: string;
  /** 区域：专网区 / 互联网区 */
  region: string;
  /** 芯片架构：C86 / ARM */
  arch: string;
  /** 业务系统 */
  system: string;
  /** 资产类型：物理服务器 / 虚拟服务器 */
  type: string;
  /** 主机（台） */
  hosts: number;
  /** 存储容量（GB），用于上云单位明细卡片 */
  storageGB: number;
  /** 各资源池配额 */
  quotas: CloudUnitQuotas;
}

/** 后端原始返回：字段可能缺失、quotas 只包含实际使用的资源池 */
type RawCloudUnitRecord = Partial<Omit<CloudUnitRecord, 'quotas'>> & {
  quotas?: Partial<CloudUnitQuotas>;
};

/** 资源分析查询参数，空字符串 / 不传表示「全部」 */
export interface ResourceAnalysisQuery {
  region?: string;
  tenant?: string;
  system?: string;
  type?: string;
}

const QUOTA_KEYS: QuotaKeyRecord[] = ['cpu', 'mem', 'stdBlock', 'ssd', 'object', 'cloudBackup'];

const toNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * 后端明细 → 前端视图模型：补齐 id、缺省资源池与非法数值，
 * 保证下游聚合函数拿到的结构始终完整。
 */
export const normalizeCloudUnit = (record: RawCloudUnitRecord, index: number): CloudUnitRecord => {
  const quotas = QUOTA_KEYS.reduce<CloudUnitQuotas>((acc, key) => {
    const quota = record.quotas?.[key];
    acc[key] = quota
      ? { total: toNumber(quota.total), allocated: toNumber(quota.allocated) }
      : { total: 0, allocated: 0 };
    return acc;
  }, {} as CloudUnitQuotas);

  return {
    id: record.id || `UNIT-${index + 1}`,
    name: record.name || '',
    chargeType: record.chargeType || '',
    region: record.region || '',
    arch: record.arch || '',
    system: record.system || '',
    type: record.type || '',
    hosts: toNumber(record.hosts),
    storageGB: toNumber(record.storageGB),
    quotas,
  };
};

/**
 * 联调开关：后端接口未就绪前置 true，由本地 mock 模拟接口返回；
 * 后端就绪后改为 false（并可删除本文件底部的 MOCK 区块）。
 */
const USE_MOCK = true;

/** 获取资源分析 · 上云单位资源明细列表 */
export function getResourceUnits(params?: ResourceAnalysisQuery) {
  if (USE_MOCK) {
    return getMockResourceUnits(params);
  }
  return request(`/sxxcHealth/resourceAnalysis/units`, {
    method: RequestMethod.Get,
    params,
  }).then((res): CloudUnitRecord[] => {
    const list = (res?.dat ?? []) as RawCloudUnitRecord[];
    return Array.isArray(list) ? list.map(normalizeCloudUnit) : [];
  });
}

/* ============================================================================
 * MOCK 区块（仅 USE_MOCK = true 时使用，后端接口就绪后整段删除即可）
 * 数据口径与改造前的页面演示数据完全一致，结构严格对齐 CloudUnitRecord。
 * ========================================================================== */

const MOCK_SYSTEMS = ['协同办公', '人力资源', '生产调度', '设备管理', '工业物联', '质量追溯', '采购平台', '供应链', '智慧水务', '客户服务', '数据中台', '运维平台'];

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 各区域架构下的基准分配率，用于由「已分配」反推「总量」 */
const MOCK_BASE_RATES: Record<string, Record<QuotaKeyRecord, number>> = {
  '专网区|C86': { cpu: 0.4478, mem: 0.5322, stdBlock: 0.1929, ssd: 0.4271, object: 0.0059, cloudBackup: 0.007 },
  '专网区|ARM': { cpu: 0.0784, mem: 0.0692, stdBlock: 0.1929, ssd: 0, object: 0.0059, cloudBackup: 0.007 },
  '互联网区|C86': { cpu: 0.6021, mem: 0.492, stdBlock: 0.1819, ssd: 0.8106, object: 0.0122, cloudBackup: 0.007 },
  '互联网区|ARM': { cpu: 0.0903, mem: 0.0884, stdBlock: 0.1226, ssd: 0, object: 0.0489, cloudBackup: 0.007 },
};

/** 云外备份仅部分单位使用：[单位, 计费类型, 总量(TB), 已分配(TB)] */
const MOCK_CLOUD_BACKUP: [string, string, number, number][] = [
  ['水发集团', '商用', 400, 2.79],
  ['环保集团', '试用', 400, 2.8],
];

/** 上云单位演示数据：[单位, 计费类型, 主机(台), CPU已分配(核), 内存已分配(GB), 存储(GB), 区域, 架构] */
const MOCK_UNIT_SEEDS: [string, string, number, number, number, number, string, string][] = [
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

const buildMockUnits = (): CloudUnitRecord[] =>
  MOCK_UNIT_SEEDS.map(([name, chargeType, hosts, cpu, mem, storage, region, arch], index) => {
    const rates = MOCK_BASE_RATES[`${region}|${arch}`];
    const storageTB = storage / 1024;
    const stdRatio = arch === 'C86' ? 0.6 : 0.85;
    const ssdRatio = arch === 'C86' ? 0.25 : 0;
    const backup = MOCK_CLOUD_BACKUP.find(([unitName, unitCharge]) => unitName === name && unitCharge === chargeType);
    const toQuota = (allocated: number, rate: number): QuotaRecord => ({
      allocated: round2(allocated),
      total: rate > 0 ? round2(allocated / rate) : 0,
    });

    return {
      id: `UNIT-${String(index + 1).padStart(2, '0')}`,
      name,
      chargeType,
      region,
      arch,
      system: MOCK_SYSTEMS[index % MOCK_SYSTEMS.length],
      type: index % 5 === 0 ? '物理服务器' : '虚拟服务器',
      hosts,
      storageGB: storage,
      quotas: {
        cpu: toQuota(cpu, rates.cpu),
        mem: toQuota(mem, rates.mem),
        stdBlock: toQuota(storageTB * stdRatio, rates.stdBlock),
        ssd: toQuota(storageTB * ssdRatio, rates.ssd),
        object: toQuota(storageTB * 0.15, rates.object),
        cloudBackup: backup ? { total: backup[2], allocated: backup[3] } : { total: 0, allocated: 0 },
      },
    };
  });

const MOCK_UNITS = buildMockUnits();

/** 模拟后端筛选行为：入参为空表示「全部」 */
function getMockResourceUnits(params?: ResourceAnalysisQuery): Promise<CloudUnitRecord[]> {
  const list = MOCK_UNITS.filter(
    (unit) =>
      (!params?.region || unit.region === params.region) &&
      (!params?.tenant || unit.name === params.tenant) &&
      (!params?.system || unit.system === params.system) &&
      (!params?.type || unit.type === params.type),
  );
  // 模拟网络耗时，使页面 loading 态可被验证
  return new Promise((resolve) => {
    setTimeout(() => resolve(list), 300);
  });
}
