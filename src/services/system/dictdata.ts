import request from '@/utils/request';
// 查询字典数据列表
export async function getDictDataList(
  params?,
  options?: { [key: string]: any },
) {
  return request('/api/system/dict/data/list', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params,
    ...(options || {}),
  });
}

// 查询字典数据详细
export function getDictData(dictCode: number, options?: { [key: string]: any }) {
  return request(`/api/system/dict/data/${dictCode}`, {
    method: 'GET',
    ...(options || {}),
  });
}
export async function updateDictDataSingle(params, options?: { [key: string]: any }) {
  return request('/api/n9e/dict-data/one', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}

export async function addDictDataBySingle(params, options?: { [key: string]: any }) {
  return request('/api/n9e/dict-data/one', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}
// 新增字典数据
export async function addDictData(params, options?: { [key: string]: any }) {
  return request('/api/n9e/dict-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}

// 修改字典数据
export async function updateDictData(params, options?: { [key: string]: any }) {
  return request('/api/n9e/dict-data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params,
    ...(options || {}),
  });
}

// 删除字典数据
export async function removeDictData(ids: string, options?: { [key: string]: any }) {
  return request(`/api/system/dict/data/${ids}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

// 导出字典数据
export function exportDictData(
  params?,
  options?: { [key: string]: any },
) {
  return request(`/api/system/dict/data/export`, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}
