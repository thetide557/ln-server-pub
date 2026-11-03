import request from "@/utils/request";
import { RequestMethod } from "@/store/common";

// 获取所有iot设备的类型
export const getIotTypeList = function () {
  return request("/api/n9e/iot/type/list", {
    method: RequestMethod.Get,
  });
};

//   新增设备类型
export const addIotType = function (data) {
  return request("/api/n9e/iot/type", {
    method: RequestMethod.Post,
    data,
  });
};

// 获取字段列表
export const getIotAttributeList = function (params) {
  return request('/api/n9e/iot/attribute/list', {
    method: RequestMethod.Get,
    params,
  });
};

// 获取分页字段配置
export const getIotPage = function (params) {
  return request('/api/n9e/iot/page', {
    method: RequestMethod.Get,
    params,
  });
};

// 分页字段配置
export const IotPageEdit = function (data, typeId) {
  return request(`/api/n9e/iot/page/edit?typeId=${typeId}`, {
    method: RequestMethod.Post,
    data,
  });
};


// 获取资产清单数据
export const getIotDeviceList = function (params) {
  return request('/api/n9e/iot/device/list', {
    method: RequestMethod.Get,
    params,
  });
};

// 获取资产详情
export const getIotDeviceDetail = function (params) {
  return request('/api/n9e/iot/device', {
    method: RequestMethod.Get,
    params,
  });
};

// 获取物联网资产组织树列表
export const getIotTreeList = function () {
  return request('/api/n9e/iot/tree/get', {
    method: RequestMethod.Get,
    // params,
  });
};
// 新增/编辑物联网资产分组
export const addIotTree = function (data) {
  return request('/api/n9e/iot/tree/node', {
    method: RequestMethod.Post,
    data,
  });
};

// 删除物联网资产分组
export const delIotTreeNode = function (params) {
  return request('/api/n9e/iot/tree/node/delete', {
    method: RequestMethod.Post,
    params,
  });
};

// 删除设备类型
export const delIotType = function (data) {
  return request('/api/n9e/iot/type/delete', {
    method: RequestMethod.Post,
    data,
  });
};