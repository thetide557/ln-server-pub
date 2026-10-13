/**
 * IP地址管理（IPAM）后端接口与页面适配层
 * 接口文档：《IP地址管理-分组-地址段相关接口》《IP地址管理-地址详情页》《IP回收相关接口》《IP地址管理-删除IP》
 *
 * 结构说明：
 * 1. 底层接口函数与文档路径 1:1 对应，返回统一响应壳 { dat, err, success }（request.ts 拦截器处理）
 * 2. 页面适配函数与模块内 mock.ts 同名（getGroups / getSegments / getIpList / getIpStats 及分组、地址段、IP 操作），
 *    内部完成 IpamXxxVO → 页面类型（@/pages/sxxc/ipSegment/types）的转换，页面与组件保持既有渲染逻辑
 * 3. 后端 IP 行操作按「ip 字符串 + subnet_id」定位（未落库的虚拟行 id=0），页面适配函数相应改传
 *    含 { ip, segmentId } 的对象；IP 列表 rowKey 请使用 'ip'
 * 4. 文档未覆盖的功能（批量扫描等）仍走模块内 mock.ts
 */
import _ from 'lodash';
import moment from 'moment';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import {
  ChangeLogAction,
  ChangeLogItem,
  IpAllocStatus,
  IpGroup,
  IpItem,
  IpSegment,
  IpStats,
  IpUseStatus,
  IpOnlineStatus,
  RecycleRule,
  RuleAction,
  RuleFreqType,
  RuleTriggerType,
  SegmentStats,
  SegmentStatus,
} from '@/pages/sxxc/ipSegment/types';

// ==================== 后端 VO 类型（接口文档） ====================

/** 组织树节点：group 分组 / subnet 地址段 */
export interface IpamTreeNode {
  key: string;
  id: number;
  node_type: 'group' | 'subnet';
  label: string;
  used?: number;
  total?: number;
  /** 仅 subnet */
  cidr?: string;
  status?: string;
  children?: IpamTreeNode[];
}

/** 分组对象 */
export interface IpamGroupVO {
  id: number;
  name: string;
  parent_id: number;
  owner?: string;
  sort?: number;
  remark?: string;
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by: string;
}

/** 分组详情与汇总 */
export interface IpamGroupDetailVO {
  group: IpamGroupVO;
  stats: {
    subnet_count: number;
    total_hosts: number;
    allocated: number;
    reserved: number;
    remaining: number;
    usage_rate: number;
  };
}

/** 地址段对象 */
export interface IpamSubnetVO {
  id: number;
  group_id: number;
  name: string;
  family: number;
  cidr: string;
  prefix_length: number;
  host_count: number;
  vlan?: string;
  owner?: string;
  status: 'in_use' | 'reserved' | 'disabled';
  disable_reason?: string;
  remark?: string;
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by: string;
  group_name?: string;
  used_count?: number;
  unused_count?: number;
  allocated_count?: number;
  reserved_count?: number;
  unallocated_count?: number;
  online_count?: number;
  offline_count?: number;
  usage_rate?: number;
  recyclable_count?: number;
}

/** IP 行对象（IpAddressVO） */
export interface IpamAddressVO {
  id: number;
  subnet_id: number;
  ip: string;
  allocation_status: 'unallocated' | 'allocated' | 'reserved';
  usage_status: 'used' | 'unused';
  online_status: 'online' | 'offline' | '';
  asset_name?: string;
  asset_id?: number;
  mac?: string;
  port?: string;
  is_temporary?: boolean;
  is_gateway?: boolean;
  last_online_at?: number;
  idle_days?: number;
  remark?: string;
  reserve_desc?: string;
  duration_value?: number;
  duration_unit?: string;
  expires_at?: number | null;
  group_name?: string;
  subnet_cidr?: string;
  owner?: string;
  updated_by?: string;
  updated_at?: number;
}

/** 段内 IP 列表响应 */
export interface IpamAddressesVO {
  group_name?: string;
  subnet?: IpamSubnetVO;
  list?: IpamAddressVO[];
  total?: number;
}

/** 回收规则对象 */
export interface IpamRecycleRuleVO {
  id: number;
  group_id: number;
  name: string;
  scope_type: 'all_group_subnets' | 'specified_subnets';
  scope_subnet_ids?: number[];
  trigger_type: 'long_offline' | 'unused_after_alloc' | 'asset_offshelf' | 'reserve_expired';
  idle_threshold_days?: number;
  action: 'mark' | 'auto';
  freq_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** 每年类型：月份 1-12；其余频率为 0/缺省 */
  freq_month?: number;
  freq_day?: number;
  freq_time?: string;
  enabled: boolean;
  hit_count: number;
  last_run_at?: number;
  remark?: string;
  created_at?: number;
  updated_at?: number;
  created_by?: string;
  updated_by?: string;
  group_name?: string;
  whitelist?: { subnet_ids?: number[]; ips?: string[] };
}

/** 规则列表响应（/ipam/recycle-rules 与 /ipam/subnets/{id}/recycle-rules 通用） */
export interface IpamRecycleRulesVO {
  list?: IpamRecycleRuleVO[];
  subnet?: IpamSubnetVO;
  total?: number;
}

/** 执行扫描结果 */
export interface IpamExecuteVO {
  hit_count: number;
  action: 'mark' | 'auto';
  recycled: number;
  candidates?: IpamAddressVO[];
  message: string;
}

/** 变更记录 VO */
export interface IpamChangeLogVO {
  id: number;
  subnet_id: number;
  family: number;
  ip: string;
  action: string;
  before_data: string;
  after_data: string;
  reason: string;
  created_at: number;
  created_by: string;
}

/** 批量操作结果（IP / 地址段通用；地址段回收时带各段 recycled） */
export interface IpamBatchResultVO {
  success: number;
  failed: number;
  results?: Array<{
    ip?: string;
    subnet_id?: number;
    ok: boolean;
    error?: string;
    recycled?: number;
  }>;
}


// ==================== 底层接口（与文档 1:1） ====================

/** 获取组织树（分组树，子节点含地址段） */
export const getIpamTree = () => request('/api/takin/ipam/tree', { method: RequestMethod.Get });

/** 新增子分组 */
export const createIpamGroup = (data: { name: string; parent_id: number; owner?: string; sort?: number; remark?: string }) =>
  request('/api/takin/ipam/groups', { method: RequestMethod.Post, data });

/** 编辑分组 */
export const updateIpamGroup = (data: { id: number; name: string; parent_id: number; owner?: string; sort?: number; remark?: string }) =>
  request('/api/takin/ipam/groups', { method: RequestMethod.Put, data });

/** 分组详情与汇总 */
export const getIpamGroup = (groupId: number) => request(`/api/takin/ipam/groups/${groupId}`, { method: RequestMethod.Get });

/** 删除分组（有子分组或地址段时后端拒绝） */
export const deleteIpamGroup = (groupId: number) => request(`/api/takin/ipam/groups/${groupId}`, { method: RequestMethod.Delete });

