import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

export interface PlatformMetricsParams {
  groupIds?: string;
}

export function getPlatformMetrics(params?: PlatformMetricsParams) {
  return request('/api/takin/dashboard/platformMetrics', {
    method: RequestMethod.Get,
    params,
  });
}

export function getUserFunctionTop() {
  return request('/api/takin/dashboard/user/function/top', {
    method: RequestMethod.Get,
  });
}

export function recordUserFunctionClick(moduleName: string) {
  return request('/api/takin/dashboard/user/function/click', {
    method: RequestMethod.Post,
    data: {
      module_name: moduleName,
    },
    silence: true,
  });
}
