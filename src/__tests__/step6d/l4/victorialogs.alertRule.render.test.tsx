/**
 * 第六步 第 4 段 · 阶段 1（W1-日志组）· victorialogs 告警规则编辑器的渲染测试。
 *
 * 要证的事和阶段 0 的 ck 那条一样，只是换成 victorialogs：
 * 从 fe v9.1.0 搬来的 victorialogs 告警编辑器（src/plugins/victorialogs/AlertRule/），
 * 放进羚牛的「一条规则最多 5 个策略」表单里（外层 `<Form.List name='strategies'>`）之后，
 * **字段真的落在 strategies[n].rule_config 下面**，而不是落在表单顶层的 rule_config 上。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'query'] → id="strategies_0_rule_config_queries_0_query"
 * 所以只要 DOM 里出现这些 id，路径就是对的。这比按中文文案断言稳，不受 i18n 改词影响
 *（`../README.md` 第三节第 3 条）。
 *
 * 用 @testing-library 的 render 而不是 renderToString：搬来的 Triggers.tsx 靠 `Form.useWatch`
 * 决定「触发条件」那一整块显不显示（`exp_trigger_disable === false` 才展开），
 * 而 useWatch 的初值是在 useEffect 里灌的（node_modules/rc-field-form/lib/useWatch.js:56-83），
 * renderToString 不跑 effect，那块永远是空的。先例：./ck.alertRule.render.test.tsx。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd / rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 ./ck.alertRule.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// @fc-components/monaco-editor 里是整包 monaco（只发 ESM、还要 web worker），jest 跑不动。
// victorialogs 的查询框是普通 Input.TextArea，用不到它；但共享的触发条件里
// Code.tsx 会用 ExprMonacoEditor，所以照样要顶掉。
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
// 查询框旁边那个问号会打开文档抽屉（src/components/DocumentDrawer），它 import 了 @uiw/react-md-editor
// 和 .less，与本测试要证的事无关，整个换掉。
jest.mock('@/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// GraphPreview（查询结果预览）一点开就发请求；这里换成空数据，免得测试里跑真网络。
jest.mock('@/plugins/victorialogs/services', () => ({
  __esModule: true,
  getHistogram: jest.fn(() => Promise.resolve({})),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  logQuery: jest.fn(() => Promise.resolve({ list: [] })),
}));
// 智能告警的算法列表（只在 cate==='prometheus' 且开了 fcBrain 时才会渲染，victorialogs 走不到，兜底 mock）
jest.mock('@/pages/alertRules/FormNG/components/Triggers/AnomalyTrigger/services', () => ({
  __esModule: true,
  getAlgorithms: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/victorialogs/locale';
import '@/pages/alertRules/locale';
import '@/components/QueryName/locale';

import VictorialogsAlertRule from '@/plugins/victorialogs/AlertRule';

// 一条 victorialogs 策略的初值。形状照 fe v9.1.0 的默认值
//（fe:src/pages/alertRules/Form/utils.ts 的 `cate === DatasourceCateEnum.victorialogs` 分支：
//  rule_config = { ...defaultRuleConfig, queries: [{ ref: 'A', query: DEFAULT_QUERY }] }），
// 查询语句换成一条带 _time 的真实语句，用来验回填。
const vlStrategy = {
  cate: 'victorialogs',
  prod: 'logging',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        ref: 'A',
        query: '_time: 5m | error',
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

function renderInStrategies(strategy: any = vlStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与阶段 0 的 ck 分发点一字对应：
              // src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'ck' 分支
              <VictorialogsAlertRule key={field.key} field={field} cate='victorialogs' datasourceValue={[1]} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 1 · victorialogs 告警规则编辑器接进羚牛多策略表单', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（不是表单顶层）', () => {
    const { container } = renderInStrategies();
    // 查询语句输入框：name=['strategies',0,'rule_config','queries',0,'query']
    expect(container.querySelector('#strategies_0_rule_config_queries_0_query')).not.toBeNull();
    // 查询别名 QueryName 不是原生 input（未编辑时是一个 div，不接 antd 注入的 id），
    // 所以这里按它显示出来的文本断言：初值 'A' 要显示出来
    expect(container.innerHTML).toContain('>A<');
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_query')).toBeNull();
  });

  it('已有的查询语句能回填进输入框', () => {
    const { container } = renderInStrategies();
    const textarea = container.querySelector('#strategies_0_rule_config_queries_0_query') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('_time: 5m | error');
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
    // 「数据缺失」告警的开关：name=['strategies',0,'rule_config','nodata_trigger','enable']
    expect(container.querySelector('#strategies_0_rule_config_nodata_trigger_enable')).not.toBeNull();
  });

  it('exp_trigger_disable 为 true 时，触发条件那块收起来（反证 useWatch 真的读到了值）', () => {
    const { container } = renderInStrategies({
      ...vlStrategy,
      rule_config: { ...vlStrategy.rule_config, exp_trigger_disable: true },
    });
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).toBeNull();
  });
});
