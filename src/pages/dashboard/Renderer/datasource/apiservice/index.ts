import { IRawTimeRange } from '@/components/TimeRangePicker/types';
import { ITarget, IVariable } from '@/pages/dashboard/types';
import { RequestMethod } from '@/store/common';
import request from '@/utils/request';
import _ from 'lodash';
import replaceExpressionBracket from '../../utils/replaceExpressionBracket';
import { getSerieName } from '../utils';

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

export default async function apiServicequery(options: IOptions) {
  const { dashboardId, id, time, targets, variableConfig, spanNulls, scopedVars } = options;
  let exprs: string[] = [];
  let refIds: string[] = [];
  _.forEach(targets, (target) => {
    exprs.push(target.expr);
    refIds.push(target.refId);
  });
  const series: any[] = [];
  if (options.targets) {
    for (const target of options.targets) {
      const res = await request.get(target.expr, {
        method: RequestMethod.Get,
      });
      const dat = res.dat || [];
      for (let i = 0; i < dat?.length; i++) {
        const item = {
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
  }

  return Promise.resolve(series);
}
