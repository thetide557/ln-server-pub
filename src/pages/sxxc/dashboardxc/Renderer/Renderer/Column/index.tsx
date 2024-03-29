import { IRawTimeRange } from '@/components/TimeRangePicker';
import { useGlobalState } from '@/pages/dashboard/globalState';
import { IPanel } from '@/pages/dashboard/types';
import { Datum } from '@ant-design/graphs';
import { Column } from '@ant-design/plots';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import getCalculatedValuesBySeries from '../../utils/getCalculatedValuesBySeries';
import { getDetailUrl } from '../../utils/replaceExpressionDetail';
import { convertTimeseriesToG2Data } from '../../utils/seriesConvert';
import valueFormatter from '../../utils/valueFormatter';

import './style.less';

interface IProps {
  values: IPanel;
  series: any[];
  themeMode?: 'dark';
  time: IRawTimeRange;
}

const getColumnsKeys = (data: any[]) => {
  const keys = _.reduce(
    data,
    (result, item) => {
      return _.union(result, _.keys(item.metric));
    },
    [],
  );
  return _.uniq(keys);
};

export default function (props: IProps) {
  const { values, series, themeMode, time } = props;
  const { custom, options } = values;

  const seriesData = convertTimeseriesToG2Data(series);
  const [dashboardMeta] = useGlobalState('dashboardMeta');

  const detailFormatter = (data: any) => {
    return getDetailUrl(custom.detailUrl, data, dashboardMeta, time);
  };

  const customOptions = {
    xField: 'name',
    yField: 'value',
    seriesField: custom?.seriesField,
    isStack: custom.stack === 'noraml',
    yAxis: {
      tickCount: 4,
      label: {
        formatter: (val) => {
          return valueFormatter(
            {
              unit: options?.standardOptions?.util,
              decimals: options?.standardOptions?.decimals,
              dateFormat: options?.standardOptions?.dateFormat,
            },
            val,
          ).text;
        },
      },
    },
    tooltip: {
      position: 'top' as 'top',
      offset: 2,
      enterable: true,
      fields: ['name', 'value', 'metric', custom?.seriesField],
      formatter: (datum: Datum) => {
        const val = {
          name: custom.stack === 'noraml' ? datum[custom.seriesField] : datum.name,
          value: valueFormatter(
            {
              unit: options?.standardOptions?.util,
              decimals: options?.standardOptions?.decimals,
              dateFormat: options?.standardOptions?.dateFormat,
            },
            datum.value,
          ).text,
        };
        const detailDom = custom.detailUrl && datum.name !== '其他' ? `&nbsp;|&nbsp;<span><a href=${detailFormatter(datum)} target="_blank">${custom.detailName}</a></span>` : '';
        val.value = val.value + detailDom
        return val;
      },
    },
  };

  return (
    <div className='renderer-column-container'>
      <Column {...customOptions} data={seriesData} renderer="canvas"></Column>
    </div>
  );
}
