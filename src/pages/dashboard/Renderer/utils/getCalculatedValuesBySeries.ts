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
import valueFormatter from './valueFormatter';
import { IValueMapping, IThresholds } from '../../types';

const getValueAndToNumber = (value: any[]) => {
  return _.toNumber(_.get(value, 1, NaN));
};

export const getSerieTextObj = (value: number | string | null | undefined, standardOptions?: any, valueMappings?: IValueMapping[], thresholds?: IThresholds) => {
  const { decimals, dateFormat,customized } = standardOptions || {};
  const unit = standardOptions?.unit || standardOptions?.util; // TODO: 兼容之前写错的 util
  const customizedUnit = standardOptions?.customizedUnit || '';
  const matchedValueMapping = _.find(valueMappings, (item: any) => {
    const { type, match } = item;
    if (value === null || value === '' || value === undefined) {
      if (type === 'specialValue') {
        if (match?.specialValue === 'empty') {
          return value === '';
        } else if (match?.specialValue === 'null') {
          return value === null || value === undefined;
        }
      }
      return false;
    } else {
      value = _.toNumber(value) as number;
      if (type === 'special') {
        return value === match?.special;
      } else if (type === 'range') {
        if (_.isNumber(match?.from) && _.isNumber(match?.to)) {
          return value >= match?.from && value <= match?.to;
        } else if (_.isNumber(match?.from)) {
          return value >= match?.from;
        } else if (_.isNumber(match?.to)) {
          return value <= match?.to;
        }
        return false;
      }
      return false;
    }
  });
  let matchedThresholdsColor;
  if (thresholds?.steps) {
    const baseColor = _.get(_.find(thresholds?.steps, { type: 'base' }), 'color');
    matchedThresholdsColor = baseColor;
  }
  _.forEach(
    _.sortBy(thresholds?.steps, (item) => {
      return Number(item.value);
    }),
    (item) => {
      if (item.value && value) {
        value = _.toNumber(value) as number;
        if (value >= item.value) {
          matchedThresholdsColor = item.color;
        }
      }
    },
  );
  const valueObj = valueFormatter({ unit, decimals, dateFormat }, value);
  const newValue = matchedValueMapping?.result?.text ? matchedValueMapping?.result?.text : valueObj.value;
  // 自定义化单位
  const unitToUse = customized? customizedUnit : valueObj.unit;
  const textToUse = customized? `${newValue}${customizedUnit}` : `${newValue}${valueObj.unit}`;
  
  return {
    value: newValue,
    unit: unitToUse,
    customized: customized,
    color: matchedValueMapping?.result?.color || matchedThresholdsColor,
    text: textToUse,
  };
};

const getCalculatedValuesBySeries = (series: any[], calc: string, { unit,customized,customizedUnit,  decimals, dateFormat }, valueMappings?: IValueMapping[], thresholds?: IThresholds) => {
  const values = _.map(series, (serie) => {
    const results = {
      lastNotNull: () => _.get(_.last(_.filter(serie.data, (item) => item[1] !== null && !_.isNaN(_.toNumber(item[1])))), 1),
      last: () => _.get(_.last(serie.data), 1),
      firstNotNull: () => _.get(_.first(_.filter(serie.data, (item) => item[1] !== null && !_.isNaN(_.toNumber(item[1])))), 1),
      first: () => _.get(_.first(serie.data), 1),
      min: () => getValueAndToNumber(_.minBy(serie.data, (item: any) => _.toNumber(item[1]))),
      max: () => getValueAndToNumber(_.maxBy(serie.data, (item: any) => _.toNumber(item[1]))),
      avg: () => _.meanBy(serie.data, (item: any) => _.toNumber(item[1])),
      sum: () => _.sumBy(serie.data, (item: any) => _.toNumber(item[1])),
      count: () => _.size(serie.data),
    };
    const stat = results[calc] ? results[calc]() : NaN;
    return {
      id: serie.id,
      name: serie.name,
      metric: serie.metric,
      fields: {
        ...serie.metric,
        refId: serie.refId,
      },
      stat: _.toNumber(stat),
      ...getSerieTextObj(stat, { unit, customized,customizedUnit,decimals, dateFormat }, valueMappings, thresholds),
    };
  });
  return values;
};

