import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { N9EAPI } from '../../config/constant';
//获取license通知设置
export const getLicense = function (params={}) {
    return request(`/api/n9e/xh/license-config`, {
      method: RequestMethod.Get,
      params,
    });
  };
//保存license通知设置
export const saveLicense = function (data:any) {
  return request('/api/n9e/xh/license-config', {
    method: RequestMethod.Post,
    data
  });
};
//更新license通知设置
export const updateLicense = function (data:any) {
  return request('/api/n9e/xh/license-config', {
    method: RequestMethod.Put,
    data
  });
};
//上传证书
export const saveCertificate = function (data:any) {
  return request('/api/n9e/xh/license/add-file', {
    method: RequestMethod.Post,
    data
  });
};
//更新证书
export const updateCertificate = function (data:any) {
  return request('/api/n9e/xh/license/update', {
    method: RequestMethod.Put,
    data
  });
};
//获取证书列表
export const getCertificate = function (params={}) {
  return request(`/api/n9e/xh/license/list`, {
    method: RequestMethod.Get,
    params,
  });
};
//上传证书
export const uploadLicense = function (url,data) {
  return request(url, {
    headers: {
       "enctype": "multipart/form-data"
    },
    body:data,
    method: RequestMethod.Put   
  });
}