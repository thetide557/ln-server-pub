/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import _ from 'lodash';
import { mappingsToFields, mappingsToFullFields, flattenHits, Field, typeMap, Filter } from './utils';
import { N9E_PATHNAME } from '@/utils/constant';
export type { Field, Filter };
export { typeMap };

export function getIndices(datasourceValue: number, allow_hide_system_indices = false) {
  const params: any = {
    format: 'json',
    s: 'index',
  };
  if (allow_hide_system_indices) {
    params.expand_wildcards = 'all';
  }
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_cat/indices`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => {
    return _.sortBy(_.compact(_.map(res, 'index')));
  });
}

export function getFullIndices(datasourceValue: number, target = '*', allow_hide_system_indices = false, crossClusterEnabled = false) {
  const params: any = {
    format: 'json',
    s: 'index',
  };
  if (crossClusterEnabled) {
    return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_field_caps`, {
      method: RequestMethod.Get,
      params: {
        fields: '*',
        index: target,
      },
      silence: true,
    }).then((res) => {
      return _.map(_.get(res, 'indices'), (name) => {
        return {
          index: name,
          uuid: name,
        };
      });
    });
  } else {
    if (allow_hide_system_indices) {
      params.expand_wildcards = 'all';
    }
    return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_cat/indices/${target}`, {
      method: RequestMethod.Get,
      params,
      silence: true,
    }).then((res) => {
      return res;
    });
  }
}

export function getFields(datasourceValue: number, index?: string, type?: string, allow_hide_system_indices = false) {
  const url = index ? `/${index}/_mapping` : '/_mapping';
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}${url}`, {
    method: RequestMethod.Get,
    params: _.omit(
      {
        expand_wildcards: 'all',
        pretty: true,
      },
      allow_hide_system_indices ? [] : ['expand_wildcards'],
    ),
    silence: true,
  }).then((res) => {
    return {
      allFields: mappingsToFields(res),
      fields: type ? mappingsToFields(res, type) : [],
    };
  });
}

export function getFullFields(
  datasourceValue: number,
  index?: string,
  options: {
    type?: string;
    allowHideSystemIndices?: boolean;
    includeSubFields?: boolean;
    crossClusterEnabled?: boolean;
  } = {
    allowHideSystemIndices: false,
    includeSubFields: false,
    crossClusterEnabled: false,
  },
) {
  if (options.crossClusterEnabled) {
    return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_field_caps`, {
      method: RequestMethod.Get,
      params: {
        fields: '*',
        index,
      },
      silence: true,
    }).then((res) => {
      const allFields = _.map(_.get(res, 'fields'), (fieldObject, name) => {
        const keys = _.keys(fieldObject);
        return {
          name: name,
          type: keys[0],
        };
      });
      return {
        allFields,
        fields: options.type ? _.filter(allFields, { type: options.type }) : [],
      };
    });
  } else {
    const url = index ? `/${index}/_mapping` : '/_mapping';

    return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}${url}`, {
      method: RequestMethod.Get,
      params: _.omit(
        {
          expand_wildcards: 'all',
          pretty: true,
        },
        options.allowHideSystemIndices ? [] : ['expand_wildcards'],
      ),
      silence: true,
    }).then((res) => {
      return {
        allFields: _.unionBy(
          mappingsToFullFields(res, {
            includeSubFields: options.includeSubFields,
          }),
          (item) => {
            return item.name + item.type;
          },
        ),
        fields: options.type
          ? _.unionBy(
              mappingsToFullFields(res, {
                type: options.type,
                includeSubFields: options.includeSubFields,
              }),
              (item) => {
                return item.name + item.type;
              },
            )
          : [],
      };
    });
  }
}

const queryControllerMap = new Map();

