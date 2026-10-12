/**
 * IP地址段管理 mock 数据与 service
 * 说明：后端接口未就绪，当前用内存 mock 数据模拟接口行为（含 300ms 延迟）。
 * 接口就绪后，将本文件中的函数替换为 request 实现（路径待定，如 /api/takin/ip-segment/*），
 * 页面与组件代码无需调整。
 */
import _ from 'lodash';
import {
  IpGroup,
  IpItem,
  IpSegment,
  IpStats,
  MAX_GROUP_LEVEL,
  RecycleRule,
  RuleAction,
  RuleFreqType,
  RuleTriggerType,
  SegmentStatus,
  SegmentStats,
  IpAllocStatus,
  IpOnlineStatus,
  IpUseStatus,
} from './types';

/** 模拟网络延迟 */
function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

/** 掩码对应可用主机数（≤30 掩去网络/广播地址） */
export function hostCount(mask: number): number {
  const total = Math.pow(2, 32 - mask);
  return mask >= 31 ? total : total - 2;
}

/** 使用率计算（封顶100%） */
function calcUsageRate(allocated: number, reserved: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, _.round(((allocated + reserved) / total) * 100));
}

function now() {
  return '2026-09-24 08:02';
}

/** 计算分组层级（一级=1，最多 MAX_GROUP_LEVEL 层） */
export function getGroupLevel(groupId: number, allGroups: IpGroup[] = groups): number {
  let level = 1;
  let cur = _.find(allGroups, { id: groupId });
  while (cur?.parentId) {
    level += 1;
    cur = _.find(allGroups, { id: cur.parentId });
  }
  return level;
}

/** 收集分组及其全部子孙分组 id */
export function collectGroupIds(groupId: number, allGroups: IpGroup[] = groups): number[] {
  const result = [groupId];
  const children = _.filter(allGroups, { parentId: groupId });
  _.forEach(children, (child) => {
    result.push(...collectGroupIds(child.id, allGroups));
  });
  return result;
}

// ==================== mock 原始数据 ====================

/** 三层嵌套分组：一级分组 → 二级子分组 → 三级子分组 */
const groups: IpGroup[] = [
  { id: 1, name: '办公网', owner: '韩梅梅' },
  { id: 11, name: '会议室网络', owner: '韩梅梅', parentId: 1 },
  { id: 111, name: '临时办公区', owner: '李雷', parentId: 11 },
  { id: 12, name: '网络设备区', owner: '李雷', parentId: 1 },
  { id: 2, name: '生产网', owner: '李雷' },
  { id: 21, name: '核心业务区', owner: '韩梅梅', parentId: 2 },
  { id: 3, name: '测试网', owner: '韩梅梅' },
];

function mkSegment(partial: Partial<IpSegment> & { id: number; segment: string; mask: number; groupId: number }): IpSegment {
  const groupName = _.find(groups, { id: partial.groupId })?.name || '';
  return {
    vlan: '',
    note: '',
    usedCount: 20,
    unusedCount: 234,
    allocatedCount: 20,
    reservedIpCount: 20,
    unallocatedCount: 214,
    onlineCount: 168,
    offlineCount: 26,
    usageRate: 16,
    recyclableCount: 20,
    operator: '韩梅梅',
    owner: '韩梅梅',
    updateTime: now(),
    ...partial,
    groupName,
    fullSegment: `${partial.segment}/${partial.mask}`,
  } as IpSegment;
}

