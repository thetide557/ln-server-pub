export interface TrapKvPair {
  key: string;
  value: string;
}

export interface ParsedTrapKvResult {
  hasKvStructure: boolean;
  pairs: TrapKvPair[];
}

const HEAD_KEYS = ['设备名称', '设备IP', 'trap来源IP', '告警流水号'] as const;

const LEGACY_PRE_SPLIT_KEYS = [
  '所属区域',
  '弹性IP名称',
  '弹性IPID',
  '阈值规则名称',
  '门限值',
  '触发当前值',
] as const;

const DYNAMIC_KV_CONTAINER_KEYS = ['附加信息', '扩展定位信息'] as const;

const META_KEYS = [
  '告警类型',
  '源端告警级别',
  '源端确认状态',
  '设备自报时间',
  'Trap接收时间',
  '告警ID(整型)',
  'Trap OID',
  'SNMP引擎ID',
  'SNMP版本',
] as const;

const TAIL_CAUSE_KEYS = ['可能原因', '修复建议'] as const;

const KNOWN_TRAP_TOP_KEYS = new Set<string>([
  ...HEAD_KEYS,
  ...LEGACY_PRE_SPLIT_KEYS,
  ...DYNAMIC_KV_CONTAINER_KEYS,
  ...META_KEYS,
  ...TAIL_CAUSE_KEYS,
  '描述',
]);

/** 中文同义键归并映射：同一规范组在详情页仅保留一行 */
const CHINESE_SYNONYM_GROUP: Record<string, string> = {
  所属区域: 'region',
  区域: 'region',
  触发当前值: 'current_val',
  当前值: 'current_val',
  门限值: 'threshold_val',
  阈值规则名称: 'threshold_rule',
  弹性IP名称: 'eip_name',
  弹性IPID: 'eip_id',
};

/** 英文同义键映射：当对应规范组已存在相同值时去重，否则保留原键名 */
const ENGLISH_SYNONYM_GROUP: Record<string, string> = {
  region: 'region',
  SourceRegion: 'region',
  'Current value': 'current_val',
  Threshold: 'threshold_val',
  ThresholdRuleName: 'threshold_rule',
  eip_name: 'eip_name',
  eip_id: 'eip_id',
};

function isEmptyOrDash(val: unknown): boolean {
  const s = String(val ?? '').trim();
  return s === '' || s === '-';
}

export function isHuaweiTrapAnnotations(annotations?: Record<string, any> | null): boolean {
  if (!annotations || typeof annotations !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(annotations, '告警流水号') ||
    Object.prototype.hasOwnProperty.call(annotations, 'Trap OID')
  );
}

/**
 * 解析华为 ManageOne Trap 的 `附加信息` / `扩展定位信息` 键值串。
 * 同时支持英文逗号 `,` 与分号 `;` 分隔，正向预查 `(?=[^,;=]+=)` 防止误切值内部的普通逗号。
 */
export function parseTrapKvPairs(raw: string): ParsedTrapKvResult {
  const rawTrimmed = String(raw ?? '').trim();
  if (!rawTrimmed || rawTrimmed === '-') {
    return { hasKvStructure: false, pairs: [] };
  }

  // 清理华为北向 Trap 常见的末尾悬空分号或逗号
  const cleaned = rawTrimmed.replace(/[,;\s]+$/, '');
  if (!cleaned || cleaned === '-') {
    return { hasKvStructure: false, pairs: [] };
  }

  const segments = cleaned.split(/[,;]\s*(?=[^,;=]+=)/);
  const firstEq = segments[0] ? segments[0].indexOf('=') : -1;
  if (firstEq <= 0) {
    return { hasKvStructure: false, pairs: [] };
  }

  let matchedCount = 0;
  const pairs: TrapKvPair[] = [];

  for (const seg of segments) {
    const eqIdx = seg.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = seg.slice(0, eqIdx).trim();
    const value = seg.slice(eqIdx + 1).trim();
    if (!key) continue;
    matchedCount += 1;
    if (value !== '' && value !== '-') {
      pairs.push({ key, value });
    }
  }

  if (matchedCount === 0) {
    return { hasKvStructure: false, pairs: [] };
  }

  return { hasKvStructure: true, pairs };
}

/**
 * 判断华为 Trap 告警的 `描述` 是否为人工拼凑复读长句（仅用于通知模板，详情页不重复展示）。
 */
export function isRedundantTrapDescription(desc: string): boolean {
  const trimmed = String(desc ?? '').trim();
  if (!trimmed) return false;
  return trimmed.startsWith('设备 ') && (trimmed.includes('上报') || trimmed.includes('告警流水号'));
}