/** 新增地址段(cidr) */
export const createIpamSubnet = (data: {
  group_id: number;
  cidr: string;
  vlan?: string;
  owner?: string;
  status: string;
  disable_reason?: string;
  remark?: string;
}) => request('/api/takin/ipam/subnets', { method: RequestMethod.Post, data });

/** 地址段列表(按分组，服务端分页；group_id 非必传，不传默认查询全部) */
export const getIpamSubnets = (params: { group_id?: number; page: number | string; limit: number | string; query?: string; status?: string }) =>
  request('/api/takin/ipam/subnets', { method: RequestMethod.Get, params });

/** 启用/编辑地址段 */
export const updateIpamSubnet = (data: {
  id: number;
  group_id: number;
  cidr: string;
  vlan?: string;
  owner?: string;
  status: string;
  disable_reason?: string;
  remark?: string;
}) => request('/api/takin/ipam/subnets', { method: RequestMethod.Put, data });

/** 地址段详情 */
export const getIpamSubnet = (subnetId: number) => request(`/api/takin/ipam/subnets/${subnetId}`, { method: RequestMethod.Get });

/** 删除地址段（仅 disabled 可删） */
export const deleteIpamSubnet = (subnetId: number) => request(`/api/takin/ipam/subnets/${subnetId}`, { method: RequestMethod.Delete });

/** 段内IP列表(全量展开分页) */
export const getIpamAddresses = (
  subnetId: number,
  params: { page?: number | string; limit?: number | string; query?: string; allocation_status?: string },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses`, { method: RequestMethod.Get, params });

/** 单个IP详情 */
export const getIpamAddressDetail = (subnetId: number, ip: string) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/detail`, { method: RequestMethod.Get, params: { ip } });

/** 分配IP */
export const allocateIpamAddress = (
  subnetId: number,
  data: {
    ip: string;
    asset_name: string;
    mac: string;
    port?: string;
    is_gateway?: boolean;
    is_temporary?: boolean;
    duration_value: number;
    duration_unit?: string;
    remark?: string;
  },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses/allocate`, { method: RequestMethod.Post, data });

/** 变更已分配IP台账 */
export const updateIpamAddress = (
  subnetId: number,
  data: {
    ip: string;
    asset_name: string;
    mac: string;
    port?: string;
    is_gateway?: boolean;
    is_temporary?: boolean;
    duration_value?: number;
    duration_unit?: string;
    remark?: string;
  },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses`, { method: RequestMethod.Put, data });

/** 回收IP */
export const recycleIpamAddress = (subnetId: number, data: { ip: string; reason: string }) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/recycle`, { method: RequestMethod.Post, data });

/** 预留IP */
export const reserveIpamAddress = (
  subnetId: number,
  data: {
    ip: string;
    reserve_desc: string;
    duration_value: number;
    duration_unit?: string;
    is_gateway?: boolean;
    is_temporary?: boolean;
    remark?: string;
  },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses/reserve`, { method: RequestMethod.Post, data });

/** 释放预留 */
export const releaseIpamAddress = (subnetId: number, data: { ip: string }) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/release`, { method: RequestMethod.Post, data });

/** 删除IP（隐藏：写入排除表，仅未分配可删；成功时通常只有 err 无 dat） */
export const hideIpamAddress = (subnetId: number, ip: string) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/delete`, { method: RequestMethod.Post, data: { ip } });

/** 回收规则：规则列表（group_id 不传查全部；query 按名称模糊；begin/end Unix 秒） */
export const getIpamRecycleRules = (params: { group_id?: number; page?: number | string; limit?: number | string; query?: string; begin?: number; end?: number }) =>
  request('/api/takin/ipam/recycle-rules', { method: RequestMethod.Get, params });

/** 回收规则：新增规则 */
export const createIpamRecycleRule = (data: {
  group_id: number;
  name: string;
  scope_type: string;
  scope_subnet_ids: number[];
  trigger_type: string;
  idle_threshold_days: number;
  action: string;
  freq_type: string;
  /** 每年类型：月份 1-12；其余频率传 0 */
  freq_month: number;
  freq_day: number;
  freq_time: string;
  whitelist?: { subnet_ids: number[]; ips: string[] };
  enabled?: boolean;
  remark?: string;
}) => request('/api/takin/ipam/recycle-rules', { method: RequestMethod.Post, data });

/** 回收规则：修改规则（字段同新增，另带 id） */
export const updateIpamRecycleRule = (id: number, data: Omit<Parameters<typeof createIpamRecycleRule>[0], 'group_id'> & { group_id: number }) =>
  request('/api/takin/ipam/recycle-rules', { method: RequestMethod.Put, data: { id, ...data } });

/** 回收规则：预计覆盖（表单下方提示文案） */
export const previewIpamRecycleScope = (data: { group_id: number; scope_type: string; scope_subnet_ids?: number[] }) =>
  request('/api/takin/ipam/recycle-rules/preview-scope', { method: RequestMethod.Post, data });

/** 回收规则：规则详情 */
export const getIpamRecycleRule = (ruleId: number) => request(`/api/takin/ipam/recycle-rules/${ruleId}`, { method: RequestMethod.Get });

/** 回收规则：删除规则 */
export const deleteIpamRecycleRule = (ruleId: number) =>
  request(`/api/takin/ipam/recycle-rules/${ruleId}`, { method: RequestMethod.Delete });

/** 回收规则：启停规则 */
export const toggleIpamRecycleRule = (ruleId: number, enabled: boolean) =>
  request(`/api/takin/ipam/recycle-rules/${ruleId}/enabled`, { method: RequestMethod.Post, data: { enabled } });

/** 回收规则：执行扫描（mark 命中入可回收清单 / auto 命中即回收） */
export const executeIpamRecycleRule = (ruleId: number) =>
  request(`/api/takin/ipam/recycle-rules/${ruleId}/execute`, { method: RequestMethod.Post });

/** 段上回收规则列表（点地址段「扫描可回收IP」先弹此列表，按该段所属分组过滤） */
export const getIpamSubnetRecycleRules = (
  subnetId: number,
  params: { page?: number | string; limit?: number | string; query?: string; begin?: number; end?: number },
) => request(`/api/takin/ipam/subnets/${subnetId}/recycle-rules`, { method: RequestMethod.Get, params });

/** 可回收清单（标记落库后的待回收列表） */
export const getIpamRecyclable = (params: { subnet_id?: number; rule_id?: number; page?: number | string; limit?: number | string }) =>
  request('/api/takin/ipam/recyclable', { method: RequestMethod.Get, params });

/** 批量回收（已分配/预留统一变为未分配，单条失败跳过不中断整批） */
export const recycleIpamBatch = (data: { reason?: string; items: Array<{ subnet_id: number; ip: string }> }) =>
  request('/api/takin/ipam/addresses/recycle-batch', { method: RequestMethod.Post, data });

