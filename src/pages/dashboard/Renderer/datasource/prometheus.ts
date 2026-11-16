import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { fetchHistoryRangeBatch, fetchHistoryInstantBatch } from '@/services/dashboardV2';
import { ITarget } from '../../types';
import { IVariable } from '../../VariableConfig/definition';
import replaceExpressionBracket from '../utils/replaceExpressionBracket';
import { completeBreakpoints, getSerieName } from './utils';
import replaceFieldWithVariable from '../utils/replaceFieldWithVariable';
import { replaceExpressionVars, getOptionsList } from '../../VariableConfig/constant';

interface IOptions {
  id?: string; // panelId
  dashboardId: string;
  datasourceCate: string;
  datasourceValue: number; // 关联变量时 datasourceValue: string
  time: IRawTimeRange;
  targets: ITarget[];
  variableConfig?: IVariable[];
  spanNulls?: boolean;
  scopedVars?: any;
}

const getDefaultStepByStartAndEnd = (start: number, end: number) => {
  return Math.max(Math.floor((end - start) / 240), 1);
};

/**
 * 步长夹取。照 fe 基线原样搬（`git -C fe show v9.1.0:src/pages/dashboard/Renderer/datasource/prometheus.ts`
 * 的 `:30-37`，到最新的 `ee48e701` 这一段一字未改），只多了一个 `export` 给单测用。
 *
 * 做三件事，取最大的那个当最终步长：
 *   1. `step` —— 算出来或用户填的步长；
 *   2. `minStep` —— 下限。调用处传面板上用户自填的 `target.step`，没填就是 15 秒
 *      （上游写法 `options.minStep ?? 15`）；
 *   3. `safeStep` —— prometheus 对一次 range query 返回的点数有 11000 的硬上限，
 *      超了它直接回 `exceeded maximum resolution of 11,000 points per timeseries`，
 *      所以步长不能小于「时间范围 / 11000」。不满 1 秒时不取整（保留小数，
 *      让它在 `Math.max` 里输给前两个），大于 1 秒才向上取整。
 */
export const adjustStep = (step: number, minStep: number, range: number) => {
  // Prometheus 限制最大点数是 11000
  let safeStep = range / 11000;
  if (safeStep > 1) {
    safeStep = Math.ceil(safeStep);
  }
  return Math.max(step, minStep, safeStep);
};

export default async function prometheusQuery(options: IOptions) {
  const { dashboardId, id, time, targets, variableConfig, spanNulls, scopedVars } = options;
  if (!time.start) return Promise.resolve([]);
  const parsedRange = parseRange(time);
  let start = moment(parsedRange.start).unix();
  let end = moment(parsedRange.end).unix();
  let _step: any = getDefaultStepByStartAndEnd(start, end);
  const series: any[] = [];
  let batchQueryParams: any[] = [];
  let batchInstantParams: any[] = [];
  let exprs: string[] = [];
  let refIds: string[] = [];
  let signalKey = `${id}`;
  const datasourceValue = variableConfig ? replaceExpressionVars(options.datasourceValue as any, variableConfig, variableConfig.length, dashboardId) : options.datasourceValue;
  if (targets && typeof datasourceValue === 'number') {
    _.forEach(targets, (target) => {
      if (target.time) {
        const parsedRange = parseRange(target.time);
        start = moment(parsedRange.start).unix();
        end = moment(parsedRange.end).unix();
        _step = getDefaultStepByStartAndEnd(start, end);
      }
      if (target.step) {
        _step = target.step;
      }
      // N34-step：上面三处（面板默认 240 点算法、`target.time` 重算、`target.step` 自填）
      // 把 `_step` 定下来之后，在这里统一夹一次。`minStep` 用面板上自填的 `target.step`
      // ——上游把用户填的那个值当「最小步长」而不是「固定步长」，没填就兜 15 秒。
      // 夹完才去做下面 start / end 的对齐取整，保证取整用的是最终步长。
      _step = adjustStep(_step, target.step ?? 15, end - start);
      // TODO: 消除毛刺？
      start = start - (start % _step!);
      end = end - (end % _step!);

      const realExpr = variableConfig
        ? replaceFieldWithVariable(
            dashboardId,
            target.expr,
            getOptionsList(
              {
                dashboardId,
                variableConfigWithOptions: variableConfig,
              },
              time,
              _step,
            ),
            scopedVars,
          )
        : target.expr;
      if (realExpr) {
        if (target.instant) {
          batchInstantParams.push({
            time: end,
            query: realExpr,
          });
        } else {
          batchQueryParams.push({
            end,
            start,
            query: realExpr,
            step: _step,
          });
        }
        exprs.push(target.expr);
        refIds.push(target.refId);
        signalKey += `-${target.expr}`;
      }
    });
    try {
      if (!_.isEmpty(batchQueryParams)) {
        const res = await fetchHistoryRangeBatch({ queries: batchQueryParams, datasource_id: datasourceValue }, signalKey);
        const dat = res.dat || [];
        for (let i = 0; i < dat?.length; i++) {
          var item = {
            result: dat[i],
            expr: exprs[i],
            refId: refIds[i],
          };
          const target = _.find(targets, (t) => t.expr === item.expr);
          _.forEach(item.result, (serie) => {
            series.push({
              id: _.uniqueId('series_'),
              refId: item.refId,
              name: target?.legend ? replaceExpressionBracket(target?.legend, serie.metric) : getSerieName(serie.metric),
              metric: serie.metric,
              expr: item.expr,
              data: !spanNulls ? completeBreakpoints(_step, serie.values, start, end) : serie.values,
            });
          });
        }
      }
      if (!_.isEmpty(batchInstantParams)) {
        const res = await fetchHistoryInstantBatch({ queries: batchInstantParams, datasource_id: datasourceValue }, signalKey);
        const dat = res.dat || [];
        for (let i = 0; i < dat?.length; i++) {
          var item = {
            result: dat[i],
            expr: exprs[i],
            refId: refIds[i],
          };
          const target = _.find(targets, (t) => t.expr === item.expr);
          _.forEach(item.result, (serie) => {
            series.push({
              id: _.uniqueId('series_'),
              refId: item.refId,
              name: target?.legend ? replaceExpressionBracket(target?.legend, serie.metric) : getSerieName(serie.metric),
              metric: serie.metric,
              expr: item.expr,
              data: serie.values ? serie.values : [serie.value],
            });
          });
        }
      }
      return Promise.resolve(series);
    } catch (e) {
      console.error(e);
      return Promise.reject(e);
    }
  }
  return Promise.resolve([]);
}
