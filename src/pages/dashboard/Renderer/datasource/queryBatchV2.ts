// 2026-10-05 N16 摞二：羚牛适配层。仪表盘面板对 ck/doris/mysql/pgsql 的时序取数，
// 由原来的商业版 POST 商业版 query-batch（/api/takin-plus/ 前缀）（羚牛后端没有、打不通）改发开源
// POST /api/takin/v2/query-batch（后端已挂、照搬上游，四类真实现；用户拍板 77 / M229 ⑤）。
//
// 校验与归一化逐字抄自 fe main ee48e701:src/pages/dashboard/Renderer/datasource/contract.ts
// （函数上方各标 fe file:line）；信封组装按「单数据源、无 per-target datasource、无变量插件、
// SQL 文本仍用羚牛现有 replaceTemplateVariables 替换」简化（见 lead 拍板 D-1）。
// 不引 globalState 的 variablesWithOptions / variableExecution、不引 Variables/plugins、不用 AbortController。
import _ from 'lodash';
import moment from 'moment';

import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import replaceTemplateVariables from '@/pages/dashboard/Variables/utils/replaceTemplateVariables';
import { N9E_PATHNAME } from '@/utils/constant';

import { fetchDashboardQuery } from './service';
import { getDashboardDatasourceDefinition } from './registry';
import { getTargetRefId, isExpressionTarget } from './target';
import type { DashboardQueryRequest, DatasourceQuery, ExpressionQuery, DashboardQueryResponse } from './types';

// fe contract.ts:23-24（RefID 正则：后端 G-7 要求 ^[A-Za-z][A-Za-z0-9_]*$ 且请求内唯一）
const REF_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const REF_ID_REFERENCE_PATTERN = /\$([A-Za-z][A-Za-z0-9_]*)/g;

// fe contract.ts:233-235（逐字抄）
function getExpressionReferences(expression: string) {
  return Array.from(expression.matchAll(REF_ID_REFERENCE_PATTERN), (match) => match[1]);
}

// fe contract.ts:237-273（逐字抄）
export function validateDashboardQueryRequest(request: DashboardQueryRequest) {
  if (request.to < request.from) {
    throw new Error('Query end time must not be earlier than start time');
  }
  const queriesByRefId = new Map<string, DatasourceQuery | ExpressionQuery>();
  request.queries.forEach((query) => {
    if (!REF_ID_PATTERN.test(query.ref_id)) {
      throw new Error(`Invalid RefID: ${query.ref_id}`);
    }
    if (queriesByRefId.has(query.ref_id)) {
      throw new Error(`Duplicate RefID: ${query.ref_id}`);
    }
    queriesByRefId.set(query.ref_id, query);
  });

  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visitExpression = (refId: string) => {
    const state = visitState.get(refId);
    if (state === 'visiting') throw new Error(`Expression dependency cycle: ${refId}`);
    if (state === 'visited') return;
    visitState.set(refId, 'visiting');
    const query = queriesByRefId.get(refId);
    if (query?.kind === 'expression') {
      getExpressionReferences(query.expression).forEach((dependencyRefId) => {
        const dependency = queriesByRefId.get(dependencyRefId);
        if (!dependency) throw new Error(`Expression dependency not found: ${dependencyRefId}`);
        if (dependency.kind === 'query' && dependency.result_type === 'logs') {
          throw new Error(`Expression cannot reference log query: ${dependencyRefId}`);
        }
        if (dependency.kind === 'expression') visitExpression(dependencyRefId);
      });
    }
    visitState.set(refId, 'visited');
  };

  request.queries.filter((query): query is ExpressionQuery => query.kind === 'expression').forEach((query) => visitExpression(query.ref_id));
}

// fe contract.ts:275-281（逐字抄）
function getLabelsKey(labels: Record<string, string>) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(',');
}

// fe contract.ts:282-288（逐字抄）
function stableIdentityHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

// fe contract.ts:341-397 normalizeDashboardQueryResponse 的【时序分支】简化：
// 日志分支、ES bucketInterval、Prometheus lineage/step 对齐、completeBreakpoints 羚牛这里都不用（见任务书 W-2 第四节第 4 步第 5 点），
// data 直接取 item.samples，datasourceCate 用传入的 cate。失败结果收进 errorsByRef，由调用处拼成一条错误 throw。
function normalizeTimeSeriesResponse(response: DashboardQueryResponse, targets: any[], cate: string) {
  const series: any[] = [];
  const errorsByRef: Record<string, any> = {};

  (response.results ?? []).forEach((result) => {
    const refId = result.ref_id;
    const getRefId = (item: any, index: number) => item.refId || getTargetRefId(index);
    const target = _.find(targets, (item, index) => getRefId(item, index) === refId);

    if (result.status !== 'success') {
      errorsByRef[refId] = (result as any).error;
      return;
    }
    if (target?.hide) return;

    if (result.result_type === 'time_series') {
      result.series.forEach((item) => {
        const labels = item.labels ?? {};
        series.push({
          id: item.id || `${refId}:series:${stableIdentityHash(`${item.name ?? ''}\u0000${getLabelsKey(labels)}`)}`,
          refId,
          name: item.name,
          metric: labels,
          data: item.samples,
          mode: 'timeSeries',
          target,
          datasourceCate: cate,
          isExp: isExpressionTarget(target),
        });
      });
    }
  });

  return { series, errorsByRef };
}