/** 变更记录列表（分配/预留/回收/释放/变更/删除/扫描/导入等写操作追加记录） */
export const getIpamChangeLogs = (
  subnetId: number,
  params: { ip?: string; action?: string; begin?: number; end?: number; page?: number | string; limit?: number | string },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses/change-logs`, { method: RequestMethod.Get, params });

/** IP 批量扫描（刷新台账+资产推导状态，非 ICMP 探测） */
export const scanIpamAddressesBatch = (subnetId: number, ips: string[]) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/scan-batch`, { method: RequestMethod.Post, data: { ips } });

/** IP 批量回收（已分配或预留 → 未分配） */
export const recycleIpamAddressesBatch = (subnetId: number, ips: string[], reason?: string) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/recycle-batch`, { method: RequestMethod.Post, data: { ips, reason } });

/** IP 批量删除（仅未分配可删，写入排除表） */
export const deleteIpamAddressesBatch = (subnetId: number, ips: string[]) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/delete-batch`, { method: RequestMethod.Post, data: { ips } });

/** IP 批量变更（对选中的已分配 IP 写入同一套字段） */
export const changeIpamAddressesBatch = (
  subnetId: number,
  data: {
    ips: string[];
    asset_name: string;
    mac: string;
    port?: string;
    is_gateway?: boolean;
    is_temporary?: boolean;
    duration_value?: number;
    duration_unit?: string;
    remark?: string;
  },
) => request(`/api/takin/ipam/subnets/${subnetId}/addresses/change-batch`, { method: RequestMethod.Post, data });

/** IP 批量导出（返回 CSV 文件流，responseType blob 走 request.ts 原样返回） */
export const exportIpamAddresses = (subnetId: number, ips: string[]) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/export`, { method: RequestMethod.Post, data: { ips }, responseType: 'blob' });

/** 下载导入模板（返回 CSV 文件流：表头 + 一行示例，对应导入弹窗「下载模板」） */
export const getIpamImportTemplate = (subnetId: number) =>
  request(`/api/takin/ipam/subnets/${subnetId}/addresses/import-template`, { method: RequestMethod.Get, responseType: 'blob' });

/** IP 批量导入（multipart/form-data，字段名 file，CSV；未分配→分配，已分配→变更） */
export const importIpamAddresses = (subnetId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/api/takin/ipam/subnets/${subnetId}/addresses/import`, { method: RequestMethod.Post, data: formData });
};

/** 地址段批量扫描（刷新使用/分配/在线统计，非 ICMP） */
export const scanIpamSubnetsBatch = (subnetIds: number[]) =>
  request('/api/takin/ipam/subnets/scan-batch', { method: RequestMethod.Post, data: { subnet_ids: subnetIds } });

/** 地址段批量回收（回收段内全部已分配+预留；停用段不可回收） */
export const recycleIpamSubnetBatch = (subnetIds: number[], reason?: string) =>
  request('/api/takin/ipam/subnets/recycle-batch', { method: RequestMethod.Post, data: { subnet_ids: subnetIds, reason } });

/** 地址段批量删除（仅停用可删） */
export const deleteIpamSubnetBatch = (subnetIds: number[]) =>
  request('/api/takin/ipam/subnets/delete-batch', { method: RequestMethod.Post, data: { subnet_ids: subnetIds } });


// ==================== 枚举/字段映射 ====================

const SUBNET_STATUS_TO_ENUM: Record<string, SegmentStatus> = {
  in_use: SegmentStatus.InUse,
  reserved: SegmentStatus.Reserved,
  disabled: SegmentStatus.Disabled,
};

const SUBNET_STATUS_FROM_ENUM: Record<number, string> = {
  [SegmentStatus.InUse]: 'in_use',
  [SegmentStatus.Reserved]: 'reserved',
  [SegmentStatus.Disabled]: 'disabled',
};

const ALLOC_STATUS_TO_ENUM: Record<string, IpAllocStatus> = {
  unallocated: IpAllocStatus.Unallocated,
  allocated: IpAllocStatus.Allocated,
  reserved: IpAllocStatus.Reserved,
};

const ALLOC_STATUS_FROM_ENUM: Record<number, string> = {
  [IpAllocStatus.Unallocated]: 'unallocated',
  [IpAllocStatus.Allocated]: 'allocated',
  [IpAllocStatus.Reserved]: 'reserved',
};

/** 页面时长单位（天/月）→ 后端单位（当前仅 day） */
const DURATION_UNIT_TO_API: Record<string, string> = { 天: 'day', 月: 'month' };

/** Unix 秒 → 页面统一时间格式 YYYY-MM-DD HH:mm */
const fmtTime = (unix?: number) => (unix ? moment.unix(unix).format('YYYY-MM-DD HH:mm') : '-');

/** 按掩码位数计算可用主机数（IPv4，不含网络号/广播） */
const hostCountOf = (mask: number) => (mask >= 31 ? Math.pow(2, 32 - mask) : Math.pow(2, 32 - mask) - 2);

/** 组织树 subnet 节点 → 页面 IpSegment（仅树展示字段，完整字段待列表接口填充；groupName 取父分组名，供树上段节点菜单弹窗展示归属） */
function subnetNodeToSegment(node: IpamTreeNode, parentId?: number, parentName?: string): IpSegment {
  const parts = (node.cidr || '').split('/');
  return {
    id: node.id,
    segment: parts[0] || '',
    mask: Number(parts[1] || 24),
    fullSegment: node.cidr || node.label,
    groupId: parentId || 0,
    groupName: parentName || '',
    status: SUBNET_STATUS_TO_ENUM[node.status || ''] ?? SegmentStatus.InUse,
    vlan: undefined,
    owner: '',
    operator: '',
    updateTime: '-',
    usedCount: 0,
    unusedCount: 0,
    allocatedCount: node.used || 0,
    reservedIpCount: 0,
    unallocatedCount: 0,
    onlineCount: 0,
    offlineCount: 0,
    usageRate: 0,
    recyclableCount: 0,
  };
}

/** 地址段 VO → 页面 IpSegment */
function subnetVOToSegment(vo: IpamSubnetVO): IpSegment {
  const parts = (vo.cidr || '').split('/');
  return {
    id: vo.id,
    segment: parts[0] || '',
    mask: Number(parts[1] || vo.prefix_length || 24),
    fullSegment: vo.cidr,
    groupId: vo.group_id,
    groupName: vo.group_name || '',
    status: SUBNET_STATUS_TO_ENUM[vo.status] ?? SegmentStatus.InUse,
    vlan: vo.vlan || undefined,
    owner: vo.owner || '',
    operator: vo.updated_by || '',
    updateTime: fmtTime(vo.updated_at),
    usedCount: vo.used_count || 0,
    unusedCount: vo.unused_count || 0,
    allocatedCount: vo.allocated_count || 0,
    reservedIpCount: vo.reserved_count || 0,
    unallocatedCount: vo.unallocated_count || 0,
    onlineCount: vo.online_count || 0,
    offlineCount: vo.offline_count || 0,
    usageRate: vo.usage_rate || 0,
    recyclableCount: vo.recyclable_count || 0,
    note: vo.remark || undefined,
    disableReason: vo.disable_reason || undefined,
  };
}

