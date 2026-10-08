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
import React, { useState, useEffect, useContext, useRef } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Space, InputNumber, Radio, Button, Popover } from 'antd';
import { LineChartOutlined, AreaChartOutlined, SettingOutlined, ShareAltOutlined } from '@ant-design/icons';
import TimeRangePicker, { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import LineGraphStandardOptions from './components/GraphStandardOptions';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import { completeBreakpoints } from '@/pages/dashboard/Renderer/datasource/utils';
import { CommonStateContext } from '@/App';
import { getPromData, setTmpChartData } from './services';
import type { QueryRequest } from '@/components/AiQueryDock/usePendingQuery';
import { QueryStats } from './components/QueryStatsView';
import { useLocation } from 'react-router-dom';
import { queryStringOptions } from '@/pages/explorer/constants';
import queryString from 'query-string';

interface IProps {
  url: string;
  datasourceValue: number;
  promql?: string;
  setQueryStats: (stats: QueryStats) => void;
  setErrorContent: (content: string) => void;
  contentMaxHeight: number;
  range: IRawTimeRange;
  setRange: (range: IRawTimeRange) => void;
  step?: number;
  setStep: (step?: number) => void;
  graphOperates: {
    enabled: boolean;
  };
  refreshFlag: string;
  /**
   * N36 批 E：这一次取数是谁要的。停靠栏按下「执行」时由 `usePendingQuery.begin()` 造出来，
   * 取数这边**必须**显式调它的 `complete(...)` 才算结束——停靠栏那边的 promise 就靠它 resolve。
   * 不能拿 `setQueryStats` / `setErrorContent` 被调到当完成信号：那样一条慢查询的响应回来时，
   * 会去应答后一条请求（上游在 `usePendingQuery.ts:8-16` 的注释里说明了这一点）。
   */
  queryRequest?: QueryRequest;
  /** 真时不取数：停靠栏刚把语句填进框、还没按「执行」的那段时间。 */
  queryPaused?: boolean;
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

  return `${metricName}{${_.join(labels, ',')}}`;
};

export default function Graph(props: IProps) {
  const { datasourceList } = useContext(CommonStateContext);
  const {
    url,
    datasourceValue,
    promql,
    setQueryStats,
    setErrorContent,
    contentMaxHeight,
    range,
    setRange,
    step,
    setStep,
    graphOperates,
    refreshFlag,
    queryRequest,
    queryPaused,
  } = props;
  const [data, setData] = useState<any[]>([]);
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


  const { search } = useLocation();
  const query = queryString.parse(search, queryStringOptions);
  const isInitialRender = useRef(true);

  useEffect(() => {
    // N36 批 E：这一帧的 `queryRequest` 当场抓进局部常量，后面只认它（和 Table.tsx 同款）。
    // 「谁发的请求谁来结」：同一个对象只会被它所在那一次 effect 捕获，后一次 `begin()`
    // 会先把前一个 abort 掉（`usePendingQuery.ts:33`），所以前一条慢响应回来时它的
    // `complete` 早已结了、应答不到后一条请求。
    const request = queryRequest;
    if (queryPaused || request?.signal.aborted) return;
    if (datasourceValue && promql) {
      // console.log("useEffect----range", range);
      const parsedRange = parseRange(range);
      const start = moment(parsedRange.start).unix();
      const end = moment(parsedRange.end).unix();
      let realStep = step;
      if (!step) realStep = Math.max(Math.floor((end - start) / 240), 1);
      const queryStart = Date.now();
      // console.log("query参数",query)
      // 羚牛自改：URL 里带 prom_ql 时，本实例第一次跑这个 effect 不取数（原来的两个分支里
      // 那句「初次渲染不做查询」）。先把「这一轮到底取不取数」算出来，原行为一字不改；
      // 这样下面的取数只写一遍，请求绑定也只接一处。
      const willFetch = !query.prom_ql || !isInitialRender.current;
      if (query.prom_ql) {
        // 初次渲染不做查询
        isInitialRender.current = false;
      }
      if (!willFetch) {
        // 正常首屏时 `request` 是 undefined，这里是空操作。只有「停靠栏按了执行、偏巧撞上这个
        // 不取数的分支」那种病态时序才会走到：宁可把它拒掉，也不能让停靠栏一直挂着
        // （任务书尺子 4）。原由见 `n36/拿不准-E.md` U-N36-E-5。
        request?.complete(new Error('The chart skipped this run (first render with prom_ql in the URL)'));
        return;
      }
      // 这一轮自己的 controller：用来真的掐断 HTTP 请求；外面要停时通过 request.signal 转进来。
      const controller = new AbortController();
      let settled = false;
      const abort = () => {
        controller.abort();
        if (!settled) request?.complete(new DOMException('Query stopped', 'AbortError'));
      };
      request?.signal.addEventListener('abort', abort, { once: true });
      // console.log("执行查询",range)
      getPromData(
        `${url}/${datasourceValue}/api/v1/query_range`,
        {
          query: promql,
          start: moment(parsedRange.start).unix(),
          end: moment(parsedRange.end).unix(),
          step: realStep,
        },
        controller.signal,
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          const series = _.map(res?.result, (item) => {
            return {
              id: _.uniqueId('series_'),
              name: getSerieName(item.metric),
              metric: item.metric,
              data: completeBreakpoints(realStep, item.values),
            };
          });
          setQueryStats({
            loadTime: Date.now() - queryStart,
            resolution: step,
            resultSeries: series.length,
          });

          setData(series);
          settled = true;
          request?.complete({ empty: series.length === 0, count: series.length });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          const msg = _.get(err, 'message');
          setErrorContent(`Error executing query: ${msg}`);
          settled = true;
          request?.complete(err instanceof Error ? err : new Error(String(msg || err)));
        });
      return () => {
        request?.signal.removeEventListener('abort', abort);
        abort();
      };
    }
  }, [JSON.stringify(range), step, datasourceValue, promql, refreshFlag, queryRequest, queryPaused]);

  return (
    <div className='prom-graph-graph-container'>
      <div className='prom-graph-graph-controls'>
        <Space>
          <TimeRangePicker value={range} onChange={setRange} dateFormat='YYYY-MM-DD HH:mm:ss' />
          <InputNumber
            placeholder='Res. (s)'
            value={step}
            onKeyDown={(e: any) => {
              if (e.code === 'Enter') {
                setStep(_.toNumber(e.target.value));
              }
            }}
            onBlur={(e) => {
              setStep(_.toNumber(e.target.value));
            }}
          />
          <Radio.Group
            options={[
              { label: <LineChartOutlined />, value: ChartType.Line },
              { label: <AreaChartOutlined />, value: ChartType.StackArea },
            ]}
            onChange={(e) => {
              e.preventDefault();
              setChartType(e.target.value);
            }}
            value={chartType}
            optionType='button'
            buttonStyle='solid'
          />
          {graphOperates.enabled && (
            <>
              <Popover
                placement='left'
                content={<LineGraphStandardOptions highLevelConfig={highLevelConfig} setHighLevelConfig={setHighLevelConfig} />}
                trigger='click'
                autoAdjustOverflow={false}
                getPopupContainer={() => document.body}
              >
                <Button icon={<SettingOutlined />} />
              </Popover>
              <Button
                icon={
                  <ShareAltOutlined
                    onClick={() => {
                      const dataProps = {
                        type: 'timeseries',
                        version: '3.0.0',
                        name: promql,
                        step,
                        range,
                        ...lineGraphProps,
                        targets: [
                          {
                            expr: promql,
                          },
                        ],
                        datasourceCate: 'prometheus',
                        datasourceName: _.find(datasourceList, { id: datasourceValue })?.name,
                        datasourceValue,
                      };
                      setTmpChartData([
                        {
                          configs: JSON.stringify({
                            dataProps,
                          }),
                        },
                      ]).then((res) => {
                        const ids = res.dat;
                        window.open('/chart/' + ids);
                      });
                    }}
                  />
                }
              />
            </>
          )}
        </Space>
      </div>
      <Timeseries inDashboard={false} values={lineGraphProps as any} series={data} />
    </div>
  );
}
