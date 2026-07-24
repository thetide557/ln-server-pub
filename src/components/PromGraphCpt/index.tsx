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
/**
 * 类似 prometheus graph 的组件
 */
import React, { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Input, Tabs, Button, Alert, Checkbox } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import PromQueryBuilderModal from '@/components/PromQueryBuilder/PromQueryBuilderModal';
import PromQLInput from '../PromQLInput';
import Table from './Table';
import Graph from './Graph';
import QueryStatsView, { QueryStats } from './components/QueryStatsView';
import MetricsExplorer from './components/MetricsExplorer';
import { CommonStateContext } from '@/App';
import { cn_name, en_name } from "../PromQueryBuilder/components/metrics_translation"
import './locale';
import './style.less';

interface IProps {
  url?: string;
  datasourceValue: number;
  contentMaxHeight?: number;
  type?: 'table' | 'graph';
  onTypeChange?: (type: 'table' | 'graph') => void;
  defaultTime?: IRawTimeRange | number;
  onTimeChange?: (time: IRawTimeRange) => void; // 用于外部控制时间范围
  promQL?: string;
  graphOperates?: {
    enabled: boolean;
  };
  globalOperates?: {
    enabled: boolean;
  };
  headerExtra?: HTMLDivElement | null;
  executeQuery?: (promQL?: string) => void;
}

const TabPane = Tabs.TabPane;

