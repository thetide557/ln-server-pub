// 2026-10-05 N16 摞二：逐字抄自 fe main ee48e701 同路径；后端 v2 照搬上游，前端跟上游单轨（用户拍板 77 / M229 ⑤）。
import _ from 'lodash';

import type { ITarget as _ITarget } from '@/pages/dashboard/types';

import type { DashboardQueryResultType } from './types';

// 2026-10-05 N16 摞二：羚牛全局 ITarget.query 是窄对象 {index;filters;values}（不改宽，否则伤 sxxc 大屏，见 拿不准-W2.md U-1、lead D-10a）。
// 本文件要读 query.mode/values 等任意字段，故在本新文件内用本地别名把 query/queries 当 any（本类型不出本文件，不影响全局）。照 registry.ts 同款。
type ITarget = Omit<_ITarget, 'query' | 'queries'> & { query?: any; queries?: any };

export function isExpressionTarget(target?: ITarget) {
  return target?.kind === 'expression' || target?.__mode__ === '__expr__';
}

export function inferTargetResultType(target: ITarget): DashboardQueryResultType {
  const mode = String(target.query?.mode ?? '').toLowerCase();
  const valueFunctions = _.map(target.query?.values as unknown[] | undefined, 'func');
  if (_.includes(['raw', 'logs'], mode) || _.includes(valueFunctions, 'rawData')) {
    return 'logs';
  }
  if (_.includes(['timeseries', 'time_series'], mode)) {
    return 'time_series';
  }
  return target.resultType ?? 'time_series';
}

export function getTargetRefId(index: number) {
  let value = index;
  let refId = '';
  do {
    refId = String.fromCharCode(65 + (value % 26)) + refId;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return refId;
}
