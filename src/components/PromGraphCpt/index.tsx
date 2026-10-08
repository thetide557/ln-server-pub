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
import React, { useState, useRef, useEffect, useLayoutEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Input, Tabs, Button, Alert, Checkbox, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import PromQueryBuilderModal from '@/components/PromQueryBuilder/PromQueryBuilderModal';
// N36 批 E：AI 查询停靠栏要的三样。`QueryDockControl` / `QueryDockSnapshot` 是「代我操作查询面板」
// 那套回调的类型；`usePendingQuery` 管「谁发的请求谁来结」；`QueryBoxColumn` 负责把面板挂在查询条下面。
import type { QueryDockControl, QueryDockSnapshot } from '@/components/AiQueryDock/useQueryDockActions';
import { usePendingQuery } from '@/components/AiQueryDock/usePendingQuery';
import { QueryBoxColumn } from '@/components/QueryBoxPrefix';
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
  // 第六步：AI 浮窗回填用，不传则不生效
  extra?: React.ReactNode;
  fillPromQL?: { value: string; seq: number };
  /** Sits inside the PromQL box at its left end (e.g. the AI trigger); noticeBanner then hangs under the box, as wide as it. */
  queryExtra?: React.ReactNode;
  noticeBanner?: React.ReactNode; // 查询框与结果区之间的提示横幅（如数据源体检结论），由调用方控制显隐
  /**
   * Lets the page drive the query box the way a user would: write into it,
   * then press 查询. Separate steps on purpose — the assistant's cursor moves
   * between them, so what the user sees matches what happened.
   */
  controlRef?: React.MutableRefObject<PromGraphControl | null>;
  onUserContextChange?: () => void;
}

export interface PromGraphSnapshot extends QueryDockSnapshot {
  submitted?: string;
  range: IRawTimeRange;
  timestamp?: number;
}

export type PromGraphControl = QueryDockControl<PromGraphSnapshot>;

const TabPane = Tabs.TabPane;

