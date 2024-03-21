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
import React, { useState, useEffect, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import TimeRangePicker, { TimeRangePickerWithRefresh, IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import { parse, isMathString } from '@/components/TimeRangePicker/utils';
import { byteMaxNumber ,formatSeconds,fomartTime,byteCompute,bitCompute} from '@/components/ComputeByte';
import { CommonStateContext } from '@/App';
import { getAssetsMonitor } from '@/services/assets';
import './graph.less'
import { cn_name, en_name } from '@/components/PromQueryBuilder/components/metrics_translation'
import { QueryStats } from '@/components/PromGraphCpt/components/QueryStatsView';
import { Button, InputNumber, Popover, Radio, Space, RadioChangeEvent } from 'antd';
import replaceExpressionBracket from '@/pages/dashboard/Renderer/utils/replaceExpressionBracket';
import { completeBreakpoints } from '@/pages/dashboard/Renderer/datasource/utils';

interface IProps {
  monitorId: number;
  title: string;
  toolVisible: boolean;
  setQueryStats?: (stats: QueryStats) => void;
  setErrorContent?: (content: string) => void;
  contentMaxHeight?: number;
  range: IRawTimeRange | any;
  setRange: (range: IRawTimeRange) => void;
  step: number;
  label: string;
  unit: string;
  graphOperates: {
    enabled: boolean;
  };
  refreshFlag: string;
}

enum ChartType {
  Line = 'line',
  StackArea = 'stackArea',
}

const getSerieName = (metric: any) => {
  const metricName = metric?.__name__ || '';
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label) => {
      return `${label}="${metric[label]}"`;
    });
    if (cn_name[metricName]) {
      return `${metricName} / ${cn_name[metricName]}`;     
    } else if (en_name[metricName]) {
      return `${metricName} / ${en_name[metricName]}`; 
    }
  return `${metricName}`;
};

export default function Graph(props: IProps) {
  const { datasourceList } = useContext(CommonStateContext);
  const { monitorId, label, setErrorContent, setRange, contentMaxHeight, range, graphOperates, refreshFlag } = props;
  const [data, setData] = useState<any[]>([]);
  const [step, setStep] = useState<number>(props.step);
  const [size, setSize] = useState<any>('now-1h');
  const [toolVisible, setToolVisible] = useState(props.toolVisible);


  const [highLevelConfig, setHighLevelConfig] = useState({
    shared: true,
    sharedSortDirection: 'desc',
    legend: true,
    unit: 'none',
    reverseColorOrder: false,
    colorDomainAuto: true,
    colorDomain: [],
    chartheight: 300,
  });
  const [chartType, setChartType] = useState<ChartType>(ChartType.Line);
  const lineGraphProps = {
    custom: {
      drawStyle: 'lines',
      fillOpacity: chartType === ChartType.Line ? 0 : 0.5,
      stack: chartType === ChartType.Line ? 'hidden' : 'noraml',
      lineInterpolation: 'smooth',
    },
    options: {
      legend: {
        displayMode: highLevelConfig.legend ? 'table' : 'hidden',
      },
      tooltip: {
        mode: highLevelConfig.shared ? 'all' : 'single',
        sort: highLevelConfig.sharedSortDirection,
      },
      standardOptions: {
        util: highLevelConfig.unit,
      },
    },
  };

  const handleSizeChange = (e: RadioChangeEvent) => {
    range.start = parse(e.target.value);
    setRange(range);
    setSize(e.target.value)
  };

  useEffect(() => {
    if (monitorId > 0) {
      // localStorage.removeItem("monitorUnit-"+monitorId);
      const parsedRange = parseRange(range);
      const start = moment(parsedRange.start).unix();
      const end = moment(parsedRange.end).unix();
      let realStep = step;
      if (!step) realStep = Math.max(Math.floor((end - start) / 240), 1);
      let ids = new Array<number>();
      ids.push(monitorId);
      getAssetsMonitor(
        moment(parsedRange.start).unix(),
        moment(parsedRange.end).unix(),
        ids
      ).then((res) => {
        const series = new Array();
        _.map(res?.dat[0], (item) => {
          let yValues = new Array();
          item.values.forEach(element => {
            yValues.push(Number(element["1"]))
          });
          let yMax = byteMaxNumber(yValues);
          
          localStorage.removeItem("monitorUnit-"+monitorId);
          if(props.unit=="percent-100"){
             localStorage.setItem("monitorUnit-"+monitorId,"%");
          }else if(props.unit=="percent-1"){
             localStorage.setItem("monitorUnit-"+monitorId,"%");
             item.values.forEach(element => {
              element["1"]= (element["1"]*100).toFixed(2);              
             });
          }else if(props.unit=="bit"){
            let maxUnit = bitCompute(yMax);
            item.values.forEach(element => {
               element["1"]= (element["1"]% maxUnit[1]).toFixed(2);              
            });
            localStorage.setItem("monitorUnit-"+monitorId,maxUnit[0]);
          }else if(props.unit=="byte"){
            let maxUnit = byteCompute(yMax);
            item.values.forEach(element => {
              element["1"]= (element["1"]% maxUnit[1]).toFixed(2);              
           });
            localStorage.setItem("monitorUnit-"+monitorId,maxUnit[0]);
          }else if(props.unit=="S"){
            let maxUnit = formatSeconds(yMax);
            setHighLevelConfig({ ...highLevelConfig, unit: "humantimeSeconds" });
            console.log("values",item.values);
            localStorage.setItem("monitorUnit-"+monitorId,maxUnit[0]);
           }else if(props.unit=="MS"){
            localStorage.setItem("monitorUnit-"+monitorId,'毫秒');
            setHighLevelConfig({ ...highLevelConfig, unit: "milliseconds" });
           }
          series.push({
              id: _.uniqueId('series_'),
              name: replaceExpressionBracket(label, item.metric) || getSerieName(item.metric),
              metric: item.metric["__name__"],
              data: item.values,//completeBreakpoints(realStep, item.values),
            });
          console.log('first', label, item.metric)
        });
        setData(series);


      })
        .catch((err) => {
          const msg = _.get(err, 'message');
        });
    }
  }, [JSON.stringify(range), step, monitorId, refreshFlag]);

  return (
    <div className='monitor-graph-container graph-xh' style={{ width: '100%' }}>
      {toolVisible && (
        <div className='prom-graph-graph-controls graph-head'>
            <div className='graph_header_'>
              <Radio.Group value={size} onChange={handleSizeChange}>
                <Radio.Button value="now-1h" >近1小时</Radio.Button>
                <Radio.Button value="now-3h">近3小时</Radio.Button>
                <Radio.Button value="now-12h">近12小时</Radio.Button>
                <Radio.Button value="now-24h">近24小时</Radio.Button>
                <Radio.Button value="now-7d">近7天</Radio.Button>
                <Radio.Button value="now-30d">近30天</Radio.Button>
              </Radio.Group>
              <div>
                <TimeRangePickerWithRefresh
                  // refreshTooltip={t('refresh_tip', { num: getStepByTimeAndStep(range, step) })}
                  onChange={value => {
                    range.start = isMathString(value.start) ? parse(value.start) : moment(value.start);
                    range.end = isMathString(value.end) ? parse(value.end) : moment(value.end);
                    setRange(range);

                  }}
                  value={range}
                  localKey='monitor-timeRangePicker-value'
                />
              </div>
            </div>
        </div>

      )}
      <Timeseries inDashboard={false} values={lineGraphProps as any} series={data} />
    </div>
  );
}
