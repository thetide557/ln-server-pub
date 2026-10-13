import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ============================================================
// 机柜相关 API —— 对接接口文档 4.x
// 接口前缀：/api/takin
// U 位相关接口已随"机房总览"模块提供，见 dc-overview.ts
// ============================================================

/**
 * 分页查询机柜列表
 * GET /dc-cabinet/list
 * Query: p(页码,默认1)、limit(每页条数,默认20)、room_id、group_id、
 * query_field(可选查询维度：cabinet_name按名称模糊查/cabinet_code按编号模糊查/
 * owner_name按责任人模糊查，支持逗号拼接多责任人；不传默认all，编号或名称任一匹配)、
 * query(关键字，配合 query_field 使用)
 */
export const getCabinetPageList = function (params: any = {}) {
  const { p = 1, limit = 20, room_id, group_id, query_field, query } = params;
  return request('/api/takin/dc-cabinet/list', {
    method: RequestMethod.Get,
    params: {
      p,
      limit,
      ...(room_id ? { room_id } : {}),
      ...(group_id ? { group_id } : {}),
      ...(query_field ? { query_field } : {}),
      ...(query ? { query } : {}),
    },
  });
};

/**
 * 查询所有机柜（下拉用，不分页）
 * GET /dc-cabinet/all
 */
export const getCabinetAll = function () {
  return request('/api/takin/dc-cabinet/all', {
    method: RequestMethod.Get,
  });
};

/**
 * 查询单个机柜
 * GET /dc-cabinet/{id}
 */
export const getCabinetDetail = function (id: number | string) {
  return request(`/api/takin/dc-cabinet/${id}`, {
    method: RequestMethod.Get,
  });
};

/**
 * 新增机柜
 * POST /dc-cabinet
 * 校验：编号唯一（含已删除）、机柜组存在且属于所选机房、机房内行列位置唯一
 * 新增成功后自动生成 1..u_capacity 个空闲 U 位记录
 * image_url 必填，需先调 uploadCabinetPicture 上传图片拿到路径
 */
export const addCabinet = function (data: any) {
  return request('/api/takin/dc-cabinet', {
    method: RequestMethod.Post,
    data,
  });
};

/**
 * 编辑机柜（整体覆盖更新，须提交全字段）
 * PUT /dc-cabinet
 */
export const updateCabinet = function (data: any) {
  return request('/api/takin/dc-cabinet', {
    method: RequestMethod.Put,
    data,
  });
};

/**
 * 删除机柜（软删除）
 * DELETE /dc-cabinet/{id}
 * 机柜存在占用/预留/故障 U 位时禁止删除
 */
export const deleteCabinet = function (id: number | string) {
  return request(`/api/takin/dc-cabinet/${id}`, {
    method: RequestMethod.Delete,
  });
};

/**
 * 上传机柜图片
 * POST /dc-cabinet/picture
 * Content-Type: multipart/form-data
 * 表单参数：file（bmp/jpeg/jpg/png，≤5MB）
 * 返回 dat：图片存储路径字符串
 */
export const uploadCabinetPicture = function (file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/takin/dc-cabinet/picture', {
    method: RequestMethod.Post,
    data: formData,
  });
};

/**
 * Excel 导入机柜
 * POST /dc-cabinet/import-xls
 * Content-Type: multipart/form-data
 * 表单参数：file（按模板填写的 Excel 文件）
 * 返回 dat：成功导入条数（int）
 */
export const importCabinetExcel = function (file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/takin/dc-cabinet/import-xls', {
    method: RequestMethod.Post,
    data: formData,
  });
};

/**
 * 导出机柜
 * POST /dc-cabinet/export-xls
 * Query: room_id、group_id、query_field、query
 * 返回：Excel 文件流
 */
export const exportCabinetExcel = function (params: any = {}) {
  return request('/api/takin/dc-cabinet/export-xls', {
    method: RequestMethod.Post,
    params,
    responseType: 'blob',
  });
};

/**
 * 导出机柜导入模板
 * POST /dc-cabinet/templet
 * 无参数，返回 Excel 模板文件流
 */
export const downloadCabinetTemplate = function () {
  return request('/api/takin/dc-cabinet/templet', {
    method: RequestMethod.Post,
    responseType: 'blob',
  });
};
