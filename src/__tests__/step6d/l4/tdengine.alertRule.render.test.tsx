/**
 * 第六步 第 4 段 · 阶段 1（W1-时序组）· TDengine 告警规则编辑器的渲染测试。
 *
 * 要证的事和阶段 0 的 ck 那条一模一样：
 * 从 fe v9.1.0 搬来的 TDengine 告警编辑器，放进羚牛的「一条规则最多 5 个策略」表单里
 * （外层 `<Form.List name='strategies'>`）之后，**字段真的落在 strategies[n].rule_config 下面**，
 * 而不是落在表单顶层的 rule_config 上。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'query'] → id="strategies_0_rule_config_queries_0_query"
 * 所以只要 DOM 里出现这些 id，路径就是对的；反过来，如果适配没做对，
 * id 会是 "rule_config_queries_0_query"（掉在顶层）或者干脆没有。
 * 这比按中文文案断言稳，不受 i18n 改词影响。
 *
 * 用 @testing-library 的 render 而不是 renderToString：搬来的 Triggers.tsx 靠 `Form.useWatch`
 * 决定「触发条件」那一整块显不显示（`exp_trigger_disable === false` 才展开），
 * 而 useWatch 的初值是在 useEffect 里灌的（node_modules/rc-field-form/lib/useWatch.js:56-83），
 * renderToString 不跑 effect，那块永远是空的。写法照 ./ck.alertRule.render.test.tsx。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 ./ck.alertRule.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// @fc-components/monaco-editor 里是整包 monaco（只发 ESM、还要 web worker），jest 跑不动。
// 换成一个把 value 原样吐出来的小组件——本测试要断言 SQL 文本确实回填进去了，
// 而且要把 antd 注入的 id 原样挂到 DOM 上（本测试正是靠这个 id 断言字段路径）。
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
// 「查询语法说明」抽屉（src/components/DocumentDrawer/index.tsx:5）import 了只发 ESM 的
// @uiw/react-md-editor，与本测试要证的事无关，整个换掉。
jest.mock('@/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
  Document: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// GraphPreview（查询结果预览）、SqlTemplates（SQL 模板下拉）、MetaModal（库表树）一挂载就发请求；
// 这里换成空数据，免得测试里跑真网络。函数名照 src/plugins/TDengine/services.ts 的 export 列表。
jest.mock('@/plugins/TDengine/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getColumns: jest.fn(() => Promise.resolve([])),
  getDsQuery: jest.fn(() => Promise.resolve([])),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  getSqlTemplate: jest.fn(() => Promise.resolve({})),
}));
// 预览弹层里的时序图（src/pages/dashboard/Renderer/Renderer/Timeseries）会拉起 @fc-plot/ts-graph
// （UMD 包，靠 d3 在真 canvas 上画图）。它跟本测试要证的「字段路径」没关系，在 jsdom 里又只有
// setupTests.ts 那个假 canvas，容易平白报错，所以整个换成一个占位 div。
// 任务书点名：pub 版 Timeseries 要保留、不许改，报错就在测试里 mock 掉——这里就是那个 mock。
jest.mock('@/pages/dashboard/Renderer/Renderer/Timeseries', () => ({
  __esModule: true,
  default: () => <div data-testid='timeseries-stub' />,
}));
// 智能告警的算法列表（只在 cate==='prometheus' 且开了 fcBrain 时才渲染，tdengine 走不到，兜底 mock）
jest.mock('@/pages/alertRules/FormNG/components/Triggers/AnomalyTrigger/services', () => ({
  __esModule: true,
  getAlgorithms: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/TDengine/locale';
import '@/pages/alertRules/locale';
import '@/components/QueryName/locale';

import TDengineAlertRule from '@/plugins/TDengine/AlertRule';

// 一条 tdengine 策略的初值。rule_config 的形状照 fe v9.1.0 的 TDengine 编辑器
//（queries[].ref / query / interval / interval_unit / keys，triggers 那套与 ck 同构），
// 再补上一条真实 SQL，用来验回填。
const tdengineStrategy = {
  cate: 'tdengine',
  prod: 'metric',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        ref: 'A',
        query: 'select ts, v from db.t',
        interval: 1,
        interval_unit: 'min',
        keys: {
          metricKey: ['v'],
          labelKey: [],
        },
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

function renderInStrategies(strategy: any = tdengineStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与将来的真实分发点一致（挂点由 lead 收尾统一挂）：
              // src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'tdengine' 分支
              <TDengineAlertRule key={field.key} field={field} cate='tdengine' datasourceValue={[1]} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 1 · tdengine 告警规则编辑器接进羚牛多策略表单', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（不是表单顶层）', () => {
    const { container } = renderInStrategies();
    // SQL 输入框：name=['strategies',0,'rule_config','queries',0,'query']
    // 注意 TDengine 这个键叫 query（ck 那边叫 sql）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_query')).not.toBeNull();
    // 查询卡片里「高级设置」的两个字段（src/plugins/TDengine/components/AdvancedSettings.tsx:54,70，
    // mode='graph' 只出这两个），它们的 name 相对于查询这一项，
    // 所以路径要一直对到 queries[0] 这一层才拼得出来
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_metricKey')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_labelKey')).not.toBeNull();
    // 查询别名 QueryName 不是原生 input（未编辑时是一个 div，不接 antd 注入的 id），
    // 所以这里按它显示出来的文本断言：初值 'A' 要显示出来
    expect(container.innerHTML).toContain('>A<');
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_query')).toBeNull();
    expect(container.querySelector('#rule_config_queries_0_keys_metricKey')).toBeNull();
  });

  it('已有的 SQL 能回填进编辑器', () => {
    const { container } = renderInStrategies();
    expect(container.innerHTML).toContain('select ts, v from db.t');
  });

  it('触发条件那一整块出得来，且字段同样落在 strategies[0].rule_config 下', () => {
    const { container } = renderInStrategies();
    // 「触发条件」总开关：name=['strategies',0,'rule_config','exp_trigger_disable']
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 触发条件卡片里的模式单选：name=['strategies',0,'rule_config','triggers',0,'mode']
    // 它只在 exp_trigger_disable === false 时才渲染，
    // 所以这一条同时证明了「useWatch 用的是绝对路径、取到了值」。
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).not.toBeNull();
    // 再往里一层：表达式、告警级别、恢复判断三个子组件的字段也都要落在同一条路径下
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_expressions_0_ref')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_severity')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_recover_config_judge_type')).not.toBeNull();
    // 「数据缺失」告警的开关：name=['strategies',0,'rule_config','nodata_trigger','enable']
    expect(container.querySelector('#strategies_0_rule_config_nodata_trigger_enable')).not.toBeNull();
  });

  it('exp_trigger_disable 为 true 时，触发条件那块收起来（反证 useWatch 真的读到了值）', () => {
    const { container } = renderInStrategies({
      ...tdengineStrategy,
      rule_config: { ...tdengineStrategy.rule_config, exp_trigger_disable: true },
    });
    // 总开关还在（它在卡片头上，不受折叠影响）
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 但里面的触发条件卡片不该渲染
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).toBeNull();
  });
});