const segments: IpSegment[] = [
  mkSegment({
    id: 101,
    segment: '10.20.3.0',
    mask: 24,
    groupId: 1,
    status: SegmentStatus.InUse,
    vlan: '100',
    usedCount: 20,
    unusedCount: 234,
    allocatedCount: 20,
    reservedIpCount: 20,
    unallocatedCount: 214,
    onlineCount: 168,
    offlineCount: 26,
    usageRate: 16,
    recyclableCount: 20,
    note: '办公网主地址段',
  }),
  mkSegment({
    id: 102,
    segment: '10.20.4.0',
    mask: 24,
    groupId: 11,
    status: SegmentStatus.Reserved,
    vlan: '101',
    owner: '李雷',
    operator: '李雷',
    usedCount: 0,
    unusedCount: 254,
    allocatedCount: 0,
    reservedIpCount: 20,
    unallocatedCount: 234,
    onlineCount: 0,
    offlineCount: 0,
    usageRate: 8,
    recyclableCount: 0,
    note: '预留扩容地址段',
  }),
  mkSegment({
    id: 103,
    segment: '10.20.9.0',
    mask: 25,
    groupId: 111,
    status: SegmentStatus.Disabled,
    vlan: '102',
    usedCount: 0,
    unusedCount: 0,
    allocatedCount: 0,
    reservedIpCount: 0,
    unallocatedCount: 0,
    onlineCount: 0,
    offlineCount: 0,
    usageRate: 0,
    recyclableCount: 0,
  }),
  mkSegment({ id: 104, segment: '10.30.4.0', mask: 24, groupId: 2, status: SegmentStatus.InUse, vlan: '200' }),
  mkSegment({ id: 105, segment: '10.30.8.0', mask: 26, groupId: 21, status: SegmentStatus.InUse, vlan: '201' }),
  mkSegment({ id: 106, segment: '10.40.10.0', mask: 24, groupId: 3, status: SegmentStatus.InUse, vlan: '300' }),
  mkSegment({ id: 107, segment: '10.10.110.0', mask: 24, groupId: 3, status: SegmentStatus.InUse, vlan: '301' }),
  mkSegment({ id: 108, segment: '10.10.120.0', mask: 24, groupId: 12, status: SegmentStatus.InUse, vlan: '103' }),
  mkSegment({ id: 109, segment: '192.168.50.0', mask: 24, groupId: 12, status: SegmentStatus.Reserved, vlan: '302' }),
];

function mkIp(partial: Partial<IpItem> & { id: number; ip: string; segmentId: number }): IpItem {
  const seg = _.find(segments, { id: partial.segmentId });
  return {
    allocStatus: IpAllocStatus.Allocated,
    useStatus: IpUseStatus.Used,
    onlineStatus: IpOnlineStatus.Online,
    owner: '李磊',
    assetName: '这是一个名称',
    mac: '这是一个MAC地址',
    port: '-',
    isTempIp: 0,
    isGateway: 0,
    lastOnlineTime: now(),
    idleDays: 0,
    note: '这是备注',
    ...partial,
    segment: seg?.fullSegment || '',
    groupId: seg?.groupId || 0,
    groupName: seg?.groupName || '',
  } as IpItem;
}