/** IP 行 VO → 页面 IpItem；id=0 为未落库的虚拟行（CIDR 展开） */
function addressVOToItem(vo: IpamAddressVO): IpItem {
  const alloc = ALLOC_STATUS_TO_ENUM[vo.allocation_status] ?? IpAllocStatus.Unallocated;
  const isVirtual = !vo.id;
  return {
    id: vo.id,
    ip: vo.ip,
    allocStatus: alloc,
    useStatus: vo.usage_status === 'used' ? IpUseStatus.Used : IpUseStatus.Unused,
    onlineStatus:
      vo.online_status === 'online' ? IpOnlineStatus.Online : vo.online_status === 'offline' ? IpOnlineStatus.Offline : IpOnlineStatus.None,
    segmentId: vo.subnet_id,
    segment: vo.subnet_cidr || '',
    groupId: 0,
    groupName: vo.group_name || '',
    owner: vo.owner || undefined,
    assetName: vo.asset_name || undefined,
    mac: vo.mac || undefined,
    port: vo.port || undefined,
    isTempIp: vo.is_temporary ? 1 : alloc === IpAllocStatus.Unallocated ? -1 : 0,
    isGateway: vo.is_gateway ? 1 : alloc === IpAllocStatus.Unallocated ? -1 : 0,
    lastOnlineTime: vo.last_online_at ? moment.unix(vo.last_online_at).format('YYYY-MM-DD HH:mm') : undefined,
    idleDays: isVirtual ? undefined : vo.idle_days || 0,
    note: vo.remark || undefined,
    duration: vo.duration_value || undefined,
    durationUnit: vo.duration_unit === 'day' ? '天' : vo.duration_unit === 'month' ? '月' : vo.duration_unit || undefined,
  };
}

// ---------- 回收规则映射 ----------

/** 星期中文（页面 weekly 存值）↔ 后端 freq_day 1-7 */
const WEEKDAY_CN = '一二三四五六日';

/**
 * 页面 freqValue（weekly 星期中文 / monthly 几号 / yearly «M月D日»）→ 后端 { freq_month, freq_day }
 * yearly 拆出月与日；其余频率 freq_month 恒为 0；daily 或解析失败 freq_day 为 0
 */
function freqToApi(freqType: string, freqValue?: string): { freq_month: number; freq_day: number } {
  if (!freqValue) return { freq_month: 0, freq_day: 0 };
  if (freqType === 'weekly') {
    const i = WEEKDAY_CN.indexOf(String(freqValue));
    return { freq_month: 0, freq_day: i > -1 ? i + 1 : 0 };
  }
  if (freqType === 'monthly') return { freq_month: 0, freq_day: Number(freqValue) || 0 };
  if (freqType === 'yearly') {
    const m = String(freqValue).match(/(\d+)月(\d+)日/);
    return m ? { freq_month: Number(m[1]) || 0, freq_day: Number(m[2]) || 0 } : { freq_month: 0, freq_day: 0 };
  }
  return { freq_month: 0, freq_day: 0 };
}

/** 后端 freq_month/freq_day → 页面 freqValue；yearly 用接口返回的月份回显 «M月D日» */
function freqFromApi(freqType: string, freqMonth?: number, freqDay?: number): string {
  const day = freqDay || 0;
  if (freqType === 'weekly') return WEEKDAY_CN[day - 1] || '';
  if (freqType === 'monthly') return day ? String(day) : '';
  if (freqType === 'yearly') return day ? `${freqMonth || 1}月${day}日` : '';
  return '';
}

/** 页面白名单（段 ID（数字或纯数字串）+ IP 混合）→ 后端 { subnet_ids, ips } */
function whitelistToApi(list?: Array<number | string>) {
  const subnetIds: number[] = [];
  const ips: string[] = [];
  _.forEach(list, (v) => {
    // 纯数字（段 ID，tags 模式下为字符串）归为白名单地址段；其余视为 IP 文本
    if (typeof v === 'number' || /^\d+$/.test(String(v))) {
      subnetIds.push(Number(v));
    } else {
      ips.push(String(v));
    }
  });
  return { subnet_ids: subnetIds, ips };
}

/** 回收规则 VO → 页面 RecycleRule */
function ruleVOToRule(vo: IpamRecycleRuleVO): RecycleRule {
  const trigger = vo.trigger_type as RuleTriggerType;
  const action = vo.action as RuleAction;
  const freqType = vo.freq_type as RuleFreqType;
  return {
    id: vo.id,
    name: vo.name,
    groupId: vo.group_id,
    groupName: vo.group_name || '',
    scopeType: vo.scope_type === 'all_group_subnets' ? 'all' : 'custom',
    customSegments: vo.scope_subnet_ids || [],
    triggerType: trigger,
    // 资产下架类无阈值（后端可能存 0，页面显示为空）
    thresholdDays: trigger === RuleTriggerType.AssetOffline ? undefined : vo.idle_threshold_days || undefined,
    action,
    freqType,
    freqValue: freqFromApi(vo.freq_type, vo.freq_month, vo.freq_day),
    // 页面格式 HH:mm:ss；后端 HH:MM
    execTime: vo.freq_time ? `${vo.freq_time}:00`.slice(0, 8) : '02:00:00',
    hitCount: vo.hit_count || 0,
    lastExecTime: vo.last_run_at ? moment.unix(vo.last_run_at).format('YYYY-MM-DD HH:mm') : '-',
    enabled: vo.enabled,
    whitelist: [...(vo.whitelist?.subnet_ids || []).map(String), ...(vo.whitelist?.ips || [])],
    updater: vo.updated_by || '',
    updateTime: vo.updated_at ? moment.unix(vo.updated_at).format('YYYY-MM-DD HH:mm') : '-',
  };
}

/** 页面规则表单值 → 后端新增/修改 body */
function ruleToBody(data: {
  groupId: number;
  name: string;
  scopeType: 'all' | 'custom';
  customSegments?: number[];
  triggerType: RuleTriggerType;
  thresholdDays?: number;
  action: RuleAction;
  freqType: RuleFreqType;
  freqValue?: string;
  execTime: string;
  whitelist?: Array<number | string>;
  enabled?: boolean;
}) {
  return {
    group_id: data.groupId,
    name: data.name,
    scope_type: data.scopeType === 'all' ? 'all_group_subnets' : 'specified_subnets',
    scope_subnet_ids: data.scopeType === 'custom' ? data.customSegments || [] : [],
    trigger_type: data.triggerType,
    // 资产下架类无阈值，后端允许 0
    idle_threshold_days: data.triggerType === RuleTriggerType.AssetOffline ? 0 : data.thresholdDays || 0,
    action: data.action,
    freq_type: data.freqType,
    // yearly 时拆出 freq_month/freq_day（如 3月15日 → freq_month:3, freq_day:15）；其余频率 freq_month 为 0
    ...freqToApi(data.freqType, data.freqValue),
    // 页面 HH:mm:ss → 后端 HH:MM
    freq_time: (data.execTime || '02:00:00').slice(0, 5),
    whitelist: whitelistToApi(data.whitelist),
    enabled: data.enabled !== false,
    remark: '',
  };
}

