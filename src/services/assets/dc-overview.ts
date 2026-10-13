import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ============================================================
// 机房总览 API —— 对接接口文档 6.x（dc_overview）
// 接口前缀：/api/takin
// 共 16 个接口：查询类 9 个、U 位操作类 7 个
// U 位状态通用：FREE 空闲 / OCCUPIED 已占用 / RESERVED 预留 / FAULT 故障 / DISABLED 禁用
// ============================================================

// ---------- 类型定义 ----------

/** 三层资源树：机房 */
export interface OverviewRoomNode {
  id: number;
  room_code: string;
  room_name: string;
  idc_name: string;
  cabinet_count: number;
  groups: OverviewGroupNode[];
}

/** 三层资源树：机柜组 */
export interface OverviewGroupNode {
  id: number;
  group_code: string;
  group_type: string;
  cabinets: OverviewCabinetNode[];
}

/** 三层资源树：机柜 */
export interface OverviewCabinetNode {
  id: number;
  cabinet_code: string;
  cabinet_name: string;
  u_capacity: number;
}

/** 机房信息卡（6.2） */
export interface RoomSummary {
  room_id: number;
  room_code: string;
  room_name: string;
  idc_name: string;
  building_name: string;
  floor_name: string;
  owner_name: string;
  image_url: string;
  voltage_v: number;
  current_a: number;
  rated_power_kw: number;
  area_sqm: number;
  cabinet_capacity: number;
  cabinet_count: number;
  total_u: number;
  occupied_u: number;
  reserved_u: number;
  fault_u: number;
  free_u: number;
  disabled_u: number;
  device_total: number;
  device_online: number;
}

/** 机柜组信息卡（6.3） */
export interface CabinetGroupSummary {
  group_id: number;
  group_code: string;
  group_type: string;
  room_id: number;
  room_name: string;
  orientation: 'ROW' | 'COLUMN';
  row_no: number | null;
  start_col_no: number | null;
  end_col_no: number | null;
  col_no: number | null;
  start_row_no: number | null;
  end_row_no: number | null;
  purpose_note: string;
  owner_name: string;
  cabinet_count: number;
  total_u: number;
  occupied_u: number;
  reserved_u: number;
  fault_u: number;
  free_u: number;
  disabled_u: number;
  device_total: number;
  device_online: number;
}

/** 机柜信息卡（6.5） */
export interface CabinetSummary {
  cabinet_id: number;
  cabinet_code: string;
  cabinet_name: string;
  room_id: number;
  room_name: string;
  group_id: number;
  group_code: string;
  cabinet_type: string;
  business_zone: string;
  row_no: number | null;
  col_no: number | null;
  u_capacity: number;
  owner_name: string;
  occupied_u: number;
  reserved_u: number;
  fault_u: number;
  free_u: number;
  disabled_u: number;
  device_total: number;
  device_online: number;
  /** U 位使用率 =(总U-空闲-禁用)/总U，0~1；总U=0 时为 0 */
  u_used_rate: number;
}

/** 设备类型统计项（6.4） */
export interface DeviceTypeStat {
  device_type: string;
  total: number;
  online: number;
  offline: number;
}

/** U 位区段原始行（6.6） */
export interface USectionRaw {
  u_start: number;
  u_end: number;
  u_height: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'FAULT' | 'DISABLED';
  asset_id: number;
  asset_name: string;
  asset_ip: string;
  device_type: string;
  model_name: string;
  /** 所属业务组名称 */
  business_group_name: string;
  owner_name: string;
  /** RESERVED=预留说明，DISABLED=禁用说明 */
  note: string;
  updated_by: string;
  updated_at: string;
}

/** U 位列表响应（6.6，按区段返回） */
export interface UListResp {
  cabinet_id: number;
  u_capacity: number;
  list: USectionRaw[];
}

// ---------- 6.1 查询三层资源树 ----------

/**
 * 机房→机柜组→机柜三层树（含每机房机柜数量）
 * GET /dc-overview/tree
 */
export const getOverviewTree = function () {
  return request('/api/takin/dc-overview/tree', {
    method: RequestMethod.Get,
  });
};

// ---------- 6.2 查询机房信息卡 ----------

/**
 * GET /dc-overview/room/{id}/summary
 */
export const getRoomSummary = function (id: number | string) {
  return request(`/api/takin/dc-overview/room/${id}/summary`, {
    method: RequestMethod.Get,
  });
};

// ---------- 6.3 查询机柜组信息卡 ----------

/**
 * GET /dc-overview/cabinet-group/{id}/summary
 */