export const getLegendValues = (series: any[], { unit, decimals, dateFormat }, hexPalette: string[], stack = false) => {
  const newSeries = stack ? _.reverse(_.clone(series)) : series;
  const values = _.map(newSeries, (serie, idx) => {
    const results = {
      max: getValueAndToNumber(_.maxBy(serie.data, (item: any) => _.toNumber(item[1]))),
      min: getValueAndToNumber(_.minBy(serie.data, (item: any) => _.toNumber(item[1]))),
      avg: _.meanBy(serie.data, (item: any) => _.toNumber(item[1])),
      sum: _.sumBy(serie.data, (item: any) => _.toNumber(item[1])),
      last: getValueAndToNumber(_.last(serie.data) as any),
    };
    return {
      id: serie.id,
      name: serie.name,
      metric: serie.metric,
      offset: serie.offset,
      color: hexPalette[idx % hexPalette.length],
      disabled: serie.visible === false ? true : undefined,
      max: valueFormatter({ unit, decimals, dateFormat }, results.max),
      min: valueFormatter({ unit, decimals, dateFormat }, results.min),
      avg: valueFormatter({ unit, decimals, dateFormat }, results.avg),
      sum: valueFormatter({ unit, decimals, dateFormat }, results.sum),
      last: valueFormatter({ unit, decimals, dateFormat }, results.last),
    };
  });
  return values;
};

export default getCalculatedValuesBySeries;

// ---- n20 块 0（新日志浏览）在这里加的，只加不改 ----
// 谁要它：src/pages/dashboard/Renderer/Renderer/TimeSeriesNG/utils/getLegendData.ts:5。
// fe 出处：fe ee48e701 同路径 :156-180（整个函数逐字抄；fe 在 :18 import stringToRegex）。
// 羚牛这份 getCalculatedValuesBySeries.ts 是从 izuna 分支合来的自己的版本（与 fe diff 292 行），
// 不覆盖；函数里要的 stringToRegex 羚牛已经有（src/pages/dashboard/Variables/utils/stringToRegex.ts，
// 与 fe 同路径逐字相同，diff 0 行），只是本文件原来没 import 它——import 放在文件末尾（ESM 的
// import 会被提升，效果与放文件头一样），这样这个边界文件的 diff 里只有 `+` 行、没有 `-` 行。
// 函数用到的 IValueMapping 类型本文件 :19 已经 import 过，不用补。
import stringToRegex from '../../Variables/utils/stringToRegex';

export const getMappedTextObj = (textValue: string, valueMappings?: IValueMapping[]) => {
  if (typeof textValue === 'string') {
    const matchedValueMapping = _.find(valueMappings, (item) => {
      // 与 fe 的差：fe 的 IValueMapping（fe types.ts:86-99）的 type 联合里有 'textValue'、match 里有
      // textValue 字段；羚牛那版（types.ts:62-73）两者都没有。羚牛这份 IValueMapping 是仪表盘的公共
      // 类型（撞点表 #7 点名「不能覆盖」），**不去改它的已有行**（改联合类型就必然产生 `-` 行、
      // 破掉 B 类只加不改的门禁），改成在这里按宽类型解构一次，逻辑与 fe 一字不差。
      // 后果：羚牛的值映射界面里配不出 type === 'textValue' 的映射，所以这个分支实际走不到，
      // getMappedTextObj 恒返回 { text: textValue }——与 fe 在「没配文本映射」时的结果相同。
      const { type, match } = item as unknown as { type?: string; match?: { textValue?: string } };
      if (type === 'textValue') {
        if (textValue === match?.textValue) return true;
        const reg = stringToRegex(match?.textValue);
        if (reg && reg.test(textValue)) return true;
        return false;
      }
      return false;
    });
    if (matchedValueMapping) {
      return {
        // origin: textValue,
        text: matchedValueMapping?.result?.text || textValue,
        color: matchedValueMapping?.result?.color,
      };
    }
  }
  return {
    // origin: textValue,
    text: textValue,
  };
};