// ==================== 页面适配函数（与模块 mock.ts 同名） ====================

/**
 * 获取组织树数据（一次 tree 请求同时得到分组与树上的地址段节点）
 * 分组用于左侧树；树上的段节点用于渲染段节点（完整字段待点击分组后由列表接口填充）
 * 注意：此处只调一次 /ipam/tree，避免页面拆成 getGroups + getSegments 时重复请求
 */
export async function getTreeData(): Promise<{ groups: IpGroup[]; segments: IpSegment[] }> {
  const res = await getIpamTree();
  const groups: IpGroup[] = [];
  const segments: IpSegment[] = [];
  const walk = (list: IpamTreeNode[], parentId?: number, parentName?: string) => {
    _.forEach(list, (node) => {
      if (node.node_type === 'group') {
        groups.push({ id: node.id, name: node.label, owner: '', parentId });
        walk(node.children || [], node.id, node.label);
      } else if (node.node_type === 'subnet') {
        segments.push(subnetNodeToSegment(node, parentId, parentName));
      }
    });
  };
  walk(res.dat || []);
  return { groups, segments };
}

/**
 * 获取全部分组（页面组织树用）
 * 后端组织树接口只含分组/地址段节点，这里平铺出分组列表（含父子关系）
 */
export async function getGroups(): Promise<IpGroup[]> {
  const res = await getIpamTree();
  const groups: IpGroup[] = [];
  const walk = (list: IpamTreeNode[], parentId?: number) => {
    _.forEach(list, (node) => {
      if (node.node_type === 'group') {
        groups.push({ id: node.id, name: node.label, owner: '', parentId });
        walk(node.children || [], node.id);
      }
    });
  };
  walk(res.dat || []);
  return groups;
}

/**
 * 地址段列表（服务端分页 + 服务端查询）
 * - 传 segmentId：地址段详情（选中某段时表格显示该段）
 * - 传 groupId：查询该分组；不传：查询全部（后端默认行为）
 * - query/status 均为后端过滤参数
 */
export async function getSegmentList(params: {
  segmentId?: number;
  groupId?: number;
  page?: number;
  limit?: number;
  query?: string;
  status?: SegmentStatus;
}): Promise<{ list: IpSegment[]; total: number; stats?: SegmentStats; group?: IpamGroupVO }> {
  if (params.segmentId) {
    const res = await getIpamSubnet(params.segmentId);
    const seg = subnetVOToSegment((res.dat || {}) as IpamSubnetVO);
    return {
      list: [seg],
      total: 1,
      stats: {
        total: hostCountOf(seg.mask),
        usageRate: seg.usageRate,
        allocated: seg.allocatedCount,
        reserved: seg.reservedIpCount,
        remaining: Math.max(hostCountOf(seg.mask) - seg.allocatedCount - seg.reservedIpCount, 0),
        segmentCount: 1,
      },
    };
  }
  const query: { page: number | string; limit: number | string; group_id?: number; query?: string; status?: string } = {
    page: params.page || 1,
    limit: params.limit || 10,
  };
  if (params.groupId) query.group_id = params.groupId;
  if (params.query) query.query = params.query;
  if (params.status !== undefined) query.status = SUBNET_STATUS_FROM_ENUM[params.status];
  const res = await getIpamSubnets(query);
  const dat = (res.dat || {}) as {
    group?: IpamGroupVO;
    list?: IpamSubnetVO[];
    total?: number;
    stats?: { subnet_count?: number; total_hosts?: number; allocated?: number; reserved?: number; remaining?: number; usage_rate?: number };
  };
  const list = _.map(dat.list || [], subnetVOToSegment);
  const stats = dat.stats
    ? {
        total: dat.stats.total_hosts || 0,
        usageRate: dat.stats.usage_rate || 0,
        allocated: dat.stats.allocated || 0,
        reserved: dat.stats.reserved || 0,
        remaining: dat.stats.remaining || 0,
        segmentCount: dat.stats.subnet_count || 0,
      }
    : undefined;
  return { list, total: dat.total ?? list.length, stats, group: dat.group };
}

/**
 * 段内 IP 列表（服务端分页 + 服务端查询）
 * 一次请求同时得到：IP 列表、总数、地址段信息、统计汇总（避免列表/统计/段信息多次请求）
 */
export async function getSegmentAddresses(
  segmentId: number,
  params: { page?: number; limit?: number; query?: string; allocStatus?: number },
): Promise<{ list: IpItem[]; total: number; segment?: IpSegment; stats: IpStats }> {
  const query: { page: number | string; limit: number | string; query?: string; allocation_status?: string } = {
    page: params.page || 1,
    limit: params.limit || 10,
  };
  if (params.query) query.query = params.query;
  if (params.allocStatus !== undefined) query.allocation_status = ALLOC_STATUS_FROM_ENUM[params.allocStatus];
  const res = await getIpamAddresses(segmentId, query);
  const dat = (res.dat || {}) as IpamAddressesVO;
  const subnet = dat.subnet ? subnetVOToSegment(dat.subnet) : undefined;
  const list = _.map(dat.list || [], addressVOToItem);
  const stats: IpStats = {
    total: dat.total || dat.subnet?.host_count || 0,
    allocated: dat.subnet?.allocated_count || 0,
    reserved: dat.subnet?.reserved_count || 0,
    online: dat.subnet?.online_count || 0,
    usageRate: dat.subnet?.usage_rate || 0,
  };
  return { list, total: dat.total ?? list.length, segment: subnet, stats };
}

/** 地址段详情（编辑/查看弹窗用：树节点与列表行字段不全，以详情接口为准） */
export async function getSubnetDetail(id: number): Promise<IpSegment> {
  const res = await getIpamSubnet(id);
  return subnetVOToSegment((res.dat || {}) as IpamSubnetVO);
}

/** 单个IP详情（IP 查看弹窗用：以详情接口为准；按 ip + subnet_id 定位，虚拟行 id=0 亦可） */
export async function getIpDetail(item: { ip: string; segmentId: number }): Promise<IpItem> {
  const res = await getIpamAddressDetail(item.segmentId, item.ip);
  return addressVOToItem((res.dat || {}) as IpamAddressVO);
}

/**
 * 获取地址段列表（旧签名，仅保留兼容；页面已改用 getSegmentList 服务端分页）
 * - segmentId：地址段详情接口
 * - 其余：组织树拿全部分组 → 逐分组拉地址段列表
 * - groupId：聚合该分组及其全部子孙分组下的地址段
 */