// ck/mysql/doris 的 SQL 文本存在 target.query.query；pgsql 存在 target.query.sql（照各插件 datasource.tsx 现有写法）。
const SQL_FIELD_BY_CATE: Record<string, 'query' | 'sql'> = {
  ck: 'query',
  mysql: 'query',
  doris: 'query',
  pgsql: 'sql',
};

interface QueryBatchV2Options {
  cate: string;
  datasourceValue: number;
  time: IRawTimeRange;
  queryOptionsTime?: IRawTimeRange;
  targets: any[];
  scopedVars?: any;
  inspect?: boolean;
}

interface QueryBatchV2Result {
  series: any[];
  query?: any[];
}

// 对外：输入单数据源的时序 + 表达式 target，组装 v2 信封、发 /api/takin/v2/query-batch、归一化返回。
// 形状与各插件 Dashboard/datasource.tsx 的 Result 一致（{ series, query? }）。raw/日志 target 不走这里（D-2）。
export async function queryBatchV2(options: QueryBatchV2Options): Promise<QueryBatchV2Result> {
  const { cate, datasourceValue, time, queryOptionsTime, targets, scopedVars, inspect } = options;
  // 时间：与各插件 datasource.tsx 一致，queryOptionsTime 优先于 time；start 为空或 to<from 不发。
  const effectiveRange = queryOptionsTime ?? time;
  if (!effectiveRange?.start) return { series: [] };
  if (!targets || typeof datasourceValue !== 'number') return { series: [] };
  const parsedRange = parseRange(effectiveRange);
  const from = moment(parsedRange.start).unix();
  const to = moment(parsedRange.end).unix();
  if (to < from) return { series: [] };

  const sqlKey = SQL_FIELD_BY_CATE[cate] ?? 'query';
  const definition = getDashboardDatasourceDefinition(cate);
  const queries: Array<DatasourceQuery | ExpressionQuery> = [];

  _.forEach(targets, (target, index) => {
    const refId = target.refId || getTargetRefId(index);
    // 表达式 target（__mode__ === '__expr__' 或 kind === 'expression'）：空表达式跳过。
    if (isExpressionTarget(target)) {
      if (!target.expr) return;
      queries.push({ kind: 'expression', ref_id: refId, expression: target.expr });
      return;
    }
    // 普通查询：先用羚牛现有 replaceTemplateVariables 替换 SQL 文本（带 range 与 scopedVars），
    // 再交给上游 serializeTarget（它 clone query、去 meta 字段、keys 数组 join 空格、ck/mysql/doris 把 query→sql）。
    const clonedQuery: any = _.cloneDeep(target.query ?? {});
    const sqlText = clonedQuery[sqlKey];
    if (typeof sqlText === 'string') {
      clonedQuery[sqlKey] = replaceTemplateVariables(sqlText, { range: effectiveRange, scopedVars });
    }
    const replacedTarget = { ...target, query: clonedQuery };
    if (!definition || !definition.isQueryReady(replacedTarget)) return;
    const payload = definition.serializeTarget(replacedTarget);
    queries.push({ kind: 'query', ref_id: refId, datasource: { cate, id: datasourceValue }, result_type: 'time_series', query: payload });
  });

  if (!queries.length) return { series: [] };

  const queryRequest: DashboardQueryRequest = { from, to, queries };
  validateDashboardQueryRequest(queryRequest);

  const response = await fetchDashboardQuery(queryRequest);
  const { series, errorsByRef } = normalizeTimeSeriesResponse(response, targets, cate);

  const errorRefs = Object.keys(errorsByRef);
  if (errorRefs.length) {
    // 现有 useQuery.tsx:86-89 会 setError(e.message)；把各失败 ref 的后端消息拼成 'A: message; B: message'。
    throw new Error(errorRefs.map((ref) => `${ref}: ${errorsByRef[ref]?.message ?? ''}`).join('; '));
  }

  const result: QueryBatchV2Result = { series };
  if (inspect) {
    // 照上游 useQuery.tsx:143-153：inspect 条目展示真正发出的 v2 请求与响应。
    result.query = [
      {
        type: 'Dashboard Query',
        request: {
          url: `/api/${N9E_PATHNAME}/v2/query-batch`,
          method: 'POST',
          data: queryRequest,
        },
        response,
      },
    ];
  }
  return result;
}

export default queryBatchV2;