export default function index(props: IProps) {
  const { t } = useTranslation('promGraphCpt');
  const {
    url = '/api/n9e/proxy',
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
    extra,
    fillPromQL,
    queryExtra,
    noticeBanner,
    controlRef,
    onUserContextChange,
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

  // ---- N36 批 E：AI 查询停靠栏的接线。上游对应 `PromGraphCpt/index.tsx:133-276`（fe ee48e701）。
  // 羚牛这版组件是 `value`（输入框文本）/ `promql`（已提交查询）双 state，上游是
  // `value` / `submitted`；下面这几个 ref 就是把这两个 state 的「当下值」同步留一份，
  // 好让停靠栏的回调（它们在闭包里，拿不到最新的 state）读得到。
  const valueRef = useRef<string | undefined>(promQL);
  const submittedRef = useRef<string | undefined>(promQL);
  const rangeRef = useRef(range);
  const timestampRef = useRef(timestamp);
  /** 用户每动一下查询面板就 +1；停靠栏用它判断「这一轮对话开始时看到的面板，还是不是现在这个」。 */
  const revisionRef = useRef(0);
  /** 查询条那一行的容器，`queryInput()` 从它里面找查询框本体。 */
  const inputWrapRef = useRef<HTMLDivElement>(null);
  /** 「查询」按钮本体，`queryButton()` 要把光标指到它上面。 */
  const queryButtonRef = useRef<HTMLElement>(null);
  const pending = usePendingQuery();
  const [queryPaused, setQueryPaused] = useState(false);
  // 羚牛老组件里有个 effect（下面 `[promql]` 那个）会在「已提交查询」一变就把输入框文本盖成它。
  // 撤销（restore）要能把「输入框里有还没执行的文本」原样放回，所以给它一个一次性开关。
  // 原由与判据见 `第六步-流水线/n36/拿不准-E.md` U-N36-E-2。
  const skipValueSyncRef = useRef(false);

  // 羚牛自改的权限门控：原来这四个判断在 6 处各写一遍（改前 `:133`、`:135`、`:222`、`:246`、`:279`、`:296`），
  // 这里提成常量，表达式一字未改——停靠栏的 `run()` 也要用它们，不能绕开门控。
  const canSeeTable = profile.roles?.includes('Admin') || permList.includes('/metric/explorer/table');
  const canSeeGraph = profile.roles?.includes('Admin') || permList.includes('/metric/explorer/graph');
  const canUseBuilder = profile.roles?.includes('Admin') || permList.includes('/metric/explorer/newMode');
  const canQuery = profile.roles?.includes('Admin') || permList.includes('/metric/explorer/query');

  const change = (next?: string) => {
    valueRef.current = next;
    setValue(next);
  };
  const updateSubmitted = (next?: string) => {
    submittedRef.current = next;
    setPromql(next);
  };
  const updateRange = (next: IRawTimeRange) => {
    rangeRef.current = _.cloneDeep(next);
    setRange(next);
  };
  const updateTimestamp = (next?: number) => {
    timestampRef.current = next;
    setTimestamp(next);
  };
  /** 用户自己动了面板：撤销作废、挂着的那次运行作废、暂停解除。 */
  const invalidate = () => {
    revisionRef.current += 1;
    onUserContextChange?.();
    pending.clear();
    setQueryPaused(false);
  };
  /** 和用户点「查询」走同一条路：把输入框文本提交出去并刷新一次。 */
  const submit = (next?: string) => {
    setRefreshFlag(_.uniqueId('refreshFlag_'));
    updateSubmitted(next);
    executeQuery && executeQuery(next);
  };

  // 羚牛的 `PromQLInput` 把这两个回调存进它自己的 ref，而那个 effect 的依赖里只有 `onChange`
  // （`src/components/PromQLInput/index.tsx:195`，effect 体 `:80` 才更新 executeQuery 的 ref）。
  // 改前 `onChange` 传的是 `setValue`、身份天然稳定，effect 挂载后就不再重跑；现在要传一个
  // 会用到最新 state 的回调，所以必须①保持身份稳定（否则每次渲染都去重配 CodeMirror），
  // ②里面读到的是最新一帧——用 ref 转一道，两样都保住。
  const draftChangeRef = useRef<(next?: string) => void>(() => {});
  const runFromInputRef = useRef<(next?: string) => void>(() => {});
  draftChangeRef.current = (next) => {
    // 用户在框里打字：面板归用户，停靠栏的撤销作废；同时先按住取数，
    // 别让「挂着的那次运行被作废」这一下把上一条已提交的查询又跑一遍（上游 `:332-338` 同款）。
    if (next !== valueRef.current) {
      invalidate();
      setQueryPaused(true);
    }
    change(next);
  };
  runFromInputRef.current = (next) => {
    // 在框里按回车 = 既显示也执行（羚牛改前是 `setPromql(val)`，这里只多一次作废与解除暂停）。
    invalidate();
    updateSubmitted(next);
    executeQuery && executeQuery(next);
  };
  const handleDraftChange = React.useCallback((next?: string) => draftChangeRef.current(next), []);
  const handleRunFromInput = React.useCallback((next?: string) => runFromInputRef.current(next), []);

  // 外部条件（数据源、外面传进来的 PromQL、代理地址）换了，等于换了一个面板，撤销作废。
  const externalContext = JSON.stringify({ datasourceValue, url, promQL, defaultTime, type });
  const previousContextRef = useRef(externalContext);
  useLayoutEffect(() => {
    if (previousContextRef.current !== externalContext) {
      previousContextRef.current = externalContext;
      invalidate();
    }
  }, [externalContext]);

  // `usePendingQuery` 每次渲染都给一个新对象，所以这里依赖它里面那个稳定的回调；
  // 依赖对象本身会让每次渲染都把在途的那次运行掐掉。
  const { abort: abortPending } = pending;
  useEffect(() => () => abortPending(), [abortPending]);

  useEffect(() => {
    if (typeof defaultTime === 'number') {
      if (tabActiveKey == 'table') {
        updateTimestamp(defaultTime);
      }
    } else {
      if (defaultTime?.start && defaultTime?.end) {
        updateRange(defaultTime);
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
    if (canSeeTable) {
      setTabActiveKey('table')
    } else if (canSeeGraph) {
      setTabActiveKey('graph')
    } else {
      setTabActiveKey('')
    }
  }, [])

  useEffect(() => {
    // N36 批 E：撤销（restore）要写回一对可以不相等的「输入框文本 / 已提交查询」，
    // 这一次就别把输入框文本盖掉。见 `n36/拿不准-E.md` U-N36-E-2。
    if (skipValueSyncRef.current) {
      skipValueSyncRef.current = false;
      return;
    }
    change(promql);
    updateSubmitted(promql);
  }, [promql]);

  // 第六步：外部（AI 浮窗）回填 PromQL；fillPromQL 不传时永不触发
  useEffect(() => {
    if (!fillPromQL) return;
    // N36 批 E：浮窗回填也是「用户动了面板」，停靠栏的撤销要作废。
    invalidate();
    change(fillPromQL.value);
    updateSubmitted(fillPromQL.value);
  }, [fillPromQL?.seq]);

  // N36 批 E：把「代我操作查询面板」那八件交给停靠栏。每次渲染都重新挂一遍（上游同款），
  // 这样回调里读到的 state / props 永远是最新的那一帧；卸载时置空。
  useLayoutEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      snapshot: () => ({
        query: valueRef.current || '',
        submitted: submittedRef.current,
        range: _.cloneDeep(rangeRef.current),
        timestamp: timestampRef.current,
      }),
      revision: () => revisionRef.current,
      fill: (next, nextRange) => {
        pending.abort();
        setQueryPaused(true);
        change(next);
        if (nextRange) updateRange(nextRange);
      },
      run: ({ signal } = {}) => {
        if (!valueRef.current?.trim() || !datasourceValue) return Promise.reject(new Error('A query and data source are required'));
        // 羚牛自改的权限门控在渲染层：没权限就没有「查询」按钮、也没有对应的结果面板，
        // 那样取数的 effect 根本不会跑、`complete` 没人调，停靠栏会一直挂着。
        // 所以这里先替它判一次，宁可报错也不挂住（任务书第二节尺子 4）。
        if (!canQuery) return Promise.reject(new Error('No permission to run this query'));
        if (!(tabActiveKey === 'table' ? canSeeTable : tabActiveKey === 'graph' ? canSeeGraph : false)) {
          return Promise.reject(new Error('No result panel is available to run this query'));
        }
        // 开一次运行和把它发出去要放在同一块里，取数那边才能在同一帧里同时拿到请求和刷新标记。
        const result = pending.begin(signal);
        setQueryPaused(false);
        submit(valueRef.current);
        return result;
      },
      restore: (snapshot) => {
        pending.clear();
        setErrorContent('');
        setQueryStats(null);
        setQueryPaused(false);
        // 只有「已提交查询」真的会变，上面那个 `[promql]` effect 才会触发，也只在那时才需要跳过一次。
        if (snapshot.submitted !== submittedRef.current) skipValueSyncRef.current = true;
        change(snapshot.query);
        updateSubmitted(snapshot.submitted);
        updateRange(_.cloneDeep(snapshot.range));
        updateTimestamp(snapshot.timestamp);
        setRefreshFlag(_.uniqueId('refreshFlag_'));
      },
      // 要的是查询框本体、不是整行：高亮圈不该把两个按钮和面板一起圈进去。
      queryInput: () => inputWrapRef.current?.querySelector('.ant-input-affix-wrapper') ?? inputWrapRef.current,
      queryButton: () => queryButtonRef.current,
    };
    return () => {
      controlRef.current = null;
    };
  });

  return (
    <div className='prom-graph-container'>
      {headerExtra && globalOperates.enabled ? (
        createPortal(
          <div className='prom-graph-global-operate' style={{ marginTop: 5 }}>
            <Space size={8}>
              <Checkbox
                checked={completeEnabled}
                onChange={(e) => {
                  setCompleteEnabled(e.target.checked);
                }}
              >
                启用自动完成
              </Checkbox>
              {extra}
            </Space>
          </div>,
          headerExtra,
        )
      ) : (
        <div className='prom-graph-global-operate'>
          <Space size={8}>
            <Checkbox
              checked={completeEnabled}
              onChange={(e) => {
                setCompleteEnabled(e.target.checked);
              }}
            >
              启用自动完成
            </Checkbox>
            {extra}
          </Space>
        </div>
      )}

      {/*
        N36 批 E：`QueryBoxColumn` 在「既没有 prefixed 也没有 below」时原样返回 children
        （`src/components/QueryBoxPrefix/index.tsx:44`），所以停靠栏开关关着（noticeBanner 为
        undefined）时，这里一层 div 都不会多出来，DOM 与改前逐字相同。
        与上游的差异：上游把面板挂在「查询框那一列」下面（框有多宽面板就多宽），羚牛这版查询条是
        antd 的 `Input.Group`（`display:table`，两个按钮是表格单元），在它和框之间插一层 div 会把
        表格布局拆掉，所以面板挂在整行查询条下面、比上游宽两个按钮。见 `n36/拿不准-E.md` U-N36-E-4。
      */}
      <QueryBoxColumn below={noticeBanner}>
      <div className='prom-graph-expression-input' ref={inputWrapRef}>
        <Input.Group>
          <span className='ant-input-affix-wrapper'>
            {/*
              停靠栏的入口按钮，钉在查询框里最左边。`.ant-input-affix-wrapper` 是 inline-flex
              （antd `lib/input/style/affix.less:10`），所以这里当一个 flex 子元素插进去就自然在
              最左、把编辑器往右挤，不用 absolute 定位、不用改 less。queryExtra 不传时整段不渲染。
            */}
            {queryExtra ? <span className='flex items-center pr-1'>{queryExtra}</span> : null}
            <PromQLInput
              ref={promQLInputRef}
              url={url}
              value={value}
              onChange={handleDraftChange}
              executeQuery={handleRunFromInput}
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
              canUseBuilder && <Button
                onClick={() => {
                  PromQueryBuilderModal({
                    range,
                    datasourceValue,
                    value,
                    onChange: (next) => {
                      // 用查询构造器拼出来的也算用户自己改的，撤销作废。
                      invalidate();
                      change(next);
                    },
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
              canQuery && <Button
                ref={queryButtonRef}
                type='primary'
                onClick={() => {
                  invalidate();
                  submit(valueRef.current);
                }}
              >
                {t('query_btn')}
              </Button>
            }

          </span>
        </Input.Group>
      </div>
      </QueryBoxColumn>
      {/* <div className='key-des'><span className='key-title'>指标关键词说明：</span> {cn_name[value] ? cn_name[value] : en_name[value] ? en_name[value] : ''}</div> */}
      <div className='key-des'><span className='key-title'>指标关键词说明：</span> {keydes}</div>
      {errorContent && <Alert style={{ marginBottom: 16 }} message={errorContent} type='error' />}
      <div style={{ minHeight: 0, height: '100%' }}>
        <Tabs
          destroyInactiveTabPane
          tabBarGutter={0}
          activeKey={tabActiveKey}
          onChange={(key: 'table' | 'graph') => {
            invalidate();
            setTabActiveKey(key);
            onTypeChange && onTypeChange(key);
            setErrorContent('');
            setQueryStats(null);
          }}
          type='card'
          tabBarExtraContent={queryStats && <QueryStatsView {...queryStats} />}
        >
          {
            canSeeTable && <TabPane tab='表格' key='table'>
              <Table
                url={url}
                contentMaxHeight={contentMaxHeight}
                datasourceValue={datasourceValue}
                promql={promql}
                setQueryStats={setQueryStats}
                setErrorContent={setErrorContent}
                timestamp={timestamp}
                setTimestamp={(val) => {
                  invalidate();
                  updateTimestamp(val);
                }}
                refreshFlag={refreshFlag}
                queryRequest={pending.queryRequest}
                queryPaused={queryPaused}
              />
            </TabPane>
          }
          {
            canSeeGraph && <TabPane tab='图表' key='graph'>
              <Graph
                url={url}
                contentMaxHeight={contentMaxHeight}
                datasourceValue={datasourceValue}
                promql={promql}
                setQueryStats={setQueryStats}
                setErrorContent={setErrorContent}
                range={range}
                setRange={(newRange) => {
                  invalidate();
                  updateRange(newRange);
                  onTimeChange && onTimeChange(newRange);
                }}
                step={step}
                setStep={(next) => {
                  if (next !== step) {
                    invalidate();
                  }
                  setStep(next);
                }}
                graphOperates={graphOperates}
                refreshFlag={refreshFlag}
                queryRequest={pending.queryRequest}
                queryPaused={queryPaused}
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
