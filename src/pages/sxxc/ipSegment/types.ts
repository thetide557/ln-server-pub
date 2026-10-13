/**
 * IP地址段管理模块类型定义（陕数工业云-系统配置）
 * 对应墨刀原型：陕数工业云 系统配置 → IP地址段管理
 * 后端接口就绪后，将 mock.ts 中的 Promise 实现替换为真实 request 调用，类型保持不变
 */

/** 分组 */
export interface IpGroup {
  id: number;
  name: string;
  /** 负责人 */
  owner: string;
  /** 父分组 id；一级分组不填。分组最多嵌套 3 层 */
  parentId?: number;
}

/** 分组最大层级 */
export const MAX_GROUP_LEVEL = 3;

/** 地址段状态：1-在用 2-预留 3-停用 */
export enum SegmentStatus {
  InUse = 1,
  Reserved = 2,
  Disabled = 3,
}

export const segmentStatusMap: Record<number, { text: string; color: string }> = {
  [SegmentStatus.InUse]: { text: '在用', color: 'green' },
  [SegmentStatus.Reserved]: { text: '预留', color: 'orange' },
  [SegmentStatus.Disabled]: { text: '停用', color: 'default' },
};

/** 地址段 */
export interface IpSegment {
  id: number;
  /** 网络地址，如 10.20.3.0 */
  segment: string;
  /** 掩码位数 */
  mask: number;
  /** 展示用完整地址段：10.20.3.0/24 */
  fullSegment: string;
  groupId: number;
  groupName: string;
  status: SegmentStatus;
  vlan?: string;
  /** 负责人 */
  owner: string;
  /** 操作人 */
  operator: string;
  updateTime: string;
  /** IP使用情况（已使用/未使用） */
  usedCount: number;
  unusedCount: number;
  /** IP分配情况（已分配/预留/未分配） */
  allocatedCount: number;
  reservedIpCount: number;
  unallocatedCount: number;
  /** 资产在线情况（在线/离线） */
  onlineCount: number;
  offlineCount: number;
  /** IP使用率（%） */
  usageRate: number;
  /** 可回收数量 */
  recyclableCount: number;
  note?: string;
  /** 停用原因（仅状态为停用时有值） */
  disableReason?: string;
}

/** 分组/地址段维度统计 */
export interface SegmentStats {
  /** IP总数 */
  total: number;
  /** IP使用率（%） */
  usageRate: number;
  /** 已分配 */
  allocated: number;
  /** 预留 */
  reserved: number;
  /** 剩余IP数 */
  remaining: number;
  /** 地址段数量 */
  segmentCount: number;
}

/** IP分配状态：0-未分配 1-已分配 2-预留 */
export enum IpAllocStatus {
  Unallocated = 0,
  Allocated = 1,
  Reserved = 2,
}

export const ipAllocStatusMap: Record<number, { text: string; color: string }> = {
  [IpAllocStatus.Unallocated]: { text: '未分配', color: 'default' },
  [IpAllocStatus.Allocated]: { text: '已分配', color: 'green' },
  [IpAllocStatus.Reserved]: { text: '预留', color: 'orange' },
};

/** IP使用状态：0-未使用 1-已使用 */
export enum IpUseStatus {
  Unused = 0,
  Used = 1,
}

export const ipUseStatusMap: Record<number, { text: string; color: string }> = {
  [IpUseStatus.Unused]: { text: '未使用', color: 'default' },
  [IpUseStatus.Used]: { text: '已使用', color: 'green' },
};

/** 资产在线状态：-1-无资产 0-离线 1-在线 */
export enum IpOnlineStatus {
  None = -1,
  Offline = 0,
  Online = 1,
}

export const ipOnlineStatusMap: Record<number, { text: string; color: string }> = {
  [IpOnlineStatus.None]: { text: '-', color: 'default' },
  [IpOnlineStatus.Offline]: { text: '离线', color: 'default' },
  [IpOnlineStatus.Online]: { text: '在线', color: 'green' },
};

/** 单个IP */
export interface IpItem {
  id: number;
  ip: string;
  allocStatus: IpAllocStatus;
  useStatus: IpUseStatus;
  onlineStatus: IpOnlineStatus;
  segmentId: number;
  segment: string;
  groupId: number;
  groupName: string;
  /** 责任人 */
  owner?: string;
  assetName?: string;
  mac?: string;
  /** 接入端口 */
  port?: string;
  /** 是否临时IP */
  isTempIp: -1 | 0 | 1;
  /** 是否网关 */
  isGateway: -1 | 0 | 1;
  lastOnlineTime?: string;
  /** 闲置天数 */
  idleDays?: number;
  note?: string;
  /** 使用/预留时长数值 */
  duration?: number;
  /** 使用/预留时长单位（天/周/月/年） */
  durationUnit?: string;
}