const ips: IpItem[] = [
  // 10.20.3.0/24
  mkIp({ id: 1001, ip: '10.20.3.1', segmentId: 101, isTempIp: 1, isGateway: 1, onlineStatus: IpOnlineStatus.Online, useStatus: IpUseStatus.Used }),
  mkIp({ id: 1002, ip: '10.20.4.2', segmentId: 101, allocStatus: IpAllocStatus.Reserved, useStatus: IpUseStatus.Unused, onlineStatus: IpOnlineStatus.None, assetName: undefined, mac: undefined, lastOnlineTime: undefined, idleDays: 7, isTempIp: -1, isGateway: -1 }),
  mkIp({ id: 1003, ip: '10.20.9.3', segmentId: 101, useStatus: IpUseStatus.Unused, onlineStatus: IpOnlineStatus.None, lastOnlineTime: undefined, idleDays: 7, isTempIp: 0, isGateway: 0 }),
  mkIp({ id: 1004, ip: '10.30.4.4', segmentId: 101, onlineStatus: IpOnlineStatus.Offline, useStatus: IpUseStatus.Used }),
  mkIp({ id: 1005, ip: '10.20.3.5', segmentId: 101, onlineStatus: IpOnlineStatus.Offline, useStatus: IpUseStatus.Used, idleDays: 30 }),
  mkIp({ id: 1006, ip: '10.20.3.6', segmentId: 101, onlineStatus: IpOnlineStatus.Offline, useStatus: IpUseStatus.Used, idleDays: 45 }),
  // 10.30.4.0/24
  mkIp({ id: 2001, ip: '10.30.4.1', segmentId: 104 }),
  mkIp({ id: 2002, ip: '10.30.4.2', segmentId: 104, onlineStatus: IpOnlineStatus.Offline, idleDays: 60 }),
  mkIp({ id: 2003, ip: '10.30.4.3', segmentId: 104, useStatus: IpUseStatus.Unused }),
  // 10.40.10.0/24
  mkIp({ id: 3001, ip: '10.40.10.1', segmentId: 106 }),
  mkIp({ id: 3002, ip: '10.40.10.9', segmentId: 106, onlineStatus: IpOnlineStatus.Offline, idleDays: 15 }),
  // 10.10.110.0/24
  mkIp({ id: 4001, ip: '10.10.110.1', segmentId: 107 }),
  mkIp({ id: 4002, ip: '10.10.110.3', segmentId: 107, useStatus: IpUseStatus.Unused }),
  // 空IP（完全未分配）
  mkIp({ id: 5001, ip: '10.20.3.9', segmentId: 101, allocStatus: IpAllocStatus.Unallocated, useStatus: IpUseStatus.Unused, onlineStatus: IpOnlineStatus.None, assetName: undefined, mac: undefined, lastOnlineTime: undefined, idleDays: undefined, isTempIp: -1, isGateway: -1 }),
  mkIp({ id: 5002, ip: '10.30.4.9', segmentId: 104, allocStatus: IpAllocStatus.Unallocated, useStatus: IpUseStatus.Unused, onlineStatus: IpOnlineStatus.None, assetName: undefined, mac: undefined, lastOnlineTime: undefined, idleDays: undefined, isTempIp: -1, isGateway: -1 }),
  // 未分配但已使用（扫描发现资产在用，分配时应自动带出资产信息；操作：查看/分配/回收）
  mkIp({
    id: 5003,
    ip: '10.30.8.5',
    segmentId: 105,
    allocStatus: IpAllocStatus.Unallocated,
    useStatus: IpUseStatus.Used,
    onlineStatus: IpOnlineStatus.Online,
    assetName: '会议室打印机',
    mac: 'A8:5E:45:1B:2C:3D',
    isTempIp: -1,
    isGateway: -1,
    idleDays: 0,
  }),
  // 同状态演示行（办公网段，资产离线）：与原型「IP地址段管理-IP」第5行一致
  mkIp({
    id: 5004,
    ip: '10.20.3.7',
    segmentId: 101,
    allocStatus: IpAllocStatus.Unallocated,
    useStatus: IpUseStatus.Used,
    onlineStatus: IpOnlineStatus.Offline,
    assetName: '访客无线AP',
    mac: 'B4:2A:1E:9F:03:8C',
    isTempIp: -1,
    isGateway: -1,
    idleDays: 0,
  }),
];

function mkRule(partial: Partial<RecycleRule> & { id: number; name: string; groupId: number }): RecycleRule {
  return {
    scopeType: 'all',
    customSegments: [],
    triggerType: RuleTriggerType.LongOffline,
    thresholdDays: 30,
    action: RuleAction.Mark,
    freqType: RuleFreqType.Daily,
    freqValue: '',
    execTime: '02:00:00',
    hitCount: 66,
    lastExecTime: now(),
    enabled: true,
    whitelist: [],
    updater: '韩梅梅',
    updateTime: now(),
    ...partial,
    groupName: _.find(groups, { id: partial.groupId })?.name || '',
  } as RecycleRule;
}

const rules: RecycleRule[] = [
  mkRule({ id: 1, name: '长期未上线自动标记', groupId: 1 }),
  mkRule({
    id: 2,
    name: '指定地址段分配未使用回收',
    groupId: 1,
    scopeType: 'custom',
    customSegments: ['10.20.3.0/24'],
    triggerType: RuleTriggerType.AssignedUnused,
    action: RuleAction.Auto,
    freqType: RuleFreqType.Weekly,
    freqValue: '一',
    enabled: false,
  }),
  mkRule({ id: 3, name: '已下架资产IP释放', groupId: 2, triggerType: RuleTriggerType.AssetOffline, thresholdDays: undefined, freqType: RuleFreqType.Monthly, freqValue: '1' }),
  mkRule({
    id: 4,
    name: '预留超期未使用回收',
    groupId: 3,
    triggerType: RuleTriggerType.ReservedExpired,
    thresholdDays: 90,
    action: RuleAction.Auto,
    freqType: RuleFreqType.Yearly,
    freqValue: '3月1日',
  }),
];

