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
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Input, DatePicker, List, Space } from 'antd';
import { getPromData } from './services';
import type { QueryRequest } from '@/components/AiQueryDock/usePendingQuery';
import { QueryStats } from './components/QueryStatsView';

interface IProps {
  url: string;
  datasourceValue: number;
  promql?: string;
  setQueryStats: (stats: QueryStats) => void;
  setErrorContent: (content: string) => void;
  contentMaxHeight: number;
  timestamp?: number;
  setTimestamp: (timestamp?: number) => void;
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
type ResultType = 'matrix' | 'vector' | 'scalar' | 'string' | 'streams';

const LIMIT = 10000;
function getListItemLabel(resultType, record) {
  const { metric } = record;
  if (resultType === 'scalar') return 'scalar';
  if (resultType === 'string') return 'string';
  const metricName = metric?.__name__;
  const labels = _.keys(metric)
    .filter((ml) => ml !== '__name__')
    .map((label, i, labels) => (
      <span key={i}>
        <strong>{label}</strong>="{metric[label]}"{i === labels.length - 1 ? '' : ', '}
      </span>
    ));
  return (
    <>
      {metricName}
      {'{'}
      {labels}
      {'}'}
    </>
  );
}
function toFixedNoRound(num, fixed) {
  if (typeof num !== 'number') return num;
  const re = new RegExp(`^-?\\d+(?:\.\\d{0,${fixed || -1}})?`);
  const arr = num.toString().match(re);
  if (arr) return arr[0];
  return num.toString();
}

function getListItemValue(resultType, record) {
  if (resultType === 'scalar' || resultType === 'string') return _.get(record, '[1]') || '-';
  if (resultType === 'vector') {
    return _.get(record, 'value[1]', '-');
  }
  if (resultType === 'matrix' || resultType === 'streams') {
    const values = _.get(record, 'values');
    return (
      <div style={{ display: 'table' }}>
        {_.map(values, (value, i: number) => {
          const timestamp = _.get(value, 0);
          return (
            <div key={i} style={{ display: 'table-row' }}>
              <span style={{ display: 'table-cell', padding: '0 4px' }}>{_.get(value, 1, '-')}</span>
              <span style={{ display: 'table-cell', padding: '0 4px' }}>@{timestamp || '-'}</span>
              <span style={{ display: 'table-cell', padding: '0 4px' }}>{moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
              <span style={{ display: 'table-cell', padding: '0 4px' }}>{i > 0 ? `+${toFixedNoRound(timestamp - _.get(values[i - 1], 0), 0)}` : ''}</span>
            </div>
          );
        })}
      </div>
    );
  }
}

export default function Table(props: IProps) {
  const { url, datasourceValue, promql, setQueryStats, setErrorContent, contentMaxHeight, timestamp, setTimestamp, refreshFlag, queryRequest, queryPaused } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{
    resultType: ResultType;
    result: any[];
  }>({
    resultType: 'matrix',
    result: [],
  });

  useEffect(() => {
    // N36 批 E：这一帧的 `queryRequest` 当场抓进局部常量，后面只认它。
    // 这就是「谁发的请求谁来结」：同一个对象只会被它所在那一次 effect 捕获，
    // 后一次 `begin()` 会先把前一个 abort 掉（`usePendingQuery.ts:33`），
    // 所以前一条慢响应回来时它的 `complete` 早已结了、应答不到后一条请求。
    const request = queryRequest;
    if (queryPaused || request?.signal.aborted) return;
    if (datasourceValue && promql) {
      // 这一轮自己的 controller：用来真的掐断 HTTP 请求；外面要停时通过 request.signal 转进来。
      const controller = new AbortController();
      let settled = false;
      const abort = () => {
        controller.abort();
        setIsLoading(false);
        if (!settled) request?.complete(new DOMException('Query stopped', 'AbortError'));
      };
      request?.signal.addEventListener('abort', abort, { once: true });
      const queryStart = Date.now();
      setIsLoading(true);
      getPromData(
        `${url}/${datasourceValue}/api/v1/query`,
        {
          time: timestamp || moment().unix(),
          query: promql,
        },
        controller.signal,
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          const { resultType } = res;
          let { result } = res;
          const empty = !result || result.length === 0;
          let tooLong = false;
          let maxLength = 0;
          if (result) {
            if (result.length > LIMIT) {
              tooLong = true;
              maxLength = result.length;
              result = result.slice(LIMIT);
            }
            result.forEach((item) => {
              if (item.values && item.values.length > LIMIT) {
                tooLong = true;
                if (item.values.length > maxLength) {
                  maxLength = item.values.length;
                }
                item.values = item.values.slice(LIMIT);
              }
            });
          }
          if (tooLong) {
            setErrorContent(`Warning：Fetched ${maxLength} metrics, only displaying first ${LIMIT}`);
          } else {
            setErrorContent('');
          }
          if (resultType === 'scalar' || resultType === 'string') {
            setData({ resultType, result: [result] });
          } else {
            setData({ resultType, result });
          }
          setQueryStats({
            loadTime: Date.now() - queryStart,
            resultSeries: result.length,
          });
          settled = true;
          request?.complete({ empty, count: result.length });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          const msg = _.get(err, 'message');
          setErrorContent(`Error executing query: ${msg}`);
          settled = true;
          request?.complete(err instanceof Error ? err : new Error(String(msg || err)));
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setIsLoading(false);
        });
      return () => {
        request?.signal.removeEventListener('abort', abort);
        abort();
      };
    }
  }, [timestamp, datasourceValue, promql, refreshFlag, queryRequest, queryPaused]);

  return (
    <div className='prom-graph-table-container'>
      <div className='prom-graph-table-controls'>
        <Input.Group>
          <span className='ant-input-group-addon'>时间</span>
          <DatePicker
            value={timestamp ? moment.unix(timestamp) : undefined}
            onChange={(val) => {
              setTimestamp(val ? val.unix() : undefined);
            }}
            showTime
            placeholder='评估时间'
            getPopupContainer={() => document.body}
            disabledDate={(current) => current > moment()}
          />
        </Input.Group>
      </div>
      <List
        className='prom-graph-table-list'
        style={{
          maxHeight: contentMaxHeight,
        }}
        size='small'
        loading={isLoading}
        dataSource={data ? data.result : []}
        renderItem={(item) => {
          return (
            <List.Item>
              {data?.resultType != 'streams' && <div>{getListItemLabel(data?.resultType, item)}</div>}
              <div>{getListItemValue(data?.resultType, item)}</div>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
