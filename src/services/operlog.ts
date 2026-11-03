import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { N9EAPI } from '../../config/constant';
//获取操作日志列表
export const getLogListBasedOnSearch = function (params={}) {
    return request(`/api/n9e/operation-log/filter`, {
      method: RequestMethod.Get,
      params,
    });
  };