let seq = {
  group: 100,
  segment: 200,
  ip: 10000,
  rule: 100,
};

// ==================== 分组 ====================

export function getGroups(): Promise<IpGroup[]> {
  return delay(_.cloneDeep(groups));
}

export interface AddGroupParams {
  name: string;
  owner?: string;
  /** 父分组 id；一级分组不传 */
  parentId?: number;
}

export function addGroup(data: AddGroupParams): Promise<{ success: boolean; message?: string }> {
  // 层级校验：父分组已是第3层时不可再建子分组
  if (data.parentId && getGroupLevel(data.parentId) >= MAX_GROUP_LEVEL) {
    return delay({ success: false, message: `分组最多${MAX_GROUP_LEVEL}层` }, 200);
  }
  if (data.parentId && !_.find(groups, { id: data.parentId })) {
    return delay({ success: false, message: '父分组不存在' }, 200);
  }
  groups.push({ id: ++seq.group, name: data.name, owner: data.owner || '韩梅梅', parentId: data.parentId });
  return delay({ success: true });
}

export function editGroup(id: number, data: { name: string }): Promise<{ success: boolean }> {
  const group = _.find(groups, { id });
  if (group) group.name = data.name;
  _.forEach(segments, (seg) => {
    if (seg.groupId === id) seg.groupName = data.name;
  });
  return delay({ success: true });
}

export function deleteGroup(id: number): Promise<{ success: boolean; message?: string }> {
  // 存在子分组或地址段时不可删除，需先清理子项
  if (_.some(groups, { parentId: id })) {
    return delay({ success: false, message: '该分组下存在子分组，请先删除子分组' }, 200);
  }
  if (_.some(segments, { groupId: id })) {
    return delay({ success: false, message: '该分组下存在地址段，请先删除地址段' }, 200);
  }
  _.remove(groups, { id });
  return delay({ success: true });
}

// ==================== 地址段 ====================

export interface SegmentQueryParams {
  groupId?: number;
  /** 地址段关键词 */
  keyword?: string;
  segmentId?: number;
}

export function getSegments(params?: SegmentQueryParams): Promise<{ list: IpSegment[]; total: number }> {
  let list = segments;
  if (params?.segmentId) {
    list = _.filter(list, { id: params.segmentId });
  } else if (params?.groupId) {
    // 聚合该分组及其全部子孙分组下的地址段
    const groupIds = collectGroupIds(params.groupId);
    list = _.filter(list, (item) => groupIds.includes(item.groupId));
  }
  if (params?.keyword) {
    list = _.filter(list, (item) => item.fullSegment.indexOf(params.keyword!) > -1);
  }
  return delay({ list: _.cloneDeep(list), total: list.length });
}

export function getSegmentStats(params?: SegmentQueryParams): Promise<SegmentStats> {
  let list = segments;
  if (params?.segmentId) {
    list = _.filter(list, { id: params.segmentId });
  } else if (params?.groupId) {
    const groupIds = collectGroupIds(params.groupId);
    list = _.filter(list, (item) => groupIds.includes(item.groupId));
  }
  const total = _.sumBy(list, (item) => hostCount(item.mask));
  const reserved = _.sumBy(list, 'reservedIpCount');
  const allocated = _.sumBy(list, 'allocatedCount');
  const remaining = total - allocated - reserved;
  const stats: SegmentStats = {
    total,
    usageRate: calcUsageRate(allocated, reserved, total),
    allocated,
    reserved,
    remaining: remaining > 0 ? remaining : 0,
    segmentCount: list.length,
  };
  return delay(stats);
}

