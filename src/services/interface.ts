import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { N9EAPI } from '../../config/constant';

//根据输入密码获取密钥
export const getPwInfo = function (cipher:any) {
  return request(`/api/n9e/xh/api-manager/${cipher}`, {
        method: RequestMethod.Get,
    });
  };
//保存IP和密码
export const saveInterfaces = function (data:any) {
    return request('/api/n9e/xh/api-manager/save', {
      method: RequestMethod.Post,
      data
    });
  };
//获得回显上次保存的输入
export const getIpPwInfo = function () {
  return request(`/api/n9e/xh/api-manager/show`, {
        method: RequestMethod.Get,
    });
  };