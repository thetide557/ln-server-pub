import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// ============================================================
// 机柜组相关 API
// 接口文档：数据中心管理模块接口文档 - 机房/机柜组/机柜.docx（3.x 章节）
// 统一响应：{ dat, err }，err 为空表示成功
// ============================================================

/**
 * 查询机柜组列表（分页）
 * GET /dc-cabinet-group/list
 * 参数：p(页码，默认1)、limit(每页条数，默认20)、room_id(所属机房ID，0或不传不过滤)、
 *      query(关键字，模糊匹配)、query_field(查询维度，可选)：
 *        - group_code：按机柜组编号模糊查（默认，不传也兼容）
 *        - group_type：按机柜组类型模糊查
 *        - all：编号或类型任一匹配
 */
export const getCabinetGroupList = function (params: any = {}) {
  return request('/api/takin/dc-cabinet-group/list', {
    method: RequestMethod.Get,
    params,
  });
};

/**
 * 查询所有机柜组（下拉用，不分页）
 * GET /dc-cabinet-group/all
 */
export const getCabinetGroupAll = function () {
  return request('/api/takin/dc-cabinet-group/all', {
    method: RequestMethod.Get,
  });
};

/**
 * 查询单个机柜组
 * GET /dc-cabinet-group/{id}
 * 注意：本接口不 JOIN 机房名称，room_name 为空字符串
 */
export const getCabinetGroupDetail = function (id: number | string) {
  return request('/api/takin/dc-cabinet-group/' + id, {
    method: RequestMethod.Get,
  });
};

/**
 * 新增机柜组
 * POST /dc-cabinet-group
 * 方向规则：orientation=ROW 需填 row_no/start_col_no/end_col_no；
 *          orientation=COLUMN 需填 col_no/start_row_no/end_row_no
 */
export const addCabinetGroup = function (data: any) {
  return request('/api/takin/dc-cabinet-group', {
    method: RequestMethod.Post,
    data,
  });
};

/**
 * 编辑机柜组（整体覆盖更新，须提交 id 与全部字段）
 * PUT /dc-cabinet-group
 */
export const updateCabinetGroup = function (data: any) {
  return request('/api/takin/dc-cabinet-group', {
    method: RequestMethod.Put,
    data,
  });
};

/**
 * 删除机柜组（软删除）
 * DELETE /dc-cabinet-group/{id}
 * 约束：机柜组下存在未删除的机柜时禁止删除
 */
export const deleteCabinetGroup = function (id: number | string) {
  return request('/api/takin/dc-cabinet-group/' + id, {
    method: RequestMethod.Delete,
  });
};

/**
 * Excel 导入机柜组
 * POST /dc-cabinet-group/import-xls
 * Content-Type: multipart/form-data，表单字段：file
 * 响应 dat：成功导入条数（int）
 */
export const importCabinetGroupExcel = function (file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/takin/dc-cabinet-group/import-xls', {
    headers: {
      enctype: 'multipart/form-data',
    },
    body: formData,
    method: RequestMethod.Post,
  });
};

/**
 * Excel 导出机柜组
 * POST /dc-cabinet-group/export-xls
 * Query 参数：room_id(所属机房ID)、query(模糊匹配机柜组编号)
 * 响应：Excel 文件流
 */
export const exportCabinetGroupExcel = function (params: any = {}) {
  return request('/api/takin/dc-cabinet-group/export-xls', {
    method: RequestMethod.Post,
    params,
    responseType: 'blob',
  });
};

/**
 * 导出机柜组导入模板
 * POST /dc-cabinet-group/templet
 * 无参数，返回 Excel 文件流（含表头与必填说明）
 */
export const downloadCabinetGroupTemplate = function () {
  return request('/api/takin/dc-cabinet-group/templet', {
    method: RequestMethod.Post,
    responseType: 'blob',
  });
};
