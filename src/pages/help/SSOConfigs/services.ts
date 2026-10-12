import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { SSOConfigType } from './types';

export const getSSOConfigs = function (): Promise<SSOConfigType[]> {
  return request('/api/takin/sso-configs', {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat || [];
  });
};

export const putSSOConfig = function (data: SSOConfigType) {
  return request('/api/takin/sso-config', {
    method: RequestMethod.Put,
    data,
  }).then((res) => {
    return res.dat || [];
  });
};