export const getCabinetGroupSummary = function (id: number | string) {
  return request(`/api/takin/dc-overview/cabinet-group/${id}/summary`, {
    method: RequestMethod.Get,
  });
};

// ---------- 6.4 查询设备类型统计 ----------

/**
 * 机房/机柜组/机柜三层信息卡旁的设备类型统计卡共用
 * GET /dc-overview/device-type-stats
 * 三选一，优先级：cabinet_id > group_id > room_id
 */
export const getDeviceTypeStats = function (params: {
  room_id?: number;
  group_id?: number;
  cabinet_id?: number;
}) {
  return request('/api/takin/dc-overview/device-type-stats', {
    method: RequestMethod.Get,
    params: {
      ...(params.room_id ? { room_id: params.room_id } : {}),
      ...(params.group_id ? { group_id: params.group_id } : {}),
      ...(params.cabinet_id ? { cabinet_id: params.cabinet_id } : {}),
    },
  });
};

// ---------- 6.5 查询机柜信息卡 ----------

/**
 * U 位视图/U 位列表/U 位变更记录三个页签的信息卡共用
 * GET /dc-overview/cabinet/{id}/summary
 */
export const getCabinetSummary = function (id: number | string) {
  return request(`/api/takin/dc-overview/cabinet/${id}/summary`, {
    method: RequestMethod.Get,
  });
};

// ---------- 6.6 查询机柜 U 位列表 ----------

/**
 * 按"区段"返回：已占用/故障一台资产跨多 U 合并一行（一个区段），
 * 预留一个预留区段一行，空闲/禁用逐 U 位一行；按起始 U 升序。
 * 状态筛选/分页由前端处理
 * GET /dc-overview/cabinet/{id}/u-list
 */
export const getCabinetUList = function (id: number | string) {
  return request(`/api/takin/dc-overview/cabinet/${id}/u-list`, {
    method: RequestMethod.Get,
  });
};

// ---------- 6.7 占用 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-occupy
 * 自动登记机房资产（未登记才登记）→ 写占用记录 → 更新格子状态；全程事务
 */
