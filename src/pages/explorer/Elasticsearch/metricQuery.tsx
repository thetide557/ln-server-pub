import _ from 'lodash';
import semver from 'semver';
import { getDsQuery, getESVersion } from './services';
import { normalizeTime } from '@/pages/alertRules/utils';
import { dslBuilder } from './utils';

interface IOptions {
  datasourceValue: number;
  query: any;
  start: number;
  end: number;
  interval: number;
  intervalUnit: 'second' | 'min' | 'hour' | 'day';
  filters?: any[];
}

export default async function metricQuery(options: IOptions) {
  const { query, datasourceValue, start, end, interval, intervalUnit, filters } = options;
  let series: any[] = [];
  let intervalkey = 'interval';
  try {
    const version = await getESVersion(datasourceValue);
    if (semver.gte(version, '7.17.0')) {
      intervalkey = 'fixed_interval';
    }
  } catch (e) {
    console.error(new Error('get es version error'));
  }

  const res = await getDsQuery(
    datasourceValue,
    dslBuilder({
      index: query.index,
      date_field: query.date_field,
      start: start,
      end: end,
      filters,
      syntax: query.syntax,
      query_string: query.filter,
      kuery: query.filter,
      date_histogram: {
        intervalkey,
        // step6f（ES 升级轮）：pub 的 normalizeTime 类型签名是 'second' | 'min' | 'hour'，比 fe 少一个 'day'
        //（pub `src/pages/alertRules/utils.ts:34`），但函数体里 `if (unit === 'day')` 那一支是有的（`:47`），
        // 运行时行为和 fe 完全一样，只是类型对不上。pub 现有文件不许改，这里加 as any 绕类型。已登记。
        interval: `${normalizeTime(interval, intervalUnit as any)}s`,
      },
    }),
  );
  series = [
    {
      id: _.uniqueId('series_'),
      name: 'doc_count',
      metric: {
        __name__: 'doc_count',
      },
      data: _.map(res, (item) => {
        return [item.key / 1000, item.doc_count];
      }),
    },
  ];
  return series;
}