export function getLogsQuery(datasourceValue: number, requestBody: any, requestId: string) {
  if (queryControllerMap.has(requestId)) {
    queryControllerMap.get(requestId).abort();
    queryControllerMap.delete(requestId);
  }

  const controller = new AbortController();
  queryControllerMap.set(requestId, controller);
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  })
    .then((res) => {
      // ---- 羚牛补丁（来源 pub 提交 50763f9「修复监控日志-即时查询不同索引根据过滤条件检视数据不更新问题」，2025-07-11）。
      // 本文件按 fe v9.1.0 整体覆盖，这一处是覆盖后手工贴回来的。上游到 v9.1.0 仍写成：
      //   const dat = _.get(res, 'responses[0].hits');
      //   const { docs } = flattenHits(dat.hits);
      //   total: dat.total.value ?? dat.total,
      // 查询返回为空时 responses[0].hits 是 undefined，取 dat.hits 会直接抛错。
      // total 在 ES 6.x 是数字、7.x 起是 { value, relation } 对象，两种都要接住
      //（羚牛原补丁只处理了对象那种、数字那种会被算成 0，这里补上 else 分支，等于把上游的 `?? dat.total` 也留着）。
      // ---- 阶段 II W0 小修③（判定门 G8 第三节、主 session 拍板 M38）：兜底之前先看 ES 有没有报错。
      // `/_msearch` 出错时 HTTP 仍是 200，错误装在 responses[0].error 里；而 pub 的 request.ts:106-111
      // 对 /api/n9e/proxy 这类地址是「HTTP 200 就原样返回、不查任何错误字段」，所以这里不主动判，
      // 下面的兜底会把它当成「查到 0 条」，页面显示「暂无数据」、错误横幅还被 index.tsx:291 清空，
      // ES 说的真实原因（比如排序字段不存在）一个字都看不到。上游 fe v9.1.0 / main 至今也没判 error
      //（那边是 dat.hits 直接抛 TypeError，报错但文案难看），属「未查到官方修复」，本条是羚牛自加。
      // reason 优先取 root_cause[0].reason：ES 顶层 reason 常是「all shards failed」这种没信息量的话，
      // 真正原因在 root_cause 里，先给具体的。
      const esError = _.get(res, 'responses[0].error');
      if (esError) {
        throw new Error(_.get(esError, 'root_cause[0].reason') || _.get(esError, 'reason') || JSON.stringify(esError));
      }
      const dat = _.get(res, 'responses[0].hits', { hits: [], total: 0 });
      const { docs } = flattenHits(dat.hits || []);
      let total = 0;
      if (typeof dat.total === 'object' && dat.total !== null) {
        total = dat.total.value || 0;
      } else {
        total = dat.total || 0;
      }
      return {
        total,
        list: docs,
      };
    })
    .finally(() => {
      if (queryControllerMap.has(requestId)) {
        queryControllerMap.delete(requestId);
      }
    });
}

export function getDsQuery(datasourceValue: number, requestBody) {
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    const dat = _.get(res, 'responses[0].aggregations.A.buckets');
    return dat;
  });
}

export function getESVersion(datasourceValue: number) {
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/`, {
    method: RequestMethod.Get,
  }).then((res) => {
    const dat = _.get(res, 'version.number');
    return dat;
  });
}

export function getFieldValues(datasourceValue, requestBody, field, n = 5) {
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    const hits = _.get(res, 'responses[0].hits.hits');
    let values: string[] = [];
    _.forEach(hits, (hit) => {
      const value = _.get(hit, ['fields', field]);
      if (value) {
        values = _.concat(values, value);
      }
    });
    const uniqueValues = _.union(values);

    return _.slice(
      _.orderBy(
        _.map(uniqueValues, (value) => {
          return {
            label: value,
            value: _.filter(values, (v) => v === value).length / values.length,
          };
        }),
        ['value'],
        ['desc'],
      ),
      0,
      n,
    );
  });
}

export function getFieldTopTerms(
  datasourceValue: number,
  requestBody: any,
  params: {
    aggName?: string;
    field: string;
    size: number;
  },
) {
  const aggName = params.aggName || `top${params.size}_${String(params.field).replace(/[^A-Za-z0-9_]/g, '_')}`;
  return request(`/api/${N9E_PATHNAME}/proxy/${datasourceValue}/_msearch`, {
    method: RequestMethod.Post,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    const resp = _.get(res, 'responses[0]');
    const total = _.get(resp, 'hits.total.value') ?? _.get(resp, 'hits.total') ?? 0;
    const buckets = _.get(resp, ['aggregations', aggName, 'buckets'], []);
    return _.map(buckets, (b) => {
      const docCount = _.get(b, 'doc_count', 0);
      return {
        label: _.get(b, 'key'),
        value: total ? docCount / total : 0,
      };
    });
  });
}

export function addLogsDownloadTask(requestBody) {
  return request(`/api/${N9E_PATHNAME}/logs/download/task`, {
    method: RequestMethod.Post,
    data: requestBody,
  }).then((res) => res.dat);
}

export function getLogsDownloadTasks(params) {
  return request(`/api/${N9E_PATHNAME}/logs/download/tasks`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
}

export function delDownloadTask(data: { ids: number[] }) {
  return request(`/api/${N9E_PATHNAME}/logs/download/task`, {
    method: RequestMethod.Delete,
    data,
  }).then((res) => res.dat);
}
