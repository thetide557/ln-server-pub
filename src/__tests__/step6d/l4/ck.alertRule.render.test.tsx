/**
 * 第六步 第 4 段 · 阶段 0（ck 试点）· 告警规则编辑器的渲染测试。
 *
 * 要证的事只有一件，但它是本阶段最要紧的一件：
 * 从 fe v9.1.0 搬来的 ck 告警编辑器，放进羚牛的「一条规则最多 5 个策略」表单里
 * （外层 `<Form.List name='strategies'>`）之后，**字段真的落在 strategies[n].rule_config 下面**，
 * 而不是落在表单顶层的 rule_config 上。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'sql'] → id="strategies_0_rule_config_queries_0_sql"
 * 所以只要 DOM 里出现这些 id，路径就是对的；反过来，如果适配没做对，
 * id 会是 "rule_config_queries_0_sql"（掉在顶层）或者干脆没有。
 * 这比按中文文案断言稳，不受 i18n 改词影响（`../README.md` 第三节第 3 条）。
 *
 * 用 @testing-library 的 render 而不是 renderToString：搬来的 Triggers.tsx 靠 `Form.useWatch`
 * 决定「触发条件」那一整块显不显示（`exp_trigger_disable === false` 才展开），
 * 而 useWatch 的初值是在 useEffect 里灌的（node_modules/rc-field-form/lib/useWatch.js:56-83），
 * renderToString 不跑 effect，那块永远是空的。先例：`../l3/queryBuilders.render.test.tsx` 的 ck 那条。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 ../l3/queryBuilders.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// @fc-components/monaco-editor 里是整包 monaco（只发 ESM、还要 web worker），jest 跑不动。
// 这里不换成空组件，而是换成一个把 value 原样吐出来的小组件——因为本测试要断言 SQL 文本确实回填进去了。
// antd 的 Form.Item 会把 value / onChange 注入给子组件，所以拿得到 value。
// 注意要把 antd 注入的 id 原样挂到 DOM 上——本测试正是靠这个 id 断言字段路径的。
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
// Code.tsx:24 直接 import 了包内的深层路径 @fc-components/monaco-editor/src/expr/validation，
// 上面那条 mock 盖不到它，单独换掉。
jest.mock('@fc-components/monaco-editor/src/expr/validation', () => ({
  __esModule: true,
  validateExpr: () => ({ isValid: true }),
}));
// ck 的「查询语法说明」抽屉 import 了三个 .md 文档（jest 没有对应的 moduleNameMapper）
// 和只发 ESM 的 react-markdown，与本测试要证的事无关，整个换掉。先例：../l3/queryBuilders.render.test.tsx。
jest.mock('@/plugins/clickHouse/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// GraphPreview（查询结果预览）一点开就发请求；这里换成空数据，免得测试里跑真网络。
jest.mock('@/plugins/clickHouse/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getDescTable: jest.fn(() => Promise.resolve([])),
  getDsQuery2: jest.fn(() => Promise.resolve([])),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  getSQLPreview: jest.fn(() => Promise.resolve([])),
}));
// 智能告警的算法列表（只在 cate==='prometheus' 且开了 fcBrain 时才会渲染，ck 走不到，兜底 mock）
jest.mock('@/pages/alertRules/FormNG/components/Triggers/AnomalyTrigger/services', () => ({
  __esModule: true,
  getAlgorithms: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/clickHouse/locale';
import '@/pages/alertRules/locale';
import '@/components/QueryName/locale';

import ClickHouseAlertRule from '@/plugins/clickHouse/AlertRule';

// 一条 ck 策略的初值。形状照 pub 的 getDefaultValuesByCate（src/pages/alertRules/Form/utils.ts 的 ck 分支）
// 再补上一条真实 SQL，用来验回填。
const ckStrategy = {
  cate: 'ck',
  prod: 'metric',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        ref: 'A',
        sql: 'SELECT 1',
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

function renderInStrategies(strategy: any = ckStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与真实分发点一字不差：src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'ck' 分支
              <ClickHouseAlertRule key={field.key} field={field} cate='ck' datasourceValue={[1]} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 0 · ck 告警规则编辑器接进羚牛多策略表单', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（不是表单顶层）', () => {
    const { container } = renderInStrategies();
    // SQL 输入框：name=['strategies',0,'rule_config','queries',0,'sql']
    expect(container.querySelector('#strategies_0_rule_config_queries_0_sql')).not.toBeNull();
    // 查询卡片里的「高级设置」两个字段（src/plugins/clickHouse/components/AdvancedSettings.tsx），
    // 它们的 name 相对于查询这一项，所以路径要一直对到 queries[0] 这一层才拼得出来
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_labelKey')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_valueKey')).not.toBeNull();
    // 查询别名 QueryName 不是原生 input（未编辑时是一个 div，不接 antd 注入的 id），
    // 所以这里按它显示出来的文本断言：初值 'A' 要显示出来
    expect(container.innerHTML).toContain('>A<');
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_sql')).toBeNull();
    expect(container.querySelector('#rule_config_queries_0_keys_labelKey')).toBeNull();
  });

  it('已有的 SQL 能回填进编辑器', () => {
    const { container } = renderInStrategies();
    expect(container.innerHTML).toContain('SELECT 1');
  });

  it('触发条件那一整块出得来，且字段同样落在 strategies[0].rule_config 下', () => {
    const { container } = renderInStrategies();
    // 「触发条件」总开关：name=['strategies',0,'rule_config','exp_trigger_disable']
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 触发条件卡片里的模式单选：name=['strategies',0,'rule_config','triggers',0,'mode']
    // 它只在 exp_trigger_disable === false 时才渲染（Triggers.tsx 的 :58 那段），
    // 所以这一条同时证明了「useWatch 用的是绝对路径、取到了值」。
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).not.toBeNull();
    // 再往里一层：表达式（Builder.tsx）、告警级别（Severity）、恢复判断（RecoverConfig）
    // 三个子组件的字段也都要落在同一条路径下，证明整条 Triggers -> Trigger -> Builder/RecoverConfig 链路都对
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_expressions_0_ref')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_severity')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_recover_config_judge_type')).not.toBeNull();
    // 「数据缺失」告警的开关：name=['strategies',0,'rule_config','nodata_trigger','enable']
    expect(container.querySelector('#strategies_0_rule_config_nodata_trigger_enable')).not.toBeNull();
  });

  it('exp_trigger_disable 为 true 时，触发条件那块收起来（反证 useWatch 真的读到了值）', () => {
    const { container } = renderInStrategies({
      ...ckStrategy,
      rule_config: { ...ckStrategy.rule_config, exp_trigger_disable: true },
    });
    // 总开关还在（它在卡片头上，不受折叠影响）
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 但里面的触发条件卡片不该渲染
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).toBeNull();
  });
});