export function addSegment(data: Partial<IpSegment> & { groupId: number; segment: string; mask: number }): Promise<{ success: boolean; message?: string }> {
  const fullSegment = `${data.segment}/${data.mask}`;
  if (_.some(segments, { fullSegment })) {
    return delay({ success: false, message: '地址段已存在，请勿重复添加' }, 200);
  }
  const groupName = _.find(groups, { id: data.groupId })?.name || '';
  segments.push({
    id: ++seq.segment,
    segment: data.segment,
    mask: data.mask,
    fullSegment,
    groupId: data.groupId,
    groupName,
    status: data.status || SegmentStatus.InUse,
    vlan: data.vlan,
    owner: data.owner || '',
    operator: '韩梅梅',
    updateTime: now(),
    usedCount: 0,
    unusedCount: 0,
    allocatedCount: 0,
    reservedIpCount: 0,
    unallocatedCount: hostCount(data.mask),
    onlineCount: 0,
    offlineCount: 0,
    usageRate: 0,
    recyclableCount: 0,
    note: data.note,
  });
  return delay({ success: true });
}

export function editSegment(
  id: number,
  data: Partial<IpSegment>,
): Promise<{ success: boolean; message?: string }> {
  const seg = _.find(segments, { id });
  if (!seg) return delay({ success: false, message: '地址段不存在' }, 200);
  if (data.segment && data.mask) {
    const fullSegment = `${data.segment}/${data.mask}`;
    if (_.some(segments, (item) => item.fullSegment === fullSegment && item.id !== id)) {
      return delay({ success: false, message: '地址段已存在，请勿重复添加' }, 200);
    }
    seg.segment = data.segment;
    seg.mask = data.mask;
    seg.fullSegment = fullSegment;
  }
  if (data.status !== undefined) seg.status = data.status;
  seg.vlan = data.vlan;
  if (data.owner !== undefined) seg.owner = data.owner;
  seg.note = data.note;
  seg.operator = '韩梅梅';
  seg.updateTime = now();
  return delay({ success: true });
}

export function deleteSegment(id: number): Promise<{ success: boolean }> {
  _.remove(segments, { id });
  _.remove(ips, { segmentId: id });
  return delay({ success: true });
}

export function enableSegment(id: number): Promise<{ success: boolean }> {
  const seg = _.find(segments, { id });
  if (seg) {
    seg.status = SegmentStatus.InUse;
    seg.updateTime = now();
  }
  return delay({ success: true });
}

/** 扫描可回收IP：返回命中的IP数量，并将命中IP加入可回收列表（mock：标记 idleDays） */
export function scanRecyclable(segmentId: number): Promise<{ hitCount: number }> {
  const hit = _.filter(ips, (item) => item.segmentId === segmentId && (item.idleDays || 0) > 0);
  return delay({ hitCount: hit.length || 9 }, 1000);
}

/** 批量扫描选中的IP（mock：闲置天数>0 视为命中，已加入可回收列表） */
export function batchScanIps(ids: number[]): Promise<{ hitCount: number }> {
  const hit = _.filter(ips, (item) => _.includes(ids, item.id) && (item.idleDays || 0) > 0);
  return delay({ hitCount: hit.length }, 1000);
}

// ==================== IP ====================

export interface IpQueryParams {
  segmentId?: number;
  /** 分配状态 */
  allocStatus?: number;
  /** IP关键词 */
  keyword?: string;
}

export function getIpList(params?: IpQueryParams): Promise<{ list: IpItem[]; total: number }> {
  let list = ips;
  if (params?.segmentId) list = _.filter(list, { segmentId: params.segmentId });
  if (params?.allocStatus !== undefined && params.allocStatus !== null) {
    list = _.filter(list, { allocStatus: params.allocStatus });
  }
  if (params?.keyword) {
    list = _.filter(list, (item) => item.ip.indexOf(params.keyword!) > -1);
  }
  return delay({ list: _.cloneDeep(list), total: list.length });
}

