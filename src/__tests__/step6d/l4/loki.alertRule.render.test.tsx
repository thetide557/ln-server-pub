/**
 * 第六步 第 4 段 · 阶段 1（W1-日志组）· loki 告警规则编辑器的渲染测试。
 *
 * 要证的事和阶段 0 的 ck 那条一样，只是换成 loki：
 * 从 fe v9.1.0 搬来的 loki 编辑器（src/pages/alertRules/Form/Rule/Rule/Log/Loki/index.tsx，
 * 阶段 0 只搬没接、路径还写死在顶层，登记为 拿不准-W0.md 的 U-07），
 * 阶段 1 做完字段路径适配之后，字段要**真的落在 strategies[n].rule_config 下面**，
 * 而不是落在表单顶层的 rule_config 上。
 *
 * 怎么证：antd 会按 Form.Item 的完整 name 路径生成 input 的 id，数组下标也在里面——
 *   ['strategies', 0, 'rule_config', 'queries', 0, 'prom_ql'] → id="strategies_0_rule_config_queries_0_prom_ql"
 * 所以只要 DOM 里出现这些 id，路径就是对的；反过来，如果适配没做对，
 * id 会是 "rule_config_queries_0_prom_ql"（掉在顶层）或者干脆没有。
 * 这比按中文文案断言稳，不受 i18n 改词影响（`../README.md` 第三节第 3 条）。
 *
 * 顺带证一条阶段 0 埋下的伏笔：Inhibit（「抑制」开关）只有拿到 rule_config 的**绝对**路径
 * 才能读到 queries 的条数（拿不准-W0.md U-05 / lead 拍板-11 ①）；
 * 所以「两条查询时开关出得来、一条时不出来」这一对断言，等于验了 absPrefix 传对了。
 */
import React from 'react';
import { Form } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。只影响本文件。写法同 ./ck.alertRule.render.test.tsx。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));

jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import '@/i18n';
import '@/pages/alertRules/locale';

import LokiAlertRule from '@/pages/alertRules/Form/Rule/Rule/Log/Loki';

// 一条 loki 策略的初值。形状照 fe v9.1.0 的默认值
//（fe:src/pages/alertRules/Form/utils.ts 的 `cate === DatasourceCateEnum.loki` 分支：
//  rule_config.queries = [{ prom_ql: '', severity: 2 }]），再补上一条真实 LogQL 用来验回填。
const lokiStrategy = {
  cate: 'loki',
  prod: 'logging',
  datasource_ids: [1],
  rule_config: {
    queries: [
      {
        prom_ql: '{job="varlogs"} |= "error"',
        severity: 2,
      },
    ],
  },
};

function renderInStrategies(strategy: any = lokiStrategy) {
  return render(
    <Form initialValues={{ strategies: [strategy] }}>
      <Form.List name='strategies'>
        {(fields) => (
          <>
            {fields.map((field) => (
              // 传法与将来真实分发点一致（阶段 0 的 ck 分支写法：
              // src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'ck' 那一支）
              <LokiAlertRule key={field.key} field={field} cate='loki' datasourceCate='loki' datasourceValue={[1]} />
            ))}
          </>
        )}
      </Form.List>
    </Form>,
  );
}

describe('阶段 1 · loki 告警规则编辑器接进羚牛多策略表单', () => {
  it('渲染不抛异常', () => {
    expect(() => renderInStrategies()).not.toThrow();
  });

  it('查询卡片的字段落在 strategies[0].rule_config.queries 下（不是表单顶层）', () => {
    const { container } = renderInStrategies();
    // LogQL 输入框：name=['strategies',0,'rule_config','queries',0,'prom_ql']
    expect(container.querySelector('#strategies_0_rule_config_queries_0_prom_ql')).not.toBeNull();
    // 告警级别（Severity）：name 相对于这一条查询，所以路径要一直对到 queries[0] 这一层才拼得出来
    expect(container.querySelector('#strategies_0_rule_config_queries_0_severity')).not.toBeNull();
    // 反证：不许掉回 fe 那种顶层路径
    expect(container.querySelector('#rule_config_queries_0_prom_ql')).toBeNull();
    expect(container.querySelector('#rule_config_queries_0_severity')).toBeNull();
  });

  it('已有的 LogQL 能回填进输入框', () => {
    const { container } = renderInStrategies();
    const input = container.querySelector('#strategies_0_rule_config_queries_0_prom_ql') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('{job="varlogs"} |= "error"');
  });

  it('两条查询时「抑制」开关出得来（证明 Inhibit 拿到的是绝对路径）', () => {
    const { container } = renderInStrategies({
      ...lokiStrategy,
      rule_config: {
        queries: [
          { prom_ql: '{job="a"}', severity: 2 },
          { prom_ql: '{job="b"}', severity: 3 },
        ],
      },
    });
    // 第二条查询的字段也在同一条路径下
    expect(container.querySelector('#strategies_0_rule_config_queries_1_prom_ql')).not.toBeNull();
    // Inhibit 里是一个 antd Switch；只有 getFieldValue([...absPrefix,'queries']).length > 1 时才渲染
    //（src/pages/alertRules/Form/components/Inhibit/index.tsx:39-40）
    expect(container.querySelector('.ant-switch')).not.toBeNull();
  });

  it('只有一条查询时「抑制」开关不出来（反证上一条不是碰巧）', () => {
    const { container } = renderInStrategies();
    expect(container.querySelector('.ant-switch')).toBeNull();
  });
});
