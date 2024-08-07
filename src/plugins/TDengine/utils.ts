import _ from 'lodash';
import { TargetMetaDrawer } from 'plus:/parcels/Targets/TargetMetaDrawer';

/**
 * prometheus 接口默认不会把 null 点返回
 * 会导致视觉上该时间点有数据存在的假象
 * 目前先前端处理补全断点
 */
export function completeBreakpoints(step: number | undefined, data: any[], start?: number, end?: number) {
  const result: any[] = [];

  // // 补齐开头的时间戳
  // if (start && step && data.length > 1 && data[0][0] - start > step) {
  //   data.unshift([start, 0])
  // }
  // // 补齐结尾的时间戳
  // if (end && step && data.length > 1 && data[data.length - 1][0] - end > step) {
  //   data.push([end, 0])
  // }

  _.forEach(data, (item, idx) => {
    if (idx > 0) {
      let flag = true;
      while (flag) {
        const prev = result[result.length - 1];
        if (prev[0] + step < item[0]) {
          result.push([prev[0] + step, 0]);
        } else {
          flag = false;
        }
      }
    }
    result.push(item);
  });
  return result;
}

export const getSerieName = (metric: any) => {
  const metricName = metric?.__name__ || '';
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label) => {
      return `${label}="${metric[label]}"`;
    });

  return `${metricName}{${_.join(labels, ',')}}`;
};

export const getSerieNameTao = (metric: any) => {
 
    const metricName = metric?.__name__ || '';
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label) => {
      return `${label}="${metric[label]}"`;
    });

  return `${metricName}{${_.join(labels, ',')}}`;
 
 
  
};

