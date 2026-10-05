// 2026-10-05 N16 摞二：逐字抄自 fe main ee48e701 同路径；后端 v2 照搬上游，前端跟上游单轨（用户拍板 77 / M229 ⑤）。
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { N9E_PATHNAME } from '@/utils/constant';

import type { DashboardQueryRequest, DashboardQueryResponse } from './types';

export function fetchDashboardQuery(data: DashboardQueryRequest, signal?: AbortSignal): Promise<DashboardQueryResponse> {
  return request(`/api/${N9E_PATHNAME}/v2/query-batch`, {
    method: RequestMethod.Post,
    data,
    signal,
    silence: true,
  }).then((response) => response?.dat ?? response);
}
