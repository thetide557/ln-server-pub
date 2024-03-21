import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { assetsType } from '@/store/assetsInterfaces';

export const getAssets = function (bgid, query, organization_id) {
  return request('/api/n9e/assets', {
    method: RequestMethod.Get,
    params: {
      bgid,
      query,
      organization_id,
    },
  });
};
export const getAssetsByCondition = function (params) {
  return request('/api/n9e/xh/assets/filter', {
    method: RequestMethod.Get,
    params,
  });
  // return request("/api/n9e/assets", {
  //     method: RequestMethod.Get,
  //     params: {
  //         bgid:1
  //     }
  // })
};

export const getAsset = function (id: string) {
  return request(`/api/n9e/assets/${id}`, {
    method: RequestMethod.Get,
  });
};
export const getXhAsset = function (id: string) {
  return request(`/api/n9e/xh/assets/id?asset=` + id, {
    method: RequestMethod.Get,
  });
};

export const getAssetBoard = function (id: string | number) {
  return request(`/api/n9e/xh/asset/${id}/board`, {
    method: RequestMethod.Get,
  });
};

export const addAsset = function (data: assetsType) {
  return request('/api/n9e/assets', {
    method: RequestMethod.Post,
    data,
  });
};

//针对西航项目
export const insertXHAsset = function (data) {
  return request('/api/n9e/xh/assets', {
    method: RequestMethod.Post,
    data,
  });
};
export const updateXHAsset = function (data) {
  return request('/api/n9e/xh/assets', {
    method: RequestMethod.Put,
    data,
  });
};

export const addXHAssetExpansion = function (data, asset, type) {
  return request('/api/n9e/xh/assets-expansion?asset=' + asset + '&type=' + type, {
    method: RequestMethod.Put,
    data,
  });
};

export const putOptionalMetrics = function (data) {
  return request('/api/n9e/assets/optmetrics', {
    method: RequestMethod.Put,
    data,
  });
};
export const updateAsset = function (data: assetsType) {
  return request('/api/n9e/assets', {
    method: RequestMethod.Put,
    data,
  });
};

//删除
export const deleteAssets = function (data: { ids: string[] }) {
  return request(`/api/n9e/assets`, {
    method: RequestMethod.Delete,
    data,
  });
};

export const deleteXhAssets = function (data: any) {
  return request(`/api/n9e/xh/assets/batch-del`, {
    method: RequestMethod.Post,
    data,
  });
};

//获取默认配置模板
export const getAssetDefaultConfig = function (type: string, data) {
  return request(`/api/n9e/assets/config/default/${type}`, {
    method: RequestMethod.Post,
    data,
  });
};

//获取可用监控探针
export const getAssetsIdents = function () {
  return request('/api/n9e/assets/idents', {
    method: RequestMethod.Get,
  });
};

export const getAssetsMonitor = function (start_at: number, end_at: number, monitorids: number[]) {
  return request('/api/n9e/xh/monitoring/data?start=' + start_at + '&end=' + end_at, {
    method: RequestMethod.Post,
    data: { ids: monitorids },
  });
};

//获取资产类型
export const getAssetstypes = function () {
  return request('/api/n9e/assets/types', {
    method: RequestMethod.Get,
  });
};

export function bindTags(data) {
  return bindOrUnbindTags(true, data);
}

export function unbindTags(data) {
  return bindOrUnbindTags(false, data);
}

// 绑定/解绑标签
export function bindOrUnbindTags(isBind, data) {
  return request(`/api/n9e/assets/tags`, {
    method: isBind ? RequestMethod.Post : RequestMethod.Delete,
    data,
  });
}

// 修改/移出业务组
export function moveTargetBusi(data) {
  return request(`/api/n9e/assets/bgid`, {
    method: RequestMethod.Put,
    data: Object.assign({ bgid: 0 }, data),
  });
}

// 修改对象备注
export function updateTargetNote(data) {
  return request(`/api/n9e/assets/note`, {
    method: RequestMethod.Put,
    data,
  });
}

// 获取监控对象标签列表
export function getAssetsTags(params) {
  return request(`/api/n9e/assets/tags`, {
    method: RequestMethod.Get,
    params,
  });
}

// 修改对象备注
export function updateAssetNote(data) {
  return request(`/api/n9e/assets/note`, {
    method: RequestMethod.Put,
    data,
  });
}

export function getOrganizationTree(data) {
  return request(`/api/n9e/organization`, {
    method: RequestMethod.Get,
    data,
  });
}

export const importXhAssetSetData = function (url, data) {
  return request(url, {
    headers: {
      enctype: 'multipart/form-data',
    },
    body: data,
    method: RequestMethod.Post,
  });
};
export function exportXhAssetSetData(data) {
  return request(`/api/n9e/xh/asset/export-xls`, {
    method: RequestMethod.Post,
    data,
  });
}

export function getAssetDirectoryTree() {
  return request(`/api/n9e/asset-directory/tree`, {
    method: RequestMethod.Get,
  });
}
export function insertAssetDirectoryTree(data) {
  return request(`/api/n9e/asset-directory`, {
    method: RequestMethod.Post,
    data,
  });
}
export function deleteAssetDirectoryTree(id: any) {
  return request(`/api/n9e/asset-directory/` + id, {
    method: RequestMethod.Delete,
  });
}
export function updateAssetDirectoryTree(params) {
  return request(`/api/n9e/asset-directory`, {
    method: RequestMethod.Put,
    params,
  });
}

export function moveAssetDirectoryTree(params) {
  return request(`/api/n9e/asset-directory/move`, {
    method: RequestMethod.Get,
    params,
  });
}

export function getOrganizationsByIds(data) {
  return request(`/api/n9e/organization/name`, {
    method: RequestMethod.Post,
    data,
  });
}
export const addOrganization = function (data) {
  return request('/api/n9e/organization', {
    method: RequestMethod.Post,
    data,
  });
};

//修改
export const updateOrganization = function (data) {
  return request(`/api/n9e/organization`, {
    method: RequestMethod.Put,
    data,
  });
};
//删除
export const deleteOrganization = function (id) {
  return request(`/api/n9e/organization/${id}`, {
    method: RequestMethod.Delete,
  });
};

//修改资产所属组织
export const changeAssetOrganization = function (data) {
  return request(`/api/n9e/assets/orgnazation`, {
    method: RequestMethod.Put,
    data,
  });
};

// 获取指标列表
export const getMonitoringOptions = function () {
  return request(`/api/n9e/monitoring/options`, {
    method: RequestMethod.Get,
  });
};
