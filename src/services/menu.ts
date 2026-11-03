import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

export const downloadTemplet = function (url,params?: any) {
  return request(url, {
    method: RequestMethod.Get,
    params: params || {},
    responseType: 'blob',
  });
};