export const occupyU = function (data: {
  cabinet_id: number;
  monitoring_asset_id: number;
  business_group_name: string;
  start_u: number;
  u_height: number;
  owner_name: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-occupy', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.8 释放 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-release
 * 按机柜+起始 U 定位生效占用区段；故障位随区段一并释放
 */
export const releaseU = function (data: {
  cabinet_id: number;
  start_u: number;
  reason: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-release', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.9 预留 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-reserve
 */
export const reserveU = function (data: {
  cabinet_id: number;
  start_u: number;
  u_height: number;
  reason: string;
  owner_name: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-reserve', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.10 取消预留 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-reserve-cancel
 */
export const cancelReserveU = function (data: {
  cabinet_id: number;
  start_u: number;
  reason?: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-reserve-cancel', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.11 禁用 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-disable
 * 只能禁用空闲 U 位（占用/预留/故障状态不可禁用）
 */
export const disableU = function (data: {
  cabinet_id: number;
  start_u: number;
  u_height: number;
  reason: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-disable', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.12 启用 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-enable
 * 校验区间全为禁用态 → 格子回 FREE 并清除禁用说明
 */
export const enableU = function (data: {
  cabinet_id: number;
  start_u: number;
  u_height: number;
}) {
  return request('/api/takin/dc-overview/cabinet/u-enable', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.13 迁移 U 位 ----------

/**
 * POST /dc-overview/cabinet/u-migrate
 * 支持同柜/跨柜，同柜迁移允许新旧段部分重叠；新高度默认沿用原高度
 */
export const migrateU = function (data: {
  cabinet_id: number;
  start_u: number;
  target_cabinet_id?: number;
  target_start_u: number;
  target_u_height?: number;
  owner_name?: string;
  reason?: string;
}) {
  return request('/api/takin/dc-overview/cabinet/u-migrate', {
    method: RequestMethod.Post,
    data,
  });
};

// ---------- 6.14 U 位区段可用性校验 ----------

/**
 * 占用/预留弹窗红绿提示：区段是否全空闲、逐 U 位状态明细（纯查询不写库）
 * GET /dc-overview/cabinet/segment-check
 */
export const segmentCheck = function (params: {
  cabinet_id: number;
  start_u: number;
  u_height: number;
}) {
  return request('/api/takin/dc-overview/cabinet/segment-check', {
    method: RequestMethod.Get,
    params,
  });
};

// ---------- 6.15 业务组资产下拉 ----------

/**
 * 占用弹窗"所属业务组→选择资产"级联下拉
 * 列出该业务组下未占用任何 U 位的资产，展示"资产名-IP"
 * GET /dc-overview/assets-by-group?group_id=
 */
export const getAssetsByGroup = function (groupId: number | string) {
  return request('/api/takin/dc-overview/assets-by-group', {
    method: RequestMethod.Get,
    params: { group_id: groupId },
  });
};

// ---------- 6.16 查询在架资产清单 ----------

/**
 * 机房/机柜组/机柜各层"进入"按钮共用：只返回在架（ACTIVE 占用）资产，一台一行
 * GET /dc-overview/assets
 */
export const getOverviewAssets = function (params: {
  room_id?: number;
  group_id?: number;
  cabinet_id?: number;
  device_type?: string;
  p?: number;
  limit?: number;
}) {
  return request('/api/takin/dc-overview/assets', {
    method: RequestMethod.Get,
    params: {
      ...(params.room_id ? { room_id: params.room_id } : {}),
      ...(params.group_id ? { group_id: params.group_id } : {}),
      ...(params.cabinet_id ? { cabinet_id: params.cabinet_id } : {}),
      ...(params.device_type ? { device_type: params.device_type } : {}),
      ...(params.p ? { p: params.p } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
    },
  });
};

// ============================================================
// U 位数据适配层
// 页面组件按"逐 U 位一行"消费（CabinetUSlot 结构），
// 而接口 6.6 按区段返回 —— 此处将区段展开为逐 U 数据，字段对齐组件
// ============================================================

/** 前端 U 位结构（对齐原 mock CabinetUSlot，供 U 位视图/列表/弹窗共用） */
export interface CabinetUSlot {
  id: number;
  cabinet_id: number;
  cabinet_code: string;
  /** U 位编号，如 42 */
  u_position: number;
  status: 'idle' | 'used' | 'reserved' | 'fault' | 'disabled';
  asset_name?: string;
  /** 监控资产 assets.id（用于跳转资产详情） */
  asset_id?: number;
  asset_ip?: string;
  asset_type?: string;
  asset_model?: string;
  /** 所属业务组名称 */
  business_group_name?: string;
  /** 占用U数 */
  occupy_u?: number;
  duty_person?: string;
  update_by?: string;
  update_time?: string;
  reserved_reason?: string;
  disabled_reason?: string;
}

/** 接口状态 → 前端状态 */
const U_STATUS_MAP: Record<USectionRaw['status'], CabinetUSlot['status']> = {
  FREE: 'idle',
  OCCUPIED: 'used',
  RESERVED: 'reserved',
  FAULT: 'fault',
  DISABLED: 'disabled',
};

/**
 * 取机柜 U 位列表（展开为逐 U 位一行，按 U 位号降序：大 U 在上）
 * 参数 extra 用于补齐 cabinet_code（u-list 响应内无该字段时）
 */
export const getCabinetUSlots = async function (
  cabinetId: number | string,
  extra?: { cabinet_code?: string },
): Promise<{ dat: CabinetUSlot[] }> {
  const res = await getCabinetUList(cabinetId);
  if (res?.err) return { dat: [] };
  const data: UListResp | undefined = res?.dat;
  const list = data?.list || [];
  const cabinetCode = extra?.cabinet_code || '';
  const slots: CabinetUSlot[] = [];
  list.forEach((section, sIdx) => {
    for (let u = section.u_start; u <= section.u_end; u++) {
      slots.push({
        id: Number(`${cabinetId}${sIdx}${u}`),
        cabinet_id: data?.cabinet_id || Number(cabinetId),
        cabinet_code: cabinetCode,
        u_position: u,
        status: U_STATUS_MAP[section.status] || 'idle',
        asset_name: section.asset_name || undefined,
        asset_id: section.asset_id || undefined,
        asset_ip: section.asset_ip || undefined,
        asset_type: section.device_type || undefined,
        asset_model: section.model_name || undefined,
        business_group_name: section.business_group_name || undefined,
        occupy_u: section.u_height || undefined,
        duty_person: section.owner_name || undefined,
        update_by: section.updated_by || undefined,
        update_time: section.updated_at || undefined,
        reserved_reason: section.status === 'RESERVED' ? (section.note || undefined) : undefined,
        disabled_reason: section.status === 'DISABLED' ? (section.note || undefined) : undefined,
      });
    }
  });
  // 大 U 在上（机柜从下往上编号，视图从顶部 U_x 开始）
  slots.sort((a, b) => b.u_position - a.u_position);
  return { dat: slots };
};

/**
 * U 位变更记录：后端暂无查询接口（6.17），本期不开发
 * 所有写操作均落 dc_u_operation_log 日志表
 */
