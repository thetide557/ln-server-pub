import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { N9EAPI } from '../../config/constant';
//获取操作日志列表
export const getSysLogListBasedOnSearch = function (params={}) {
    return request(`/api/n9e/xh/sys-log/filter`, {
      method: RequestMethod.Get,
      params,
    });
  };
export const getSysLogList = function (params={}) {
  return request(`/api/n9e/xh/sys-log/list`, {
    method: RequestMethod.Get,
    params,
  });
};