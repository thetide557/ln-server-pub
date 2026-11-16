/**
 * 第六步 第 4 段 · 阶段 1（W1-ES 组）· opensearch 告警规则编辑器的渲染测试。
 *
 * opensearch **没有自己的组件**，用的就是 `src/plugins/elasticsearch/AlertRule/` 这一套，
 * 只是分发时多传一个 `hideIndexPattern`（fe v9.1.0 src/pages/alertRules/Form/Rule/Rule/index.tsx:45）。
 * 所以这条测试和同目录的 elasticsearch.alertRule.render.test.tsx 是同一套断言，
 * 差别只有两处：①渲染时多传 hideIndexPattern；②反过来断言「不去拉索引模式列表」。
 *
 * 要证的事和阶段 0 的 ck 那条一样，也是本阶段最要紧的一件：
 * 从 fe v9.1.0 搬来的 ES 告警编辑器，放进羚牛的「一条规则最多 5 个策略」表单里
 * （外层 `<Form.List name='strategies'>`）之后，**字段真的落在 strategies[n].rule_config 下面**，
 * 而不是落在表单顶层的 rule_config 上。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'index'] → id="strategies_0_rule_config_queries_0_index"
 * 所以只要 DOM 里出现这些 id，路径就是对的；反过来，如果适配没做对，
 * id 会是 "rule_config_queries_0_index"（掉在顶层）或者干脆没有。
 * 这比按中文文案断言稳，不受 i18n 改词影响（`../README.md` 第三节第 3 条）。
 *
 * 用 @testing-library 的 render 而不是 renderToString：搬来的 Triggers.tsx 靠 `Form.useWatch`
 * 决定「触发条件」那一整块显不显示（`exp_trigger_disable === false` 才展开），
 * ES 自己的 Query.tsx 也靠 `Form.useWatch` 拿 index_type 决定「日期字段」那一栏出不出来，
 * 而 useWatch 的初值是在 useEffect 里灌的（node_modules/rc-field-form/lib/useWatch.js:56-83），
 * renderToString 不跑 effect，那两块永远是空的。先例：`./ck.alertRule.render.test.tsx`。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 ./ck.alertRule.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 共享的 Triggers 里，表达式模式那一块（Code.tsx）用的是整包 monaco（只发 ESM、还要 web worker），
// jest 跑不动，换成把 value 原样吐出来的小组件；id 要原样挂到 DOM 上，本测试正是靠 id 断言路径。
jest.mock('@fc-components/monaco-editor', () => ({
  __esModule: true,
  SqlMonacoEditor: (props: any) => (
    <div id={props.id} data-testid='sql-editor'>
      {props.value}
    </div>
  ),
  ExprMonacoEditor: (props: any) => (
    <div id={props.id} data-testid='expr-editor'>
      {props.value}
    </div>
  ),
}));
// Code.tsx:24 直接 import 了包内的深层路径，上面那条 mock 盖不到它，单独换掉。
jest.mock('@fc-components/monaco-editor/src/expr/validation', () => ({
  __esModule: true,
  validateExpr: () => ({ isValid: true }),
}));
// Query.tsx:9 的「查询语法说明」抽屉，里面是 @uiw/react-md-editor，与本测试要证的事无关，整个换掉。
// 它是被当函数调用的（Query.tsx:152 `DocumentDrawer({...})`），所以 default 换成一个 jest.fn。
jest.mock('@/components/DocumentDrawer', () => ({
  __esModule: true,
  default: jest.fn(),
  Document: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// 编辑器一挂载就去拉索引列表 / 字段列表（Queries/index.tsx:27、Value.tsx:40、DateField.tsx:25、GroupBy/index.tsx:29），
// 这里换成空数据，免得测试里跑真网络。
jest.mock('@/pages/explorer/Elasticsearch/services', () => ({
  __esModule: true,
  getIndices: jest.fn(() => Promise.resolve([])),
  getFields: jest.fn(() => Promise.resolve({ fields: [], allFields: [] })),
  getFullFields: jest.fn(() => Promise.resolve({ fields: [], allFields: [] })),
}));
// Query.tsx:57 的索引模式列表（elasticsearch 才有，opensearch 传 hideIndexPattern 后不请求）
jest.mock('@/pages/log/IndexPatterns/services', () => ({
  __esModule: true,
  getESIndexPatterns: jest.fn(() => Promise.resolve([])),
}));
// GraphPreview（数据预览）一点开就发请求；这里换成空数据。
jest.mock('@/plugins/elasticsearch/AlertRule/services', () => ({
  __esModule: true,
  getDsQuery: jest.fn(() => Promise.resolve({ dat: [] })),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
}));
// 智能告警的算法列表（只在 cate==='prometheus' 且开了 fcBrain 时才会渲染，ES 走不到，兜底 mock）
jest.mock('@/pages/alertRules/FormNG/components/Triggers/AnomalyTrigger/services', () => ({
  __esModule: true,
  getAlgorithms: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/pages/alertRules/locale';
import '@/components/QueryName/locale';

import { getESIndexPatterns } from '@/pages/log/IndexPatterns/services';
import ElasticsearchAlertRule from '@/plugins/elasticsearch/AlertRule';

// 一条 elasticsearch 策略的初值。形状照 fe v9.1.0 的 ES 查询字段
//（Queries/Query.tsx 的 index_type / index / filter / interval / date_field，Value.tsx 的 value.func，
//  GroupBy/Terms.tsx 的 group_by[].cate / field），再补上真实取值用来验回填。
const osStrategy = {
  cate: 'opensearch',
  prod: 'metric',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        ref: 'A',
        index_type: 'index',
        index: 'log-2026.09.09',
        filter: 'status:500',
        date_field: '@timestamp',
        interval: 5,
        interval_unit: 'min',
        value: {
          func: 'count',
        },
        group_by: [
          {
            cate: 'terms',
            field: 'host',
          },
        ],
      },
    ],
    triggers: [
      {
        mode: 0,
        expressions: [
          {
            ref: 'A',
            comparisonOperator: '>',
            value: 0,
            logicalOperator: '&&',
          },
        ],
        severity: 2,
        recover_config: {
          judge_type: 0,
        },
      },
    ],
    exp_trigger_disable: false,
    nodata_trigger: {
      enable: false,
      severity: 2,
      resolve_after_enable: false,
    },
  },
};

function renderInStrategies(strategy: any = osStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与真实分发点一致：cate === 'opensearch' 时多传 hideIndexPattern
              // （fe v9.1.0 src/pages/alertRules/Form/Rule/Rule/index.tsx:45 就是这么分的）
              <ElasticsearchAlertRule key={field.key} field={field} hideIndexPattern cate='opensearch' datasourceValue={[1]} disabled={false} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 1 · opensearch 告警规则编辑器（与 elasticsearch 共用组件，多传 hideIndexPattern）', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（不是表单顶层）', () => {
    const { container } = renderInStrategies();
    // 索引类型下拉：name=['strategies',0,'rule_config','queries',0,'index_type']
    expect(container.querySelector('#strategies_0_rule_config_queries_0_index_type')).not.toBeNull();
    // 索引输入框（index_type === 'index' 时才渲染，所以这一条同时证明了 useWatch 用绝对路径取到了值）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_index')).not.toBeNull();
    // 过滤条件（Lucene）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_filter')).not.toBeNull();
    // 日期字段（同样只在 index_type === 'index' 时渲染）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_date_field')).not.toBeNull();
    // 执行频率与单位
    expect(container.querySelector('#strategies_0_rule_config_queries_0_interval')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_queries_0_interval_unit')).not.toBeNull();
    // 聚合函数（Value.tsx）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_value_func')).not.toBeNull();
    // 高级设置里的 Offset（AdvancedSettings/index.tsx:60）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_offset')).not.toBeNull();
    // Group By 里的 Field key（GroupBy/index.tsx:53 的 Form.List → Terms.tsx:34），
    // 它只有在 getFieldValue([...parentNames, ...]) 用绝对路径取到 cate==='terms' 时才渲染
    expect(container.querySelector('#strategies_0_rule_config_queries_0_group_by_0_field')).not.toBeNull();
    // 查询别名 QueryName 不是原生 input（未编辑时是一个 div，不接 antd 注入的 id），
    // 所以这里按它显示出来的文本断言：初值 'A' 要显示出来
    expect(container.innerHTML).toContain('>A<');
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_index')).toBeNull();
    expect(container.querySelector('#rule_config_queries_0_date_field')).toBeNull();
  });

  it('已有的索引和过滤条件能回填进编辑器', () => {
    const { container } = renderInStrategies();
    const index = container.querySelector('#strategies_0_rule_config_queries_0_index') as HTMLInputElement;
    const filter = container.querySelector('#strategies_0_rule_config_queries_0_filter') as HTMLInputElement;
    expect(index.value).toBe('log-2026.09.09');
    expect(filter.value).toBe('status:500');
  });

  it('opensearch 不去拉索引模式列表（hideIndexPattern 真的传到位了）', () => {
    renderInStrategies();
    // Query.tsx:56-61：只有 hideIndexPattern 为假时才请求索引模式列表。
    // 这一条就是「hideIndexPattern 从分发处一路传到 Query.tsx」的证据——
    // 它要经过 AlertRule/index.tsx → Queries/index.tsx → Query.tsx 三层。
    expect(getESIndexPatterns).not.toHaveBeenCalled();
  });

  it('触发条件那一整块出得来，且字段同样落在 strategies[0].rule_config 下', () => {
    const { container } = renderInStrategies();
    // 「触发条件」总开关：name=['strategies',0,'rule_config','exp_trigger_disable']
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 触发条件卡片里的模式单选：只在 exp_trigger_disable === false 时才渲染（Triggers.tsx 的 :58 那段），
    // 所以这一条同时证明了「useWatch 用的是绝对路径、取到了值」。
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).not.toBeNull();
    // 再往里一层：表达式（Builder.tsx）、告警级别（Severity）、恢复判断（RecoverConfig）
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_expressions_0_ref')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_severity')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_recover_config_judge_type')).not.toBeNull();
    // 「数据缺失」告警的开关
    expect(container.querySelector('#strategies_0_rule_config_nodata_trigger_enable')).not.toBeNull();
  });

  it('exp_trigger_disable 为 true 时，触发条件那块收起来（反证 useWatch 真的读到了值）', () => {
    const { container } = renderInStrategies({
      ...osStrategy,
      rule_config: { ...osStrategy.rule_config, exp_trigger_disable: true },
    });
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).toBeNull();
  });
});
