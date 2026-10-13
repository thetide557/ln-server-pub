import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ============================================================
// 机房相关 API —— 对接接口文档 2.x
// 接口前缀：/api/takin
// ============================================================

/**
 * 查询机房列表（分页）
 * GET /dc-room/list
 * 参数：p(页码,默认1)、limit(每页条数,默认20)、query(关键字,模糊匹配机房名称或编码)
 */
export const getRoomList = function (params: any = {}) {
  const { p = 1, limit = 20, query } = params;
  return request('/api/takin/dc-room/list', {
    method: RequestMethod.Get,
    params: {
      p,
      limit,
      ...(query ? { query } : {}),
    },
  });
};

/**
 * 查询所有机房（下拉用，不分页）
 * GET /dc-room/all
 */
export const getRoomAll = function () {
  return request('/api/takin/dc-room/all', {
    method: RequestMethod.Get,
  });
};

/**
 * 查询单个机房
 * GET /dc-room/{id}
 * 机房不存在时返回 HTTP 404 + 纯文本
 */
export const getRoomDetail = function (id: number | string) {
  return request(`/api/takin/dc-room/${id}`, {
    method: RequestMethod.Get,
  });
};

/**
 * 新增机房
 * POST /dc-room
 * 机房编码全局唯一（含已删除记录）
 * image_url 必填，需先调 uploadRoomPicture 上传图片拿到路径
 */
export const addRoom = function (data: any) {
  return request('/api/takin/dc-room', {
    method: RequestMethod.Post,
    data,
  });
};

/**
 * 上传机房图片
 * POST /dc-room/picture
 * Content-Type: multipart/form-data
 * 表单参数：file（bmp/jpeg/jpg/png，≤5MB）
 * 返回 dat：图片存储路径字符串
 */
export const uploadRoomPicture = function (file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/takin/dc-room/picture', {
    method: RequestMethod.Post,
    data: formData,
  });
};

/**
 * 编辑机房（整体覆盖更新，须提交全字段）
 * PUT /dc-room
 * 编码唯一性校验会排除自身
 */
export const updateRoom = function (data: any) {
  return request('/api/takin/dc-room', {
    method: RequestMethod.Put,
    data,
  });
};

/**
 * 删除机房（软删除）
 * DELETE /dc-room/{id}
 * 文档提示：后端未做强校验子数据，建议前端做子数据提示
 */
export const deleteRoom = function (id: number | string) {
  return request(`/api/takin/dc-room/${id}`, {
    method: RequestMethod.Delete,
  });
};

/**
 * Excel 导入机房
 * POST /dc-room/import-xls
 * Content-Type: multipart/form-data
 * 表单参数：file（按模板填写的 Excel 文件）
 * 响应 dat：成功导入的条数（int）
 */
export const importRoomExcel = function (file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/takin/dc-room/import-xls', {
    method: RequestMethod.Post,
    data: formData,
  });
};

/**
 * 导出机房
 * POST /dc-room/export-xls
 * Query: query(模糊匹配机房名称或编码)
 * 返回：Excel 文件流
 */
export const exportRoomExcel = function (params: any = {}) {
  return request('/api/takin/dc-room/export-xls', {
    method: RequestMethod.Post,
    params,
    responseType: 'blob',
  });
};

/**
 * 导出机房导入模板
 * POST /dc-room/templet
 * 无参数，返回 Excel 模板文件流（含表头与必填说明）
 */
export const downloadRoomTemplate = function () {
  return request('/api/takin/dc-room/templet', {
    method: RequestMethod.Post,
    responseType: 'blob',
  });
};
