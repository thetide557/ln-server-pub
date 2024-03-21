import { IPanel } from '@/pages/dashboard/types';
import { Datum } from '@ant-design/graphs';
import { Line } from '@ant-design/plots';
import React from 'react';
import { convertTimeseriesToG2Data } from '../../utils/seriesConvert';
import valueFormatter from '../../utils/valueFormatter';

import './style.less';

interface IProps {
  values: IPanel;
  series: any[];
  themeMode?: 'dark';
}

export default function (props: IProps) {
  const { values, series, themeMode } = props;
  const { custom, options } = values;

  const seriesData = convertTimeseriesToG2Data(series);
  const customOptions = {
    xField: 'name',
    yField: 'value',
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
      formatter: (datum: Datum) => {
        const val = {
          name: datum.name,
          value: valueFormatter(
            {
              unit: options?.standardOptions?.util,
              decimals: options?.standardOptions?.decimals,
              dateFormat: options?.standardOptions?.dateFormat,
            },
            datum.value,
          ).text,
        };
        return val;
      },
    }
  };

  return (
    <div className='renderer-line-container'>
      <Line {...customOptions} data={seriesData} renderer="canvas"></Line>
    </div>
  );
}
