import { IPanel } from '@/pages/dashboard/types';
import Preview from '@/pages/topoGraph/Preview';
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

  return (
    <div className='renderer-line-container'>
      <Preview topo={custom?.topo || {}}></Preview>
    </div>
  );
}
