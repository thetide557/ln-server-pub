import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

export function getEvents(params) {
  let url = '/api/takin/alert-events/list/xh';
  if (import.meta.env.VITE_IS_PRO === 'true') {
    url = '/api/takin/alert-events/list/xh';
  }
  return request(url, {
    method: RequestMethod.Get,
    params,
  });
}