export async function getSegments(params?: {
  segmentId?: number;
  groupId?: number;
  keyword?: string;
}): Promise<{ list: IpSegment[]; total: number }> {
  if (params?.segmentId) {
    const res = await getIpamSubnet(params.segmentId);
    const seg = subnetVOToSegment((res.dat || {}) as IpamSubnetVO);
    return { list: [seg], total: 1 };
  }
  const treeRes = await getIpamTree();
  const groupParent = new Map<number, number | undefined>();
  const walk = (list: IpamTreeNode[], parentId?: number) => {
    _.forEach(list, (node) => {
      if (node.node_type === 'group') {
        groupParent.set(node.id, parentId);
        walk(node.children || [], node.id);
      }
    });
  };
  walk(treeRes.dat || []);
  const groupIds = Array.from(groupParent.keys());
  const lists = await Promise.all(
    _.map(groupIds, (id) => getIpamSubnets({ group_id: id, page: 1, limit: 1000 })),
  );
  let all: IpSegment[] = [];
  _.forEach(lists, (res) => {
    const dat = (res.dat || {}) as { list?: IpamSubnetVO[] };
    all = all.concat(_.map(dat.list || [], subnetVOToSegment));
  });
  if (params?.groupId) {
    // 聚合该分组及其全部子孙分组
    const collectIds = (gid: number): number[] => {
      const result = [gid];
      _.forEach(Array.from(groupParent.entries()), ([childId, parentId]) => {
        if (parentId === gid) result.push(...collectIds(childId));
      });
      return result;
    };
    const ids = collectIds(params.groupId);
    all = _.filter(all, (item) => ids.includes(item.groupId));
  }
  if (params?.keyword) {
    all = _.filter(all, (item) => item.fullSegment.indexOf(params.keyword!) > -1);
  }
  return { list: all, total: all.length };
}

/**
 * 段内 IP 列表（CIDR 全量展开）
 * 后端为服务端分页，mock 联调阶段取大 limit 一次拉全，页面保持前端筛选/分页
 */
export async function getIpList(params?: {
  segmentId?: number;
  allocStatus?: number;
  keyword?: string;
}): Promise<{ list: IpItem[]; total: number }> {
  if (!params?.segmentId) return { list: [], total: 0 };
  const query: { page: number; limit: number; query?: string; allocation_status?: string } = { page: 1, limit: 1000 };
  if (params.allocStatus !== undefined) query.allocation_status = ALLOC_STATUS_FROM_ENUM[params.allocStatus];
  if (params.keyword) query.query = params.keyword;
  const res = await getIpamAddresses(params.segmentId, query);
  const dat = (res.dat || {}) as IpamAddressesVO;
  const list = _.map(dat.list || [], addressVOToItem);
  return { list, total: dat.total ?? list.length };
}

/** 地址段内 IP 统计（来自列表接口响应中的 subnet 汇总字段） */
export async function getIpStats(segmentId?: number): Promise<IpStats> {
  if (!segmentId) return { total: 0, allocated: 0, reserved: 0, online: 0, usageRate: 0 };
  const res = await getIpamAddresses(segmentId, { page: 1, limit: 1 });
  const dat = (res.dat || {}) as IpamAddressesVO;
  const subnet = (dat.subnet || {}) as IpamSubnetVO;
  return {
    total: dat.total || subnet.host_count || 0,
    allocated: subnet.allocated_count || 0,
    reserved: subnet.reserved_count || 0,
    online: subnet.online_count || 0,
    usageRate: subnet.usage_rate || 0,
  };
}

// ---------- 分组操作 ----------

/** 新增子分组（parent_id=0 表示顶级） */
export async function addGroup(data: { name: string; owner?: string; parentId?: number }): Promise<{ success: boolean; message?: string }> {
  await createIpamGroup({
    name: data.name,
    parent_id: data.parentId || 0,
    owner: data.owner,
  });
  return { success: true };
}

/** 编辑分组：先取详情补全 parent_id 等必填字段再提交 */
export async function editGroup(id: number, data: { name: string }): Promise<{ success: boolean }> {
  const res = await getIpamGroup(id);
  const group = (res.dat?.group || {}) as IpamGroupVO;
  await updateIpamGroup({
    id,
    name: data.name,
    parent_id: group.parent_id || 0,
    owner: group.owner,
    sort: group.sort,
    remark: group.remark,
  });
  return { success: true };
}

/** 删除分组（存在子分组/地址段时后端拒绝，err 会由全局提示抛出） */
export async function deleteGroup(id: number): Promise<{ success: boolean; message?: string }> {
  await deleteIpamGroup(id);
  return { success: true };
}

// ---------- 地址段操作 ----------

/** 新增地址段：页面 { segment, mask } → 后端 cidr；状态映射为后端枚举字符串 */
export async function addSegment(data: {
  groupId: number;
  segment: string;
  mask: number;
  vlan?: string;
  owner?: string;
  note?: string;
  status?: SegmentStatus;
  disableReason?: string;
}): Promise<{ success: boolean; message?: string }> {
  await createIpamSubnet({
    group_id: data.groupId,
    cidr: `${data.segment}/${data.mask}`,
    vlan: data.vlan,
    owner: data.owner,
    status: SUBNET_STATUS_FROM_ENUM[data.status ?? SegmentStatus.InUse],
    disable_reason: data.status === SegmentStatus.Disabled ? data.disableReason : '',
    remark: data.note,
  });
  return { success: true };
}

/** 编辑地址段：先取详情补全 group_id 等必填字段再提交 */
export async function editSegment(
  id: number,
  data: {
    segment?: string;
    mask?: number;
    vlan?: string;
    owner?: string;
    note?: string;
    status?: SegmentStatus;
    disableReason?: string;
  },
): Promise<{ success: boolean; message?: string }> {
  const res = await getIpamSubnet(id);
  const old = (res.dat || {}) as IpamSubnetVO;
  const cidr = data.segment && data.mask ? `${data.segment}/${data.mask}` : old.cidr;
  const status = data.status ?? SUBNET_STATUS_TO_ENUM[old.status] ?? SegmentStatus.InUse;
  await updateIpamSubnet({
    id,
    group_id: old.group_id,
    cidr,
    vlan: data.vlan ?? old.vlan,
    owner: data.owner ?? old.owner,
    status: SUBNET_STATUS_FROM_ENUM[status],
    disable_reason: status === SegmentStatus.Disabled ? data.disableReason || old.disable_reason : '',
    remark: data.note ?? old.remark,
  });
  return { success: true };
}

/** 启用地址段（status → in_use） */
export async function enableSegment(id: number): Promise<{ success: boolean }> {
  const res = await getIpamSubnet(id);
  const old = (res.dat || {}) as IpamSubnetVO;
  await updateIpamSubnet({
    id,
    group_id: old.group_id,
    cidr: old.cidr,
    vlan: old.vlan,
    owner: old.owner,
    status: 'in_use',
    disable_reason: '',
    remark: old.remark,
  });
  return { success: true };
}

/** 删除地址段（仅 disabled 状态可删） */
export async function deleteSegment(id: number): Promise<{ success: boolean }> {
  await deleteIpamSubnet(id);
  return { success: true };
}

