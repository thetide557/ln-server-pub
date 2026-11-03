import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import _ from 'lodash';
import { BaseParams } from './types';
import { QUERY_KEY } from './constants';

export function getDatabases(data: BaseParams): Promise<string[]> {
  return request('/api/n9e/db-databases', {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat || [];
  });
}

export function getTables(
  data: BaseParams & {
    query: string[];
  },
): Promise<string[]> {
  return request('/api/n9e/db-tables', {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat || [];
  });
}

export function getColumns(
  data: BaseParams & {
    query: {
      database: string;
      table: string;
    }[];
  },
): Promise<
  {
    field: string;
    type: string;
    type2: string;
  }[]
> {
  return request('/api/n9e/db-desc-table', {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat || [];
  });
}

export function getDsQuery(
  data: BaseParams & {
    query: {
      [QUERY_KEY]: string;
      from: number;
      to: number;
      keys: {
        valueKey: string;
        labelKey: string;
      };
    }[];
  },
): Promise<any> {
  return request('/api/n9e/ds-query', {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat || [];
  });
}

export function getLogsQuery(data: {
  queries: {
    ds_cate: string;
    ds_id: number;
    ref: string;
    query: {
      ref: string;
      from: number;
      to: number;
      [QUERY_KEY]: string;
    };
  }[];
}): Promise<
  {
    ds_cate: string;
    ds_id: number;
    ref: string;
    data: { [index: string]: string | number }[];
  }[]
> {
  return request('/api/n9e/log-query-batch', {
    method: RequestMethod.Post,
    data,
    silence: true,
  }).then((res) => {
    return res?.dat?.list || [];
  });
}

// 2026-10-05 N16 摞二：仪表盘已改发 /api/n9e/v2/query-batch（Renderer/datasource/queryBatchV2.ts），
// 本函数的 商业版 query-batch（/api/n9e-plus/ 前缀） 羚牛后端不补（用户拍板 77 / M229 ⑤），仪表盘路径不再调用；保留与上游同形、不删。
export const getDsQuery2 = function (data: {
  queries: {
    ref: string;
    ds_id: number;
    ds_cate: string;
    query: {
      from: number;
      to: number;
      [QUERY_KEY]: string;
      keys: {
        valueKey: string;
        labelKey: string;
      };
    };
  }[];
  exps: {
    ref: string;
    expr: string;
  }[];
}): Promise<
  {
    metric: { [index: string]: string };
    values: [number, number][];
  }[]
> {
  return request('/api/n9e-plus/query-batch', {
    method: RequestMethod.Post,
    data,
    silence: true,
  }).then((res) => res.dat);
};