export function getIpStats(segmentId?: number): Promise<IpStats> {
  let list = ips;
  if (segmentId) list = _.filter(list, { segmentId });
  const segs = segmentId ? _.filter(segments, { id: segmentId }) : segments;
  const total = _.sumBy(segs, (item) => hostCount(item.mask));
  const allocated = _.sumBy(list, (item) => (item.allocStatus === IpAllocStatus.Allocated ? 1 : 0));
  const reserved = _.sumBy(list, (item) => (item.allocStatus === IpAllocStatus.Reserved ? 1 : 0));
  const online = _.sumBy(list, (item) => (item.onlineStatus === IpOnlineStatus.Online ? 1 : 0));
  const stats: IpStats = {
    total: total || 256,
    allocated,
    reserved,
    online,
    usageRate: calcUsageRate(allocated, reserved, total || 256),
  };
  return delay(stats);
}

/** 获取某地址段可回收清单（闲置天数>0 的IP，mock 规则） */
export function getRecyclableIps(segmentId: number): Promise<IpItem[]> {
  const list = _.filter(ips, (item) => item.segmentId === segmentId && (item.idleDays || 0) > 0);
  return delay(_.cloneDeep(list));
}

/** 同步获取回收白名单可选项：全部地址段 + 全部已有 IP（供规则表单下拉多选） */
export function getWhitelistOptions(): { type: 'segment' | 'ip'; value: string }[] {
  const segmentOptions = _.map(segments, (item) => ({ type: 'segment' as const, value: item.fullSegment }));
  const ipOptions = _.map(ips, (item: IpItem) => ({ type: 'ip' as const, value: item.ip }));
  return [...segmentOptions, ...ipOptions];
}

export function recycleIps(ids: number[]): Promise<{ success: boolean }> {
  _.forEach(ids, (id) => {
    const item = _.find(ips, { id });
    if (item) {
      item.allocStatus = IpAllocStatus.Unallocated;
      item.useStatus = IpUseStatus.Unused;
      item.onlineStatus = IpOnlineStatus.None;
      item.assetName = undefined;
      item.mac = undefined;
      item.isTempIp = -1;
      item.isGateway = -1;
      item.lastOnlineTime = undefined;
      item.idleDays = undefined;
    }
  });
  return delay({ success: true });
}

/** IP 单个回收 */
export function recycleOneIp(id: number, reason: string): Promise<{ success: boolean }> {
  const item = _.find(ips, { id });
  if (item) {
    item.allocStatus = IpAllocStatus.Unallocated;
    item.useStatus = IpUseStatus.Unused;
    item.onlineStatus = IpOnlineStatus.None;
    item.assetName = undefined;
    item.mac = undefined;
    item.isTempIp = -1;
    item.isGateway = -1;
    item.lastOnlineTime = undefined;
    item.idleDays = undefined;
    item.note = reason ? `回收原因：${reason}` : item.note;
  }
  return delay({ success: true });
}

export function reserveIp(
  id: number,
  data: { owner?: string; note?: string; gateway?: boolean; tempIp?: boolean; duration?: number; durationUnit?: string; reason?: string },
): Promise<{ success: boolean }> {
  const item = _.find(ips, { id });
  if (item) {
    item.allocStatus = IpAllocStatus.Reserved;
    item.owner = data.owner || item.owner;
    item.isGateway = data.gateway ? 1 : 0;
    item.isTempIp = data.tempIp ? 1 : 0;
    item.duration = data.duration;
    item.durationUnit = data.durationUnit;
    item.note = data.reason || data.note || item.note;
  }
  return delay({ success: true });
}

export function releaseIp(id: number): Promise<{ success: boolean }> {
  const item = _.find(ips, { id });
  if (item) {
    item.allocStatus = IpAllocStatus.Unallocated;
    item.assetName = undefined;
    item.mac = undefined;
  }
  return delay({ success: true });
}

export function assignIp(
  id: number,
  data: {
    assetName?: string;
    mac?: string;
    owner?: string;
    port?: string;
    gateway?: boolean;
    tempIp?: boolean;
    duration?: number;
    durationUnit?: string;
    note?: string;
  },
): Promise<{ success: boolean }> {
  const item = _.find(ips, { id });
  if (item) {
    item.allocStatus = IpAllocStatus.Allocated;
    item.useStatus = IpUseStatus.Unused;
    item.assetName = data.assetName;
    item.mac = data.mac;
    item.owner = data.owner || item.owner;
    item.port = data.port;
    item.isGateway = data.gateway ? 1 : 0;
    item.isTempIp = data.tempIp ? 1 : 0;
    item.duration = data.duration;
    item.durationUnit = data.durationUnit;
    item.note = data.note || item.note;
  }
  return delay({ success: true });
}