export default function index(props: IProps) {
  const { t } = useTranslation('promGraphCpt');
  const {
    url = '/api/takin/proxy',
    datasourceValue,
    promQL,
    contentMaxHeight = 300,
    type = 'table',
    onTypeChange,
    defaultTime,
    onTimeChange,
    graphOperates = {
      enabled: false,
    },
    globalOperates = {
      enabled: false,
    },
    headerExtra,
    executeQuery,
  } = props;
  const [value, setValue] = useState<any>(promQL); // for promQLInput
  const [promql, setPromql] = useState<string | undefined>(promQL);
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [errorContent, setErrorContent] = useState('');
  const { profile, permList } = useContext(CommonStateContext);
  const [tabActiveKey, setTabActiveKey] = useState<any>(type);
  const [timestamp, setTimestamp] = useState<number>(); // for table
  const [refreshFlag, setRefreshFlag] = useState(_.uniqueId('refreshFlag_')); // for table
  const [range, setRange] = useState<IRawTimeRange>({ start: 'now-1h', end: 'now' }); // for graph
  // const [range, setRange] = useState<IRawTimeRange>({ start: '', end: '' }); // for graph
  const [step, setStep] = useState<number>(); // for graph
  const [metricsExplorerVisible, setMetricsExplorerVisible] = useState(false);
  const [completeEnabled, setCompleteEnabled] = useState(true);
  const promQLInputRef = useRef<any>(null);
  const [keydes, setKeydes] = useState<string | null>(null);


  useEffect(() => {
    if (typeof defaultTime === 'number') {
      if (tabActiveKey == 'table') {
        setTimestamp(defaultTime);
      }
    } else {
      if (defaultTime?.start && defaultTime?.end) {
        setRange(defaultTime);
      }
    }
  }, [defaultTime]);

  useEffect(() => {
    const names = {
      ...cn_name,
      ...en_name
    }
    for (const key in names) {
      if (value?.includes(key)) {
        setKeydes(cn_name[key]);
        break;
      } else {
        setKeydes('');
      }
    }
  }, [value]);

  // useEffect(() => {
  //   setTabActiveKey(type);
  // }, [type]);

  useEffect(() => {
    if (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/table")) {
      setTabActiveKey('table')
    } else if (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/graph")) {
      setTabActiveKey('graph')
    } else {
      setTabActiveKey('')
    }
  }, [])

  useEffect(() => {
    setValue(promql);
    setPromql(promql);
  }, [promql]);

  return (
    <div className='prom-graph-container'>
      {headerExtra && globalOperates.enabled ? (
        createPortal(
          <div className='prom-graph-global-operate' style={{ marginTop: 5 }}>
            <Checkbox
              checked={completeEnabled}
              onChange={(e) => {
                setCompleteEnabled(e.target.checked);
              }}
            >
              启用自动完成
            </Checkbox>
          </div>,
          headerExtra,
        )
      ) : (
        <div className='prom-graph-global-operate'>
          <Checkbox
            checked={completeEnabled}
            onChange={(e) => {
              setCompleteEnabled(e.target.checked);
            }}
          >
            启用自动完成
          </Checkbox>
        </div>
      )}

      <div className='prom-graph-expression-input'>
        <Input.Group>
          <span className='ant-input-affix-wrapper'>
            <PromQLInput
              ref={promQLInputRef}
              url={url}
              value={value}
              onChange={setValue}
              executeQuery={(val) => {
                setPromql(val);
                executeQuery && executeQuery(val);
              }}
              completeEnabled={completeEnabled}
              datasourceValue={datasourceValue}
            />
            <span className='ant-input-suffix'>
              <GlobalOutlined
                className='prom-graph-metrics-target'
                onClick={() => {
                  setMetricsExplorerVisible(true);
                }}
              />
            </span>
          </span>
          <span
            className='ant-input-group-addon'
            style={{
              border: 0,
              padding: '0 0 0 10px',
              background: 'none',
            }}
          >
            {
              (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/newMode")) && <Button
                onClick={() => {
                  PromQueryBuilderModal({
                    range,
                    datasourceValue,
                    value,
                    onChange: setValue,
                  });
                }}
              >
                {t('builder_btn')}
              </Button>
            }

          </span>
          <span
            className='ant-input-group-addon'
            style={{
              border: 0,
              padding: '0 0 0 10px',
              background: 'none',
            }}
          >
            {
              (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/query")) && <Button
                type='primary'
                onClick={() => {
                  setRefreshFlag(_.uniqueId('refreshFlag_'));
                  setPromql(value);
                  executeQuery && executeQuery(value);
                }}
              >
                {t('query_btn')}
              </Button>
            }

          </span>
        </Input.Group>
      </div>
      {/* <div className='key-des'><span className='key-title'>指标关键词说明：</span> {cn_name[value] ? cn_name[value] : en_name[value] ? en_name[value] : ''}</div> */}
      <div className='key-des'>
        <img src='/image/monitor-alert-center/key-desc.png' alt='' style={{ width: 16, height: 16, marginRight: 10, flexShrink: 0 }} />
        <span className='key-title'>指标关键词说明：</span> {keydes}
      </div>
      {errorContent && <Alert style={{ marginBottom: 16 }} message={errorContent} type='error' />}
      <div style={{ minHeight: 0, height: '100%' }}>
        <Tabs
          destroyInactiveTabPane
          tabBarGutter={0}
          activeKey={tabActiveKey}
          onChange={(key: 'table' | 'graph') => {
            setTabActiveKey(key);
            onTypeChange && onTypeChange(key);
            setErrorContent('');
            setQueryStats(null);
          }}
          type='card'
          tabBarExtraContent={queryStats && <QueryStatsView {...queryStats} />}
        >
          {
            (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/table")) && <TabPane tab='表格' key='table'>
              <Table
                url={url}
                contentMaxHeight={contentMaxHeight}
                datasourceValue={datasourceValue}
                promql={promql}
                setQueryStats={setQueryStats}
                setErrorContent={setErrorContent}
                timestamp={timestamp}
                setTimestamp={(val) => {
                  setTimestamp(val);
                }}
                refreshFlag={refreshFlag}
              />
            </TabPane>
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/metric/explorer/graph")) && <TabPane tab='图表' key='graph'>
              <Graph
                url={url}
                contentMaxHeight={contentMaxHeight}
                datasourceValue={datasourceValue}
                promql={promql}
                setQueryStats={setQueryStats}
                setErrorContent={setErrorContent}
                range={range}
                setRange={(newRange) => {
                  setRange(newRange);
                  onTimeChange && onTimeChange(newRange);
                }}
                step={step}
                setStep={setStep}
                graphOperates={graphOperates}
                refreshFlag={refreshFlag}
              />
            </TabPane>
          }
        </Tabs>
      </div>
      <MetricsExplorer
        url={url}
        datasourceValue={datasourceValue}
        show={metricsExplorerVisible}
        updateShow={setMetricsExplorerVisible}
        insertAtCursor={(val) => {
          if (promQLInputRef.current !== null) {
            const { from, to } = promQLInputRef.current.state.selection.ranges[0];
            // console.log('from',from);
            // console.log('to',to);
            // console.log(promQLInputRef.current);
            promQLInputRef.current.dispatch(
              promQLInputRef.current.state.update({
                changes: { from, to, insert: val },
                // changes: { from: 0, to: value?.length || 0, insert: val },
              }),
            );
          }
        }}
      />
    </div>
  );
}
