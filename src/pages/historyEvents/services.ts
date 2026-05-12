import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

export function getEvents(params) {
  return request('/api/takin/alert-events/list/xh', {
    method: RequestMethod.Get,
    params,
  });
}
export const exportTemplet = function (url,params,body) {
  return request(url, {
    method: RequestMethod.Post,
    params,
    data:body || {},
    responseType:"blob"
  });
}
export const exportTempletZip = function (url,params,body) {
  return request(url, {
    method: RequestMethod.Post,
    data:body || {},
    params,
    responseType:'blob'
  });
}
export function deleteHistoryEvents(data: any) {
  return request('/api/takin/alert-his-events/batch-del', {
    method: RequestMethod.Post,
    data:{ids:data}
  });
}