/** 地址段内IP统计 */
export interface IpStats {
  allocated: number;
  reserved: number;
  online: number;
  usageRate: number;
  total: number;
}

/** 回收规则触发条件（取值与后端接口一致） */
export enum RuleTriggerType {
  /** 长期未上线（最后在线时间超阈值） */
  LongOffline = 'long_offline',
  /** 分配后未投入使用 */
  AssignedUnused = 'unused_after_alloc',
  /** 资产已下架/报废但IP仍占用 */
  AssetOffline = 'asset_offshelf',
  /** 预留超期未使用 */
  ReservedExpired = 'reserve_expired',
}

export const ruleTriggerMap: Record<RuleTriggerType, { text: string; thresholdLabel: string | null; tip: string }> = {
  [RuleTriggerType.LongOffline]: {
    text: '长期未上线（最后在线时间超阈值）',
    thresholdLabel: '闲置阈值',
    tip: '最后在线距今超过该天数即命中',
  },
  [RuleTriggerType.AssignedUnused]: {
    text: '分配后未投入使用',
    thresholdLabel: '闲置阈值',
    tip: '分配起始至今无流量超过该天数即命中',
  },
  [RuleTriggerType.AssetOffline]: {
    text: '资产已下架/报废但IP仍占用',
    thresholdLabel: null,
    tip: '本条件依据资产状态判定，无需阈值',
  },
  [RuleTriggerType.ReservedExpired]: {
    text: '预留超期未使用',
    thresholdLabel: '闲置阈值',
    tip: '预留起始至今超过该天数即命中',
  },
};

/** 回收动作：mark-标记可回收 auto-自动回收 */
export enum RuleAction {
  Mark = 'mark',
  Auto = 'auto',
}

export const ruleActionMap: Record<RuleAction, { text: string; tip: string }> = {
  [RuleAction.Mark]: { text: '标记可回收', tip: '命中后仅标记，需手动回收' },
  [RuleAction.Auto]: { text: '自动回收', tip: '命中即系统自动回收' },
};

/** 执行频率：daily-每天 weekly-每周 monthly-每月 yearly-每年（每年 freqValue 存「M月D日」，如 3月1日） */
export enum RuleFreqType {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export const ruleFreqMap: Record<RuleFreqType, { text: string; valueLabel: string }> = {
  [RuleFreqType.Daily]: { text: '每天', valueLabel: '' },
  [RuleFreqType.Weekly]: { text: '每周', valueLabel: '星期' },
  [RuleFreqType.Monthly]: { text: '每月', valueLabel: '日期' },
  [RuleFreqType.Yearly]: { text: '每年', valueLabel: '月/日' },
};

/** 回收规则 */
export interface RecycleRule {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  /** 适用范围：all-当前分组全部地址段 custom-指定地址段 */
  scopeType: 'all' | 'custom';
  /** 指定地址段（段 ID 列表） */
  customSegments: number[];
  triggerType: RuleTriggerType;
  /** 阈值天数（资产已下架时为空） */
  thresholdDays?: number;
  action: RuleAction;
  freqType: RuleFreqType;
  /** 日期/星期值 */
  freqValue: string;
  /** 执行时间 HH:mm:ss */
  execTime: string;
  /** 累计命中次数 */
  hitCount: number;
  /** 最近执行时间 */
  lastExecTime: string;
  enabled: boolean;
  /** 回收白名单（不参与回收的地址段 ID / IP，混合存储） */
  whitelist: Array<number | string>;
  updater: string;
  updateTime: string;
}

/** 变更记录动作（与后端 change-logs action 对齐） */
export enum ChangeLogAction {
  Allocate = 'allocate',
  Reserve = 'reserve',
  Recycle = 'recycle',
  Release = 'release',
  Update = 'update',
  Delete = 'delete',
  Scan = 'scan',
  Import = 'import',
}

export const changeLogActionMap: Record<string, string> = {
  [ChangeLogAction.Allocate]: '分配',
  [ChangeLogAction.Reserve]: '预留',
  [ChangeLogAction.Recycle]: '回收',
  [ChangeLogAction.Release]: '释放',
  [ChangeLogAction.Update]: '变更',
  [ChangeLogAction.Delete]: '删除',
  [ChangeLogAction.Scan]: '扫描',
  [ChangeLogAction.Import]: '导入',
};

/** 变更记录条目 */
export interface ChangeLogItem {
  id: number;
  subnetId: number;
  ip: string;
  action: string;
  /** 变更前 JSON 文本 */
  beforeData: string;
  /** 变更后 JSON 文本 */
  afterData: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}
