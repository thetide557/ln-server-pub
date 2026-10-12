/**
 * IP地址管理（IPAM）后端接口与页面适配层
 * 接口文档：《IP地址管理-分组-地址段相关接口》《IP地址管理-地址详情页》
 *
 * 结构说明：
 * 1. 底层接口函数与文档路径 1:1 对应，返回统一响应壳 { dat, err, success }（request.ts 拦截器处理）
 * 2. 页面适配函数与模块内 mock.ts 同名（getGroups / getSegments / getIpList / getIpStats 及分组、地址段、IP 操作），
 *    内部完成 IpamXxxVO → 页面类型（@/pages/sxxc/ipSegment/types）的转换，页面与组件保持既有渲染逻辑
 * 3. 后端 IP 行操作按「ip 字符串 + subnet_id」定位（未落库的虚拟行 id=0），页面适配函数相应改传
 *    含 { ip, segmentId } 的对象；IP 列表 rowKey 请使用 'ip'
 * 4. 文档未覆盖的功能（回收规则、扫描、删除IP、可回收清单、批量操作等）仍走模块内 mock.ts
 */
import _ from 'lodash';
import moment from 'moment';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import {
  IpAllocStatus,
  IpGroup,
  IpItem,
  IpSegment,
  IpStats,
  IpUseStatus,
  IpOnlineStatus,
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

/** 组织树 subnet 节点 → 页面 IpSegment（仅树展示字段，完整字段待列表接口填充） */
function subnetNodeToSegment(node: IpamTreeNode, parentId?: number): IpSegment {
  const parts = (node.cidr || '').split('/');
  return {
    id: node.id,
    segment: parts[0] || '',
    mask: Number(parts[1] || 24),
    fullSegment: node.cidr || node.label,
    groupId: parentId || 0,
    groupName: '',
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
  const walk = (list: IpamTreeNode[], parentId?: number) => {
    _.forEach(list, (node) => {
      if (node.node_type === 'group') {
        groups.push({ id: node.id, name: node.label, owner: '', parentId });
        walk(node.children || [], node.id);
      } else if (node.node_type === 'subnet') {
        segments.push(subnetNodeToSegment(node, parentId));
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
