import _ from 'lodash';
import moment from 'moment';

import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { DatasourceCateEnum } from '@/utils/constant';
import replaceTemplateVariables from '@/pages/dashboard/Variables/utils/replaceTemplateVariables';

import { getLogsQuery } from '../services';
// 2026-10-05 N16 摞二：仪表盘时序取数（queryStrategy==='sql' && mode==='timeSeries' 与表达式）改发开源
// POST /api/n9e/v2/query-batch（适配层 Renderer/datasource/queryBatchV2.ts），不再走商业版 query-batch（/api/n9e-plus/ 前缀）
// （羚牛后端不补，用户拍板 77 / M229 ⑤）。queryStrategy==='query' 与 'sql'+raw 两支逐字保留走 getLogsQuery（D-2）。
import { queryBatchV2 } from '@/pages/dashboard/Renderer/datasource/queryBatchV2';

interface IOptions {
  id?: string; // panelId
  datasourceValue: number;
  time: IRawTimeRange;
  targets: any[];
  spanNulls?: boolean;
  scopedVars?: any;
  inspect?: boolean;
  custom: any;
  queryOptionsTime?: IRawTimeRange; // 2025-10-20 新增， queryOptionsTime 会覆盖 time
}

interface Result {
  series: any[];
  query?: any[];
}

export default async function dorisQuery(options: IOptions): Promise<Result> {
  const { time, targets, datasourceValue, queryOptionsTime, scopedVars, inspect } = options;
  if (!time.start) return Promise.resolve({ series: [] });
  const parsedRange = parseRange(time);
  let start = moment(parsedRange.start).unix();
  let end = moment(parsedRange.end).unix();
  let batchRawParams: any[] = [];
  const tsTargets: any[] = []; // 时序 + 表达式 target，交给 v2 适配层
  if (targets && typeof datasourceValue === 'number') {
    _.forEach(targets, (target) => {
      const query: any = target.query || {};
      // 2026-10-05 N16：时序（queryStrategy==='sql' && mode==='timeSeries'）与表达式 target 交给 queryBatchV2。
      if (target.__mode__ === '__expr__' || (query.queryStrategy === 'sql' && query.mode === 'timeSeries')) {
        tsTargets.push(target);
        return;
      }
      // 以下 raw/日志半边逐字保留（queryStrategy==='query' 与 'sql'+raw 两支；D-2）。
      if (queryOptionsTime) {
        const parsedRange = parseRange(queryOptionsTime);
        start = moment(parsedRange.start).unix();
        end = moment(parsedRange.end).unix();
      }
      const queryStr = replaceTemplateVariables(query.query, {
        range: time,
        scopedVars,
      });
      const mode = query.mode;
      if (_.isArray(query?.keys?.valueKey)) {
        query.keys.valueKey = _.join(query.keys.valueKey, ' ');
      }
      if (_.isArray(query?.keys?.labelKey)) {
        query.keys.labelKey = _.join(query.keys.labelKey, ' ');
      }
      if (query.queryStrategy === 'query') {
        batchRawParams.push({
          ref: target.refId,
          ds_id: datasourceValue,
          ds_cate: DatasourceCateEnum.doris,
          query: {
            mode: 'query',
            from: start,
            to: end,
            offset: 0,
            lines: 500,
            query: queryStr,
            reverse: true,
            table: query.table,
            database: query.database,
            time_field: query.time_field,
          },
        });
      } else if (query.queryStrategy === 'sql') {
        if (!query.query) return;
        if (mode === 'raw') {
          batchRawParams.push({
            ref: target.refId,
            ds_id: datasourceValue,
            ds_cate: DatasourceCateEnum.doris,
            query: {
              ref: target.refId,
              mode: 'sql',
              from: start,
              to: end,
              sql: queryStr,
            },
          });
        }
      }
    });
    // 时序 + 表达式：一次 v2 批量取数。
    const tsResult = tsTargets.length
      ? await queryBatchV2({
          cate: DatasourceCateEnum.doris,
          datasourceValue,
          time,
          queryOptionsTime,
          targets: tsTargets,
          scopedVars,
          inspect,
        })
      : ({ series: [] as any[] } as { series: any[]; query?: any[] });
    let rawRes;
    if (!_.isEmpty(batchRawParams)) {
      rawRes = await getLogsQuery({
        queries: batchRawParams,
      });
    }

    const raw = _.flatten(
      _.map(rawRes, (item) => {
        const currentTarget = _.find(targets, (target) => target.refId === item?.ref);
        return _.map(item?.data, (subItem) => {
          return {
            id: _.uniqueId('series_'),
            target: currentTarget,
            metric: subItem,
            data: [],
            mode: 'raw',
          };
        });
      }),
    );
    const resolveData: Result = { series: _.concat(tsResult.series, raw) };
    if (inspect) {
      // TimeSeries 条目由适配层给（url 已是 v2 真路径）；Logs 条目展示真正发出的 /api/n9e/log-query-batch。
      resolveData.query = [...(tsResult.query ?? [])];
      if (!_.isEmpty(batchRawParams)) {
        resolveData.query.push({
          type: 'Logs',
          request: {
            url: `/api/n9e/log-query-batch`,
            method: 'POST',
            data: batchRawParams,
          },
          response: raw,
        });
      }
    }
    return Promise.resolve(resolveData);
  }
  return Promise.resolve({
    series: [],
  });
}
