/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at *
 * http://www.apache.org/licenses/LICENSE-2.0 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { json2csv } from 'json-2-csv';
//添加资产
export const insertAsset = function (data) {
  return request('/api/n9e/asset-basic', {
    method: RequestMethod.Post,
    data,
  });
};

export const insertAssetAlert = function (data) {
  return request('/api/n9e/asset-alter', {
    method: RequestMethod.Post,
    data,
  });
};

export const insertAssetMaintenance = function (data) {
  return request('/api/n9e/asset-maintenance', {
    method: RequestMethod.Post,
    data,
  });
};

export const updateAssetMaintenance = function (data) {
  return request('/api/n9e/asset-maintenance', {
    method: RequestMethod.Put,
    data,
  });
};

export const insertAssetManagement = function (data) {
  return request('/api/n9e/asset-management', {
    method: RequestMethod.Post,
    data,
  });
};

export const insertDeviceOnline = function (data) {
  return request('/api/n9e/device-online', {
    method: RequestMethod.Post,
    data,
  });
};

export const deleteDeviceOnline = function (data) {
  return request('/api/n9e/asset-basic/del', {
    method: RequestMethod.Post,
    data,
  });
};

export const updateAssetManagement = function (data) {
  return request('/api/n9e/asset-management', {
    method: RequestMethod.Put,
    data,
  });
};

export const getAssetTableByTypeAndId = function (type, id) {
  if (type === 'maintenance') {
    return request('/api/n9e/asset-maintenance/asset?asset=' + id, {
      method: RequestMethod.Get,
    });
  } else if (type === 'management') {
    return request('/api/n9e/asset-management/asset?asset=' + id, {
      method: RequestMethod.Get,
    });
  }
  return {} as any;
};

export const getAssetAlerts = function (params) {
  return request('/api/n9e/asset-alter/asset', {
    method: RequestMethod.Get,
    params,
  });
};
//资产统计
export const getAssetStatistic = function () {
  return request('/api/n9e/asset-basic/statistics', {
    method: RequestMethod.Get,
  });
};

export const getAssetsList = function (data) {
  let page = data['page'];
  let limit = data['limit'];
  delete data['limit'];
  delete data['page'];
  return request('/api/n9e/asset-basic/list?limit=' + limit + '&page=' + page, {
    method: RequestMethod.Post,
    data,
  });
};
export const getAssetsListByFilter = function (data) {
  let page = data['page'];
  let limit = data['limit'];
  delete data['limit'];
  delete data['page'];
  return request('/api/n9e/asset-basic/list/query?limit=' + limit + '&page=' + page, {
    method: RequestMethod.Post,
    data,
  });
};
//获取资产树 包含：设备类型，厂商，资产信息
export const getAssetsTree = function (status) {
  return request('/api/n9e/asset-tree/data', {
    method: RequestMethod.Get,
    params: {
      status,
    },
  });
};
//asset-basic
export const exportAssetTemplet = function () {
  return request('/api/n9e/asset-basic/templet', {
    method: RequestMethod.Post,
    responseType: 'blob',
  });
};
export const exportTemplet = function (url, data, params?: any) {
  return request(url, {
    method: RequestMethod.Post,
    params: params || {},
    data,
    responseType: 'blob',
  });
};
export const importAssetSetData = function (url, data) {
  return request(url, {
    headers: {
      enctype: 'multipart/form-data',
    },
    body: data,
    method: RequestMethod.Post,
  });
};
export const importtAssets = function (data) {
  return request('/api/n9e/asset-basic/import-xls', {
    headers: {
      enctype: 'multipart/form-data',
    },
    body: data,
    method: RequestMethod.Post,
  });
};

//获取资产 《POST 参数》
export const queryAboutTable = function (table, data) {
  return request('/api/n9e/asset-basic/table?query=' + table, {
    method: RequestMethod.Post,
    data,
  });
};

//添加扩展 《功能：增删改一体》
export const insertAssetExtends = function (data) {
  return request('/api/n9e/asset-expansion', {
    method: RequestMethod.Put,
    data,
  });
};

//更新资产信息 《主表》
export const updateAsset = function (data) {
  return request('/api/n9e/asset-basic', {
    method: RequestMethod.Put,
    data,
  });
};

export const batchUpdateByProperties = function (data) {
  return request('/api/n9e/asset-basic/batch-update', {
    method: RequestMethod.Post,
    data,
  });
};

//根据资产Id获取资产主表数据
export const getAssetById = function (id) {
  return request('/api/n9e/asset-basic/' + id, {
    method: RequestMethod.Get,
  });
};

export const getAssetTreeByDeviceType = function (deviceType, status) {
  return request('/api/n9e/asset-tree/part', {
    method: RequestMethod.Get,
    params: { type: deviceType, status: status },
  });
};

export const getAssetExtendsById = function (data: {}) {
  return request('/api/n9e/asset-expansion/map', {
    method: RequestMethod.Post,
    data,
  });
};

export const getAssetStatus = function () {
  return request('/api/n9e/assets', {
    method: RequestMethod.Get,
  });
};