export function changeIp(id: number, data: { assetName?: string; mac?: string; note?: string }): Promise<{ success: boolean }> {
  const item = _.find(ips, { id });
  if (item) {
    item.assetName = data.assetName;
    item.mac = data.mac;
    item.note = data.note || item.note;
  }
  return delay({ success: true });
}

export function deleteIp(id: number): Promise<{ success: boolean }> {
  _.remove(ips, { id });
  return delay({ success: true });
}

// ==================== 回收规则 ====================

export interface RuleQueryParams {
  groupId?: number;
  /** 按地址段查询适用它的规则（分组全部段或指定段包含该地址段） */
  segment?: string;
  name?: string;
  /** 更新时间起 yyyy-MM-dd */
  startTime?: string;
  /** 更新时间止 yyyy-MM-dd */
  endTime?: string;
}

export function getRecycleRules(params?: RuleQueryParams): Promise<{ list: RecycleRule[]; total: number }> {
  let list = rules;
  if (params?.groupId) list = _.filter(list, { groupId: params.groupId });
  if (params?.segment) {
    const seg = _.find(segments, (item) => item.fullSegment === params.segment);
    const segGroupIds = seg ? collectGroupIds(seg.groupId) : [];
    // 适用范围命中该地址段：本组（含子孙组）的全部段规则，或指定段包含该段
    list = _.filter(
      list,
      (item) =>
        (item.scopeType === 'all' && segGroupIds.includes(item.groupId)) ||
        (item.customSegments || []).includes(params.segment!),
    );
  }
  if (params?.name) list = _.filter(list, (item) => item.name.indexOf(params.name!) > -1);
  if (params?.startTime) list = _.filter(list, (item) => item.updateTime >= params.startTime!);
  if (params?.endTime) list = _.filter(list, (item) => item.updateTime <= params.endTime! + ' 23:59:59');
  return delay({ list: _.cloneDeep(list), total: list.length });
}

export function addRecycleRule(data: Partial<RecycleRule> & { name: string; groupId: number }): Promise<{ success: boolean; message?: string }> {
  if (_.some(rules, { name: data.name })) {
    return delay({ success: false, message: '规则名称已存在' }, 200);
  }
  rules.push({
    id: ++seq.rule,
    name: data.name,
    groupId: data.groupId,
    groupName: _.find(groups, { id: data.groupId })?.name || '',
    scopeType: data.scopeType || 'all',
    customSegments: data.customSegments || [],
    triggerType: data.triggerType || RuleTriggerType.LongOffline,
    thresholdDays: data.thresholdDays,
    action: data.action || RuleAction.Mark,
    freqType: data.freqType || RuleFreqType.Daily,
    freqValue: data.freqValue || '',
    execTime: data.execTime || '02:00:00',
    hitCount: 0,
    lastExecTime: '-',
    enabled: data.enabled !== false,
    whitelist: data.whitelist || [],
    updater: '韩梅梅',
    updateTime: now(),
  });
  return delay({ success: true });
}

export function editRecycleRule(id: number, data: Partial<RecycleRule>): Promise<{ success: boolean; message?: string }> {
  const rule = _.find(rules, { id });
  if (!rule) return delay({ success: false, message: '规则不存在' }, 200);
  Object.assign(rule, _.omit(data, 'id'), { updater: '韩梅梅', updateTime: now() });
  return delay({ success: true });
}

export function deleteRecycleRule(id: number): Promise<{ success: boolean }> {
  _.remove(rules, { id });
  return delay({ success: true });
}

export function toggleRecycleRule(id: number, enabled: boolean): Promise<{ success: boolean }> {
  const rule = _.find(rules, { id });
  if (rule) rule.enabled = enabled;
  return delay({ success: true });
}
