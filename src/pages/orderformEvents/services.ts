import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

export function getEvents(params) {
  return request('/api/n9e/alert-his-events/list', {
    method: RequestMethod.Get,
    params,
  });
}


export function solveEvents(id,data) {
  return request('/api/n9e/alert-his-event/solve/'+id, {
    method: RequestMethod.Post,
    data,
  });
}

export function closeEvents(id,data) {
  return request('/api/n9e/alert-his-event/close/'+id, {
    method: RequestMethod.Post,
    data,
  });
}