/**
 * 构建告警详情页要渲染的扩展属性行列表：
 * - 非华为 Trap 告警：保持原键序与原值不变；
 * - 华为 Trap 告警：执行 `设备名称===设备IP` 合并、空值/`-` 过滤、`附加信息`/`扩展定位信息` 动态拆行、同义键去重与复读版 `描述` 隐藏。
 */
export function buildEventAnnotationRows(annotations?: Record<string, any> | null): TrapKvPair[] {
  if (!annotations || typeof annotations !== 'object') return [];

  if (!isHuaweiTrapAnnotations(annotations)) {
    return Object.keys(annotations).map((key) => ({
      key,
      value: String(annotations[key] ?? ''),
    }));
  }

  const rows: TrapKvPair[] = [];
  const seenCanonGroups = new Map<string, Set<string>>();
  const seenExactKeyValues = new Map<string, Set<string>>();

  const pushUniqueRow = (key: string, rawVal: unknown, dedupeSynonyms = false) => {
    const k = String(key ?? '').trim();
    const v = String(rawVal ?? '').trim();
    if (!k || v === '' || v === '-') return;

    if (dedupeSynonyms) {
      const zhCanon = CHINESE_SYNONYM_GROUP[k];
      if (zhCanon) {
        if (seenCanonGroups.has(zhCanon)) return;
        seenCanonGroups.set(zhCanon, new Set([v]));
      } else {
        const enCanon = ENGLISH_SYNONYM_GROUP[k];
        if (enCanon) {
          const existingVals = seenCanonGroups.get(enCanon);
          if (existingVals && existingVals.has(v)) return;
          if (existingVals) {
            existingVals.add(v);
          } else {
            seenCanonGroups.set(enCanon, new Set([v]));
          }
        }
      }
    }

    const exactVals = seenExactKeyValues.get(k);
    if (exactVals && exactVals.has(v)) return;
    if (exactVals) {
      exactVals.add(v);
    } else {
      seenExactKeyValues.set(k, new Set([v]));
    }

    rows.push({ key: k, value: v });
  };

  // 1. 头部定位标识（若 设备名称 === 设备IP，仅保留 设备IP 一行）
  const devName = String(annotations['设备名称'] ?? '').trim();
  const devIp = String(annotations['设备IP'] ?? '').trim();
  const skipDevName = devName !== '' && devName !== '-' && devName === devIp;

  for (const key of HEAD_KEYS) {
    if (key === '设备名称' && skipDevName) continue;
    if (Object.prototype.hasOwnProperty.call(annotations, key)) {
      pushUniqueRow(key, annotations[key], false);
    }
  }

  // 2. 存量预拆属性（跳过空值与 '-'）
  for (const key of LEGACY_PRE_SPLIT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(annotations, key)) {
      pushUniqueRow(key, annotations[key], true);
    }
  }

  // 3. 动态拆解 `附加信息` 与 `扩展定位信息`（排在 `告警流水号` 之后、`告警类型` 之前）
  for (const containerKey of DYNAMIC_KV_CONTAINER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(annotations, containerKey)) continue;
    const rawText = String(annotations[containerKey] ?? '');
    if (isEmptyOrDash(rawText)) continue;

    const parsed = parseTrapKvPairs(rawText);
    if (parsed.hasKvStructure) {
      for (const pair of parsed.pairs) {
        pushUniqueRow(pair.key, pair.value, true);
      }
    } else {
      // 不含任何 key=value 结构且非空非 '-' 时，兜底保留显示原文
      pushUniqueRow(containerKey, rawText, false);
    }
  }

  // 4. 告警元信息固定顺序
  for (const key of META_KEYS) {
    if (Object.prototype.hasOwnProperty.call(annotations, key)) {
      pushUniqueRow(key, annotations[key], false);
    }
  }

  // 5. 未知自定义顶层扩展属性（若有）按原序保留
  for (const key of Object.keys(annotations)) {
    if (KNOWN_TRAP_TOP_KEYS.has(key)) continue;
    pushUniqueRow(key, annotations[key], true);
  }

  // 6. 底部 `可能原因`、`修复建议` 与非拼凑版 `描述`
  for (const key of TAIL_CAUSE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(annotations, key)) {
      pushUniqueRow(key, annotations[key], false);
    }
  }

  if (Object.prototype.hasOwnProperty.call(annotations, '描述')) {
    const descVal = String(annotations['描述'] ?? '').trim();
    if (!isEmptyOrDash(descVal) && !isRedundantTrapDescription(descVal)) {
      pushUniqueRow('描述', descVal, false);
    }
  }

  return rows;
}
