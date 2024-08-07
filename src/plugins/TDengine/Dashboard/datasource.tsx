import _ from 'lodash';
import moment from 'moment';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { DatasourceCateEnum } from '@/utils/constant';
import { getDsQuery } from '@/plugins/TDengine/services';
import { IVariable } from '@/pages/dashboard/VariableConfig/definition';
import  {replaceExpressionBracketTaos} from '@/pages/dashboard/Renderer/utils/replaceExpressionBracket';
import { replaceExpressionVars, getOptionsList } from '@/pages/dashboard/VariableConfig/constant';
import {  getSerieNameTao, completeBreakpoints } from '../utils';
import replaceFieldWithVariable from '@/pages/dashboard/Renderer/utils/replaceFieldWithVariable';
import { N9E_PATHNAME } from '@/utils/constant';
interface IOptions {
  id?: string; // panelId
  dashboardId: string;
  datasourceValue: number;
  time: IRawTimeRange;
  targets: any[];
  variableConfig?: IVariable[];
  spanNulls?: boolean;
  scopedVars?: any;
  inspect?: boolean;
}

interface Result {
  series: any[];
  query?: any[];
}
const getDefaultStepByStartAndEnd = (start: number, end: number) => {
  return Math.max(Math.floor((end - start) / 240), 1);
};

export default async function prometheusQuery(options: IOptions): Promise<Result> {
  const { dashboardId, time, targets, variableConfig,spanNulls, scopedVars } = options;
  if (!time.start) return Promise.resolve({ series: [] });
  const parsedRange = parseRange(time);
  let start = moment(parsedRange.start).toISOString();
  let end = moment(parsedRange.end).toISOString();
  let start1 = moment(parsedRange.start).unix();
  let end1 = moment(parsedRange.end).unix();
  let _step: any = getDefaultStepByStartAndEnd(start1, end1);
  const series: any[] = [];
  let refIds: string[] = [];
  let exprs: string[] = [];
  const datasourceValue = variableConfig ? replaceExpressionVars(options.datasourceValue as any, variableConfig, variableConfig.length, dashboardId) : options.datasourceValue;
  if (targets && typeof datasourceValue === 'number') {
  
   
    const queryParmas = {
      cate: DatasourceCateEnum.tdengine,
      datasource_id: datasourceValue,
      query: _.map(targets, (target) => {
        if (target.time) {
          const parsedRange = parseRange(target.time);
          start = moment(parsedRange.start).toISOString();
          end = moment(parsedRange.end).toISOString();
        }
        const query: any = target.query || {};
        const realExpr = variableConfig
      ? replaceFieldWithVariable(
          dashboardId,
          query.query,
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
      refIds.push(target.refId);
      exprs.push(target.query?.query);
        return {
          from: start,
          to: end,
          query: realExpr,
          keys: {
            metricKey: _.join(query.keys?.metricKey, ' '),
            labelKey: _.join(query.keys?.labelKey, ' '),
            timeFormat: query.keys?.timeFormat,
          },
        };
      }),
    };
    try {
      let batchQueryRes: any = {};
      if (!_.isEmpty(targets) && _.some(targets, (target) => target.query?.query)) {
        batchQueryRes = await getDsQuery(queryParmas);
        for (let i = 0; i < batchQueryRes?.length; i++) {   

          var item = {
            result: batchQueryRes[i],
            expr: exprs[i],
            refId: refIds[i],
          };
          const target = _.find(targets, (t) => t.refId === refIds[i]) || _.find(targets, (t) => t.expr === item.expr);
          // const target = _.find(targets, (t) => t.expr === item.expr);
          // _.forEach(item.result, (serie) => {
            // console.log(serie,123321)
            // if(target != undefined){
              series.push({
                id: _.uniqueId('series_'),
                refId:  item?.refId ? item.refId : batchQueryRes[i].metric.col,
                name: target?.legend ? replaceExpressionBracketTaos(target?.legend, batchQueryRes[i].metric) : getSerieNameTao(batchQueryRes[i].metric),
                metric: batchQueryRes[i].metric,
                expr: item?.expr,
                // data: batchQueryRes[i].values,
                data: !spanNulls ? completeBreakpoints(_step, batchQueryRes[i].values, start1, end1) : batchQueryRes[i].values,
              });
            // });
            // }
            
        }
      }
      const resolveData: Result = { series };
      if (options.inspect) {
        resolveData.query = [];
        resolveData.query.push({
          type: 'Query Range',
          request: {
            url: `/api/${N9E_PATHNAME}/query-range-batch`,
            method: 'POST',
            data: queryParmas,
          },
          response: batchQueryRes,
        });
      }
      return Promise.resolve(resolveData);
    } catch (e) {
      console.error(e);
      return Promise.reject(e);
    }
  }
  return Promise.resolve({
    series: [],
  });
}
