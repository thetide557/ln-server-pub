import { IRawTimeRange } from '@/components/TimeRangePicker';
import { IPanel } from '@/pages/dashboard/types';
import { Gauge } from '@ant-design/plots';
import _ from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import getCalculatedValuesBySeries from '../../utils/getCalculatedValuesBySeries';

import './style.less';

interface IProps {
  values: IPanel;
  series: any[];
  themeMode?: 'dark';
  time?: IRawTimeRange;
}

const GaugeN = (props: IProps) => {
  const { values, series, themeMode } = props;
  const { custom, options, datasourceCate } = values;

  const { calc, textMode } = custom;
  let calculatedValues = getCalculatedValuesBySeries(
    series,
    calc,
    {
      unit: options?.standardOptions?.util,
      decimals: options?.standardOptions?.decimals,
      dateFormat: options?.standardOptions?.dateFormat,
    },
    options?.valueMappings,
    options?.thresholds,
  );

  // percentUnit  [0-1]
  const isPercentUnit = options.standardOptions?.util === 'percentUnit';
  const ticks = options.thresholds?.steps.map((v) => (isPercentUnit ? v.value : v.value / 100)) || [];
  const customOptions = {
    appendPadding: [0, 0, 20, 0],
    percent: isPercentUnit ? calculatedValues[0].stat : calculatedValues[0].stat / 100,
    range: {
      ticks: [...ticks, 1],
      color: options.thresholds?.steps.map((v) => v.color),
    },
    indicator: {
      pointer: {
        style: {
          stroke: '#D0D0D0',
        },
      },
      pin: {
        style: {
          stroke: '#D0D0D0',
        },
      },
    },
    startAngle: Math.PI * 0.9,
    endAngle: 2.1 * Math.PI,
    axis: {
      label: {
        formatter(v) {
          return calculatedValues[0].stat ? Number(v) * 100 : Number(v);
        },
      },
      subTickLine: {
        count: 3,
      },
    },
    statistic: {
      title: {
        offsetY: 5,
        style: {
          fontSize: '20px',
          color: calculatedValues[0].color,
        },
        formatter: () => calculatedValues[0].text,
      },
      content:
        textMode === 'valueAndName'
          ? {
              offsetY: 35,
              style: {
                fontSize: '20px',
                // lineHeight: '44px',
              },
              formatter: () => calculatedValues[0].name,
            }
          : undefined,
    },
  };

  return (
    <div className='renderer-gauge-n-container'>
      <Gauge {...customOptions}></Gauge>
    </div>
  );
};

export default GaugeN;