// ---------- IP 行操作（按 ip + subnet_id 定位，页面传 IpItem/含 ip 与 segmentId 的对象） ----------

/** 分配IP */
export async function assignIp(
  item: { ip: string; segmentId: number },
  data: {
    assetName: string;
    mac?: string;
    port?: string;
    gateway?: boolean;
    tempIp?: boolean;
    duration?: number;
    durationUnit?: string;
    note?: string;
  },
): Promise<{ success: boolean }> {
  await allocateIpamAddress(item.segmentId, {
    ip: item.ip,
    asset_name: data.assetName,
    mac: data.mac || '',
    port: data.port,
    is_gateway: !!data.gateway,
    is_temporary: !!data.tempIp,
    duration_value: data.duration || 0,
    duration_unit: DURATION_UNIT_TO_API[data.durationUnit || '天'] || 'day',
    remark: data.note,
  });
  return { success: true };
}

/** 预留IP */
export async function reserveIp(
  item: { ip: string; segmentId: number },
  data: {
    reason: string;
    duration?: number;
    durationUnit?: string;
    gateway?: boolean;
    tempIp?: boolean;
    note?: string;
  },
): Promise<{ success: boolean }> {
  await reserveIpamAddress(item.segmentId, {
    ip: item.ip,
    reserve_desc: data.reason,
    duration_value: data.duration || 0,
    duration_unit: DURATION_UNIT_TO_API[data.durationUnit || '天'] || 'day',
    is_gateway: !!data.gateway,
    is_temporary: !!data.tempIp,
    remark: data.note,
  });
  return { success: true };
}

/** 回收IP */
export async function recycleOneIp(item: { ip: string; segmentId: number }, reason: string): Promise<{ success: boolean }> {
  await recycleIpamAddress(item.segmentId, { ip: item.ip, reason });
  return { success: true };
}

/** 释放预留 */
export async function releaseIp(item: { ip: string; segmentId: number }): Promise<{ success: boolean }> {
  await releaseIpamAddress(item.segmentId, { ip: item.ip });
  return { success: true };
}

/** 变更已分配IP（换绑资产文本） */
export async function changeIp(
  item: { ip: string; segmentId: number },
  data: { assetName?: string; mac?: string; note?: string },
): Promise<{ success: boolean }> {
  await updateIpamAddress(item.segmentId, {
    ip: item.ip,
    asset_name: data.assetName || '',
    mac: data.mac || '',
    remark: data.note,
  });
  return { success: true };
}

/** 删除IP（按 ip + subnet_id 定位，后端语义为隐藏：仅未分配可删） */
export async function deleteIp(item: { ip: string; segmentId: number }): Promise<{ success: boolean }> {
  await hideIpamAddress(item.segmentId, item.ip);
  return { success: true };
}

// ==================== 回收规则与回收（页面适配函数） ====================

/**
 * 回收规则列表（服务端分页 + 服务端查询）
 * - segmentId：段上规则列表（点「扫描可回收IP」先弹规则列表，按该段所属分组过滤）
 * - groupId：分组视角规则列表；均不传为全部
 * - name：规则名称模糊；startTime/endTime（YYYY-MM-DD）→ Unix 秒
 */
export async function getRecycleRules(params: {
  groupId?: number;
  segmentId?: number;
  name?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  limit?: number;
}): Promise<{ list: RecycleRule[]; total: number }> {
  const query: { page?: number | string; limit?: number | string; query?: string; begin?: number; end?: number; group_id?: number } = {
    page: params.page || 1,
    limit: params.limit || 10,
  };
  if (params.groupId) query.group_id = params.groupId;
  if (params.name) query.query = params.name;
  if (params.startTime) query.begin = moment(params.startTime, 'YYYY-MM-DD').startOf('day').unix();
  if (params.endTime) query.end = moment(params.endTime, 'YYYY-MM-DD').endOf('day').unix();
  const res = params.segmentId
    ? await getIpamSubnetRecycleRules(params.segmentId, query)
    : await getIpamRecycleRules(query);
  const dat = (res.dat || {}) as IpamRecycleRulesVO;
  return {
    list: _.map(dat.list || [], ruleVOToRule),
    total: dat.total ?? (dat.list || []).length,
  };
}

/** 新增回收规则 */
export async function addRecycleRule(data: {
  name: string;
  groupId: number;
  scopeType: 'all' | 'custom';
  customSegments?: number[];
  triggerType: RuleTriggerType;
  thresholdDays?: number;
  action: RuleAction;
  freqType: RuleFreqType;
  freqValue?: string;
  execTime: string;
  whitelist?: Array<number | string>;
  enabled?: boolean;
}): Promise<{ success: boolean }> {
  await createIpamRecycleRule(ruleToBody(data));
  return { success: true };
}

/** 修改回收规则（PUT 需全量字段，group_id 由页面透传） */
export async function editRecycleRule(
  id: number,
  data: Parameters<typeof ruleToBody>[0],
): Promise<{ success: boolean }> {
  await updateIpamRecycleRule(id, ruleToBody(data));
  return { success: true };
}

/** 删除回收规则 */
export async function deleteRecycleRule(id: number): Promise<{ success: boolean }> {
  await deleteIpamRecycleRule(id);
  return { success: true };
}

/** 回收规则详情（查看/编辑弹窗用：以详情接口为准，列表行字段可能不全） */
export async function getRecycleRuleDetail(id: number): Promise<RecycleRule> {
  const res = await getIpamRecycleRule(id);
  return ruleVOToRule((res.dat || {}) as IpamRecycleRuleVO);
}

/** 启停回收规则 */
export async function toggleRecycleRule(id: number, enabled: boolean): Promise<{ success: boolean }> {
  await toggleIpamRecycleRule(id, enabled);
  return { success: true };
}

/** 执行回收规则扫描：mark 命中入可回收清单 / auto 命中即回收 */
export async function executeRecycleRule(id: number): Promise<{ hitCount: number; recycled: number; message: string }> {
  const res = await executeIpamRecycleRule(id);
  const dat = (res.dat || {}) as IpamExecuteVO;
  return {
    hitCount: dat.hit_count || 0,
    recycled: dat.recycled || 0,
    message: dat.message || `扫描完成：命中${dat.hit_count || 0}个地址`,
  };
}

/** 预计覆盖（规则表单下方提示，返回后端可直接展示的文案） */
export async function previewRecycleScope(params: {
  groupId: number;
  scopeType: 'all' | 'custom';
  customSegments?: number[];
}): Promise<string> {
  const res = await previewIpamRecycleScope({
    group_id: params.groupId,
    scope_type: params.scopeType === 'all' ? 'all_group_subnets' : 'specified_subnets',
    scope_subnet_ids: params.scopeType === 'custom' ? params.customSegments || [] : [],
  });
  const dat = (res.dat || {}) as { subnet_count?: number; ledger_count?: number; message?: string };
  return dat.message || `预计覆盖${dat.subnet_count || 0}个地址段，约${dat.ledger_count || 0}个已分配和预留地址参与扫描`;
}

