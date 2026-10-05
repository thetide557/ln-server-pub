// 2026-10-05 N16 摞二：复制自 fe v9.1.0 同路径（羚牛原无 Dashboard/），并按 N16 把时序 + 表达式半边改走
// 开源 POST /api/n9e/v2/query-batch（适配层 Renderer/datasource/queryBatchV2.ts），不再调 getDsQuery2 的商业版
// query-batch（/api/n9e-plus/ 前缀，羚牛后端不补，用户拍板 77 / M229 ⑤）。raw 半边保留走 getLogsQuery（/api/n9e/log-query-batch，D-2）。接线照 ck / doris。
import _ from 'lodash';
import moment from 'moment';

import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { DatasourceCateEnum } from '@/utils/constant';
import replaceTemplateVariables from '@/pages/dashboard/Variables/utils/replaceTemplateVariables';

import { getLogsQuery } from '../services';
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

export default async function mysqlQuery(options: IOptions): Promise<Result> {
  const { time, targets, datasourceValue, queryOptionsTime, scopedVars, inspect } = options;
  if (!time.start) return Promise.resolve({ series: [] });
  const parsedRange = parseRange(time);
  let start = moment(parsedRange.start).unix();
  let end = moment(parsedRange.end).unix();
  let batchTimeRawParams: any[] = [];
  const tsTargets: any[] = []; // 时序 + 表达式 target，交给 v2 适配层
  if (targets && typeof datasourceValue === 'number') {
    _.forEach(targets, (target) => {
      // 2026-10-05 N16：时序与表达式 target 交给 queryBatchV2（内部替换变量 / 序列化 keys / 校验 / 发 v2）。
      if (target.__mode__ === '__expr__' || target.query?.mode === 'timeSeries') {
        tsTargets.push(target);
        return;
      }
      // 以下 raw 半边逐字保留（D-2：log-query-batch 本来就通）。
      if (queryOptionsTime) {
        const parsedRange = parseRange(queryOptionsTime);
        start = moment(parsedRange.start).unix();
        end = moment(parsedRange.end).unix();
      }
      const query: any = target.query || {};
      if (!query.query) return;
      const queryStr = replaceTemplateVariables(query.query, { range: queryOptionsTime ?? time });
      const mode = query.mode;
      if (mode === 'raw') {
        batchTimeRawParams.push({
          ref: target.refId,
          ds_id: datasourceValue,
          ds_cate: DatasourceCateEnum.mysql,
          query: {
            ref: target.refId,
            from: start,
            to: end,
            sql: queryStr,
          },
        });
      }
    });
    // 时序 + 表达式：一次 v2 批量取数。
    const tsResult = tsTargets.length
      ? await queryBatchV2({
          cate: DatasourceCateEnum.mysql,
          datasourceValue,
          time,
          queryOptionsTime,
          targets: tsTargets,
          scopedVars,
          inspect,
        })
      : ({ series: [] as any[] } as { series: any[]; query?: any[] });
    let rawRes;
    if (!_.isEmpty(batchTimeRawParams)) {
      rawRes = await getLogsQuery({
        queries: batchTimeRawParams,
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
      if (!_.isEmpty(batchTimeRawParams)) {
        resolveData.query.push({
          type: 'Logs',
          request: {
            url: `/api/n9e/log-query-batch`,
            method: 'POST',
            data: batchTimeRawParams,
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
