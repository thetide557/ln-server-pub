/**
 * 第六步 第 4 段 · 阶段 1（W1-SQL组）· doris 告警规则编辑器的渲染测试。
 *
 * 要证的事和阶段 0 的 ck 那条一样：从 fe v9.1.0 搬来的 doris 告警编辑器，
 * 放进羚牛的「一条规则最多 5 个策略」表单里（外层 `<Form.List name='strategies'>`）之后，
 * **字段真的落在 strategies[n].rule_config 下面**，而不是落在表单顶层的 rule_config 上。
 *
 * doris 比 ck 多两个坑（大顾问 Q1 第三节点名的）：
 *   1. `AlertRule/index.tsx:58` 原文是 `<Form.List name={['rule_config','queries']}>`——name= 直接写死顶层，
 *      不改的话查询卡片会整块掉到表单顶层去；
 *   2. `Query.tsx` 里有 14 处绝对路径调用（useWatch / setFields / getFieldValue），
 *      不改的话「预览」「切 builder/code」都取不到值。
 * 下面的 id 断言正是冲着这两条来的。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'sql'] → id="strategies_0_rule_config_queries_0_sql"
 * 用 @testing-library 的 render 而不是 renderToString：Triggers.tsx 靠 `Form.useWatch` 决定
 * 「触发条件」那一整块显不显示，而 useWatch 的初值在 useEffect 里灌（rc-field-form/lib/useWatch.js:56-83），
 * renderToString 不跑 effect。先例：l4/ck.alertRule.render.test.tsx。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 l4/ck.alertRule.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// @fc-components/monaco-editor 里是整包 monaco（只发 ESM、还要 web worker），jest 跑不动。
// 换成把 value 原样吐出来的小组件，并把 antd 注入的 id 挂到 DOM 上（本测试靠 id 断言字段路径）。
jest.mock('@fc-components/monaco-editor', () => ({
  __esModule: true,
  SqlMonacoEditor: (props: any) => (
    <div id={props.id} data-testid='sql-editor'>
      {props.value}
    </div>
  ),
  SqlMonacoPreview: (props: any) => <div data-testid='sql-preview'>{props.value}</div>,
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
// Query.tsx:14 只为了拿 FormStateContext 就 import 了整张告警规则表单页（很重，还会连出路由）。
// 这里换成一个等价的 context，行为一致（羚牛那份的默认值就是 { disabled: false }，
// 见 src/pages/alertRules/Form/index.tsx:45-47），但不用把整个页面拖进测试。
jest.mock('@/pages/alertRules/Form', () => {
  const ReactLib = require('react');
  return {
    __esModule: true,
    FormStateContext: ReactLib.createContext({ disabled: false }),
  };
});
// SQL Builder 弹窗只在商业版 + builder 模式下才打开，但它在模块顶层就被 import 了，
// 会连出一整串 ExplorerNG 的查询构建器组件；与本测试要证的事无关，整个换掉。
jest.mock('@/plugins/doris/components/BuilderModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// index.tsx 挂载就去拉数据库列表、GraphPreview 一点开就发请求；换成空数据，免得测试里跑真网络。
jest.mock('@/plugins/doris/services', () => ({
  __esModule: true,
  getDorisDatabases: jest.fn(() => Promise.resolve([])),
  getDorisTables: jest.fn(() => Promise.resolve([])),
  getDorisIndex: jest.fn(() => Promise.resolve([])),
  logQuery: jest.fn(() => Promise.resolve({ list: [] })),
  dsQuery: jest.fn(() => Promise.resolve([])),
  buildSql: jest.fn(() => Promise.resolve({ sql: '' })),
}));
// 智能告警的算法列表（只在 cate==='prometheus' 且开了 fcBrain 时才渲染，doris 走不到，兜底 mock）
jest.mock('@/pages/alertRules/FormNG/components/Triggers/AnomalyTrigger/services', () => ({
  __esModule: true,
  getAlgorithms: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/doris/locale';
import '@/pages/alertRules/locale';
import '@/components/QueryName/locale';

import DorisAlertRule from '@/plugins/doris/AlertRule';

// 一条 doris 策略的初值。doris 的 Form.List 没有 initialValue（fe 原文如此），所以 queries 必须给全。
const dorisStrategy = {
  cate: 'doris',
  prod: 'metric',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        ref: 'A',
        editMode: 'code',
        sql: "SELECT count(*) as cnt FROM db.t WHERE $__timeFilter",
        interval: 1,
        interval_unit: 'min',
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

function renderInStrategies(strategy: any = dorisStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与真实分发点一致：src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'doris' 分支。
              // doris 的 datasourceCate 是可选的、缺省回落到 cate（见 拿不准-SQL组.md U-03）。
              <DorisAlertRule key={field.key} field={field} cate='doris' datasourceValue={[1]} disabled={false} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 1 · doris 告警规则编辑器接进羚牛多策略表单', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（专治 index.tsx:58 那个写死顶层的 Form.List）', () => {
    const { container } = renderInStrategies();
    // SQL 输入框：name=['strategies',0,'rule_config','queries',0,'sql']
    expect(container.querySelector('#strategies_0_rule_config_queries_0_sql')).not.toBeNull();
    // 查询周期与单位（Query.tsx:156,165）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_interval')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_queries_0_interval_unit')).not.toBeNull();
    // 「高级设置」两个字段（src/plugins/doris/components/AdvancedSettings.tsx:71,104）
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_labelKey')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_queries_0_keys_valueKey')).not.toBeNull();
    // 查询别名 QueryName 不是原生 input（未编辑时是一个 div，不接 antd 注入的 id），按显示文本断言
    expect(container.innerHTML).toContain('>A<');
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_sql')).toBeNull();
    expect(container.querySelector('#rule_config_queries_0_interval')).toBeNull();
  });

  it('已有的 SQL 能回填进编辑器（证明 Query.tsx 的绝对路径 useWatch 取到了值）', () => {
    const { container } = renderInStrategies();
    expect(container.innerHTML).toContain('SELECT count(*) as cnt FROM db.t');
  });

  it('editMode 走 useWatch 取值：给 builder 时代码框收起来', () => {
    // Query.tsx:39-41 的 editMode 是从 useWatch 拿的 queries[field.name].editMode。
    // 路径没改对的话 queries 恒为 undefined、editMode 退回默认 'code'，下面这条就会失败。
    const { container } = renderInStrategies({
      ...dorisStrategy,
      rule_config: {
        ...dorisStrategy.rule_config,
        queries: [{ ...dorisStrategy.rule_config.queries[0], editMode: 'builder' }],
      },
    });
    // builder 模式下不渲染那个 SQL 代码框（Query.tsx:246 的 editMode === 'code' 分支）。
    // 第六步 第4段 W3a 改：不能直接按 id 断言「元素不存在」——builder 分支自己还留着一个同名字段的隐藏项
    //（Query.tsx:211 `<Form.Item name={[field.name,'sql']} hidden><input type='hidden' /></Form.Item>`，
    // 提交前要靠它校验 SQL 非空），它拿到的是同一个 id、只是 type="hidden"。原来那条断言是 SQL 组只写没跑写下的，
    // 一跑就红。改成按「代码框那个组件」断言：上面把 SqlMonacoEditor mock 成了带 data-testid='sql-editor' 的 div。
    expect(container.querySelector('[data-testid="sql-editor"]')).toBeNull();
    // 同时把「隐藏项还在、且确实是隐藏的」也钉住，免得将来 builder 分支少了那个校验项没人发现
    expect(container.querySelector('#strategies_0_rule_config_queries_0_sql')?.getAttribute('type')).toBe('hidden');
  });

  it('触发条件那一整块出得来，且字段同样落在 strategies[0].rule_config 下', () => {
    const { container } = renderInStrategies();
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    // 它只在 exp_trigger_disable === false 时才渲染，所以这一条同时证明「useWatch 用的是绝对路径、取到了值」
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_expressions_0_ref')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_severity')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_recover_config_judge_type')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_nodata_trigger_enable')).not.toBeNull();
  });

  it('exp_trigger_disable 为 true 时，触发条件那块收起来（反证 useWatch 真的读到了值）', () => {
    const { container } = renderInStrategies({
      ...dorisStrategy,
      rule_config: { ...dorisStrategy.rule_config, exp_trigger_disable: true },
    });
    expect(container.querySelector('#strategies_0_rule_config_exp_trigger_disable')).not.toBeNull();
    expect(container.querySelector('#strategies_0_rule_config_triggers_0_mode')).toBeNull();
  });
});