/** 某地址段可回收清单（回收弹窗，一次拉取全部勾选） */
export async function getRecyclableIps(segmentId: number): Promise<IpItem[]> {
  const res = await getIpamRecyclable({ subnet_id: segmentId, page: 1, limit: 1000 });
  const dat = (res.dat || {}) as { list?: IpamAddressVO[] };
  return _.map(dat.list || [], addressVOToItem);
}

/** 批量回收（已分配/预留 → 未分配，返回实际回收条数） */
export async function recycleBatchIps(items: Array<{ ip: string; segmentId: number }>, reason?: string): Promise<{ recycled: number }> {
  const res = await recycleIpamBatch({
    reason: reason || '批量回收',
    items: _.map(items, (item) => ({ subnet_id: item.segmentId, ip: item.ip })),
  });
  const dat = (res.dat || {}) as { recycled?: number };
  return { recycled: dat.recycled || 0 };
}

// ==================== 变更记录与批量操作（页面适配函数） ====================

/** 批量操作结果解析：{ success, failed, recycled? } */
function parseBatchResult(res: { dat?: unknown }): { success: number; failed: number; recycled: number } {
  const dat = (res.dat || {}) as IpamBatchResultVO;
  return {
    success: dat.success || 0,
    failed: dat.failed || 0,
    recycled: _.sumBy(dat.results || [], (r) => r.recycled || 0),
  };
}

/** 变更记录列表（服务端分页 + 查询；startTime/endTime YYYY-MM-DD → Unix 秒） */
export async function getChangeLogs(
  segmentId: number,
  params: { ip?: string; action?: string; startTime?: string; endTime?: string; page?: number; limit?: number },
): Promise<{ list: ChangeLogItem[]; total: number }> {
  const query: { ip?: string; action?: string; begin?: number; end?: number; page?: number | string; limit?: number | string } = {
    page: params.page || 1,
    limit: params.limit || 20,
  };
  if (params.ip) query.ip = params.ip;
  if (params.action) query.action = params.action;
  if (params.startTime) query.begin = moment(params.startTime, 'YYYY-MM-DD').startOf('day').unix();
  if (params.endTime) query.end = moment(params.endTime, 'YYYY-MM-DD').endOf('day').unix();
  const res = await getIpamChangeLogs(segmentId, query);
  const dat = (res.dat || {}) as { list?: IpamChangeLogVO[]; total?: number };
  return {
    list: _.map(dat.list || [], (vo) => ({
      id: vo.id,
      subnetId: vo.subnet_id,
      ip: vo.ip,
      action: vo.action,
      beforeData: vo.before_data || '',
      afterData: vo.after_data || '',
      reason: vo.reason || '',
      createdAt: moment.unix(vo.created_at).format('YYYY-MM-DD HH:mm:ss'),
      createdBy: vo.created_by || '',
    })),
    total: dat.total ?? (dat.list || []).length,
  };
}

/** IP 批量扫描（刷新台账+资产推导状态，返回成功/失败条数） */
export async function batchScanIps(segmentId: number, ips: string[]): Promise<{ success: number; failed: number }> {
  const res = await scanIpamAddressesBatch(segmentId, ips);
  return parseBatchResult(res);
}

/** IP 批量回收（段内选定 IP） */
export async function batchRecycleIps(segmentId: number, ips: string[], reason?: string): Promise<{ success: number; failed: number }> {
  const res = await recycleIpamAddressesBatch(segmentId, ips, reason);
  return parseBatchResult(res);
}

/** IP 批量删除（仅未分配可删，写入排除表） */
export async function batchDeleteIps(segmentId: number, ips: string[]): Promise<{ success: number; failed: number }> {
  const res = await deleteIpamAddressesBatch(segmentId, ips);
  return parseBatchResult(res);
}

/** IP 批量变更（对选中的已分配 IP 写入同一套字段） */
export async function batchChangeIps(
  segmentId: number,
  data: { ips: string[]; assetName: string; mac: string; port?: string; gateway?: boolean; tempIp?: boolean; duration?: number; durationUnit?: string; note?: string },
): Promise<{ success: number; failed: number }> {
  const res = await changeIpamAddressesBatch(segmentId, {
    ips: data.ips,
    asset_name: data.assetName,
    mac: data.mac || '',
    port: data.port,
    is_gateway: !!data.gateway,
    is_temporary: !!data.tempIp,
    duration_value: data.duration || 0,
    duration_unit: DURATION_UNIT_TO_API[data.durationUnit || '天'] || 'day',
    remark: data.note,
  });
  return parseBatchResult(res);
}

/** IP 批量导入（multipart/form-data 上传 CSV） */
export async function importIps(segmentId: number, file: File): Promise<{ success: number; failed: number }> {
  const res = await importIpamAddresses(segmentId, file);
  return parseBatchResult(res);
}

/** 下载导入模板（后端 CSV 流，浏览器触发下载；错误 JSON 壳转业务错误提示） */
export async function downloadImportTemplate(segmentId: number): Promise<void> {
  const res = (await getIpamImportTemplate(segmentId)) as unknown as Blob;
  if (res.type.includes('application/json')) {
    const text = await res.text();
    let msg = text;
    try {
      const data = JSON.parse(text);
      msg = data.error || data.err || text;
    } catch (e) {
      // 保持原文
    }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(res);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ipam_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * IP 批量导出（后端 CSV 流，浏览器触发下载）
 * umi-request 对 responseType=blob 已解析为 Blob（request.ts 拦截器透传）；后端出错返回 JSON（带 err/error）时转为业务错误提示
 */
export async function exportIps(segmentId: number, ips: string[]): Promise<void> {
  const res = (await exportIpamAddresses(segmentId, ips)) as unknown as Blob;
  // 后端失败时返回 application/json 错误壳（Blob.type 可区分）
  if (res.type.includes('application/json')) {
    const text = await res.text();
    let msg = text;
    try {
      const data = JSON.parse(text);
      msg = data.error || data.err || text;
    } catch (e) {
      // 保持原文
    }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(res);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ipam_addresses.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟回收：立即 revoke 可能导致部分浏览器下载中断
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 地址段批量扫描（刷新统计） */
export async function batchScanSegments(subnetIds: number[]): Promise<{ success: number; failed: number }> {
  const res = await scanIpamSubnetsBatch(subnetIds);
  return parseBatchResult(res);
}

/** 地址段批量回收（段内全部已分配+预留；停用段不可回收，返回回收总数） */
export async function batchRecycleSegments(subnetIds: number[], reason?: string): Promise<{ success: number; failed: number; recycled: number }> {
  const res = await recycleIpamSubnetBatch(subnetIds, reason);
  return parseBatchResult(res);
}

/** 地址段批量删除（仅停用可删） */
export async function batchDeleteSegments(subnetIds: number[]): Promise<{ success: number; failed: number }> {
  const res = await deleteIpamSubnetBatch(subnetIds);
  return parseBatchResult(res);
}
