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
import _ from 'lodash';
import moment from 'moment';
import { utilValMap } from '../config';
import * as byteConverter from './byteConverter';

export function formatSecondToTime(value): any {
  if (!value || Number(value) == 0) return ''
  // 最终时间结果对象
  let day = Number(value) / 60 / 60 / 24; // 天
  let hour = Number(value) / 60 / 60 % 24; // 时
  let minute = Number(value) / 60 % 60; // 分
  let second = Number(value) % 60; // 秒
  let result = '' + parseInt("" + second) + "秒"
  if (minute > 0) {
    result = '' + parseInt("" + minute) + '分' + result
  }
  if (hour > 0) {
    result = '' + parseInt("" + hour) + '时' + result
  }
  if (day > 0) {
    result = '' + parseInt("" + day) + '天' + result
  }
  return result;
}

export function timeFormatter(val, type: 'seconds' | 'milliseconds', decimals) {
  if (typeof val !== 'number')
    return {
      value: val,
      unit: '',
      text: val,
      stat: val,
    };
  const timeMap = [
    {
      unit: 'years',
      value: 31104000,
    },
    {
      unit: 'months',
      value: 2592000,
    },
    {
      unit: 'weeks',
      value: 604800,
    },
    {
      unit: 'days',
      value: 86400,
    },
    {
      unit: 'hours',
      value: 3600,
    },
    {
      unit: 'mins',
      value: 60,
    },
  ];
  const shortTypeMap = {
    seconds: 's',
    milliseconds: 'ms',
  };
  let newVal = val;
  let unit = shortTypeMap[type];
  _.forEach(timeMap, (item) => {
    const _val = val / item.value / (type === 'milliseconds' ? 1000 : 1);
    if (_val >= 1) {
      newVal = _val;
      unit = item.unit;
      return false;
    }
  });
  if (type === 'milliseconds' && unit === 'ms') {
    const _val = newVal / 1000;
    if (_val >= 1) {
      newVal = _val;
      unit = 's';
    }
  }
  let unitMap = {
    "months": "月",
    "years": "年",
    "days": "天",
    "hours": "小时",
    "minutes": "分钟",
    "seconds": "秒",
    "milliseconds": "毫秒",
    "s": "秒"
  }
  return {
    value: _.round(newVal, decimals),
    unit,
    text: _.round(newVal, decimals) + ' ' + (unitMap[unit] ? unitMap[unit] : unit),
    stat: val,
  };
}

// interface ValueFormatterResult {
//   value: any;
//   unit: string;
//   text: any;
//   stat: any;
//   customized: boolean;
//   customizedUnit: string;
// }

const valueFormatter = ({ unit, customized = false, customizedUnit = '', decimals = 3, dateFormat = 'YYYY-MM-DD HH:mm:ss' }, val) => {

  if (val === null || val === '' || val === undefined) {
    return {
      value: '',
      unit: '',
      customized: false,
      customizedUnit: '',
      text: '',
      stat: '',
    };
  }
  if (decimals === null) decimals = 3;
  if (typeof val !== 'number') {
    val = _.toNumber(val);
  }
  if (customized) {
    return {
      value: _.round(val, decimals),
      unit: '',
      text: _.round(val, decimals) + customizedUnit,
      stat: val,
      customized: true,
      customizedUnit: customizedUnit,
    };
  }
  if (unit) {
    const utilValObj = utilValMap[unit];
    if (utilValObj) {
      const { type, base } = utilValObj;
      return byteConverter.format(val, {
        type,
        base,
        decimals,
      });
    }
    if (unit === 'none') {
      return {
        value: _.round(val, decimals),
        unit: '',
        text: _.round(val, decimals),
        stat: val,
      };
    }
    if (unit === 'percent') {
      return {
        value: _.round(val, decimals),
        unit: '%',
        text: _.round(val, decimals) + '%',
        stat: val,

      };
    }
    if (unit === 'percentUnit') {
      return {
        value: _.round(val * 100, decimals),
        unit: '%',
        text: _.round(val * 100, decimals) + '%',
        stat: val,

      };
    }
    if (unit === 'humantimeSeconds') {
      return {
        value: moment.duration(val, 'seconds').humanize(),
        unit: '',
        text: moment.duration(val, 'seconds').humanize(),
        stat: val,

      };
    }
    if (unit === 'humantimeMilliseconds') {
      return {
        value: moment.duration(val, 'milliseconds').humanize(),
        unit: '',
        text: moment.duration(val, 'milliseconds').humanize(),
        stat: val,

      };
    }
    if (unit === 'seconds') {
      return timeFormatter(val, unit, decimals);
    }
    if (unit === 'seconds_100ms') {
      return timeFormatter(val / 100, "seconds", decimals);

    }
    if (unit === 'milliseconds') {
      return timeFormatter(val, unit, decimals);

    }
    if (unit === 'datetimeSeconds') {
      return {
        value: moment.unix(val).format(dateFormat),
        unit: '',
        text: moment.unix(val).format(dateFormat),
        stat: val,

      };
    }
    if (unit === 'datetimeMilliseconds') {
      return {
        value: moment(val).format(dateFormat),
        unit: '',
        text: moment(val).format(dateFormat),
        stat: val,

      };
    }
    if (unit === '时间') {
      return {
        value: formatSecondToTime(val),//moment(val).format(dateFormat),
        unit: '',
        text: formatSecondToTime(val),//moment(val).format(dateFormat),
        stat: val,

      };
    }
    return {
      value: _.round(val, decimals),
      unit: '',
      customized: false,
      customizedUnit: '',
      text: _.round(val, decimals),
      stat: val,
    };
  }
  // 默认返回 SI 不带基础单位
  return byteConverter.format(val, {
    type: 'si',
    decimals,
  });
};
export default valueFormatter;
