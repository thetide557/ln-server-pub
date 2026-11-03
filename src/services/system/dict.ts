// import { request } from '@umijs/max';
import request from '@/utils/request';
import { DictValueEnumObj } from '@/components/DictTag';
// import { HttpResult } from '@/enums/httpEnum';

/* *
 *
 * @author whiteshader@163.com
 * @datetime  2021/09/16
 *
 * */

// 查询字典类型列表
export async function getDictTypeList(params) {
  return request(`/api/n9e/dict-type/list`, {
    params: {
      ...params,
    },
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}


export async function getDictValueEnum(keys:string) {
  let key = keys.split(",");
  const resp = await  request(`/api/n9e/dict-data/`+key, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
  if(resp.err === "" && key.length==1 ) {
    const opts: DictValueEnumObj[] =[];    
    resp.dat.forEach((item) => {
      opts.push({
        value: item.dict_key,
        label: item.dict_value
      });
    })
    return opts;
  }else if(resp.err === "" && key.length>0){
    let result = {};
    for (let item of resp.dat) {
      if (!(item.type_code in result)) {
        result[item.type_code] = [];
      }
      result[item.type_code].push({
        value: item.dict_key,
        label: item.dict_value
      });
    }
    return result;
  } else {
    return [];
  }
}

export async function getDictDataListByType(code,params?:any){
  return request(`/api/n9e/dict-data/`+code, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}
export async function getDictDataExpByType(params?:any){
  return request(`/api/n9e/dict-data/exp`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    params
  });
}
export async function deleteDictDatas(params) {
  return request('/api/n9e/dict-data/asset-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}



// 新增字典类型
export async function addDictType(params) {
  return request('/api/n9e/dict-type', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

// 修改字典类型

export async function updateDictData(typeCode :string,params :any) {
  return request('/api/n9e/dict-data?typeCode='+typeCode, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}

export async function updateDictType(params) {
  return request('/api/n9e/dict-type', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    data: params
  });
}


// 删除字典类型
export async function removeDictType(ids: string) {
  return request(`/api/n9e/dict-type/${ids}`, {
    method: 'DELETE'
  });
}

// 导出字典类型
export function exportDictType(params) {
  return request('/api/system/dict/type/export', {
    method: 'GET',
    params
  });
}

// 获取字典选择框列表
export async function getDictTypeOptionSelect(params) {
  return request('/api/system/dict/type/optionselect', {
    params: {
      ...params,
    },
    method: 'GET',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}
