/**
 * 第六步 第 4 段 · 阶段 2（W2）· 数据源筛选器的渲染。
 *
 * 要证三件事：
 *  1. **新 8 种**（这里用 mysql）在告警规则表单里渲染的是夜莺 v9 的筛选器 V2，
 *     而且字段真的落在 `strategies[0].datasource_queries` 下面——不是表单顶层，也不是被套了两层前缀。
 *     怎么证：antd 按 Form.Item 的完整 name 路径生成 input 的 id，
 *     `['strategies',0,'datasource_queries',0,'match_type']` → id="strategies_0_datasource_queries_0_match_type"。
 *     这同时是 `拿不准-W2.md` 第 2 条（相对 / 绝对两条路径）的实证。
 *  2. **老类型**（这里用 prometheus）渲染的仍是原来的老选择器（绑 `datasource_ids`），DOM 里没有 V2 的特征元素。
 *  3. 预览接口失败时（羚牛后端没有 POST /api/takin/datasource/query），
 *     筛选器上显示「预览不可用」，**不抛错、不挡表单**。
 *
 * 用 @testing-library 的 render 而不是 renderToString：V2 靠 `Form.useWatch` 和 `useEffect` 取值发请求，
 * renderToString 不跑 effect（先例与理由同 l4/ck.alertRule.render.test.tsx 的文件头）。
 */
import React from 'react';
import { Form } from 'antd';
import { render, waitFor } from '@testing-library/react';
// V2 里有一个「点击前往数据源管理」的 <Link>（V2.tsx:282），react-router 的 Link 必须活在 Router 里面
import { MemoryRouter } from 'react-router-dom';

// antd / rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 只测数据源那一格，把 Metric 里其余的重家伙都换成空组件
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/pages/alertRules/Form', () => ({
  __esModule: true,
  // Metric/index.tsx 只用它拿「整张表单是不是只读」
  FormStateContext: require('react').createContext({ disabled: false }),
}));
jest.mock('@/components/DatasourceSelect', () => ({
  __esModule: true,
  DatasourceCateSelect: () => null,
}));
jest.mock('@/pages/alertRules/Form/Rule/Rule/Metric/Prometheus', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/alertRules/Form/Rule/Rule/Metric/Prometheus/XHindex', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/clickHouse/AlertRule', () => ({ __esModule: true, default: () => null }));
// 第六步 第4段 W3a（阶段 1 收尾）：分发点 Metric/index.tsx 现在还 import 了另外九种编辑器。
// 它们和本文件要证的事（数据源筛选器 V2 与 datasource_queries）没关系，但会顺着 import 链
// 把整包 monaco 拉进来（<插件>/AlertRule → FormNG/components/Triggers → Code.tsx:23 →
// @fc-components/monaco-editor，那个包只发 ESM、jest 默认不转译 node_modules，直接报
// 「Cannot use import statement outside a module」）。照上面 clickHouse 那行的样子一并换成空组件。
jest.mock('@/plugins/mysql/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/pgsql/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/doris/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/elasticsearch/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/TDengine/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/iotdb/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/plugins/victorialogs/AlertRule', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/alertRules/Form/Rule/Rule/Log/Loki', () => ({ __esModule: true, default: () => null }));
// V2 里 showExtra 为真才会渲染它，羚牛不传；换成空组件，免得把 clickHouse 的元数据弹窗整包拉进来
jest.mock('@/pages/alertRules/Form/components/DatasourceSelectExtra', () => ({ __esModule: true, default: () => null }));
// 数据源列表接口：V2 挂载时会拉一次全量数据源
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: [], data: {} })),
}));
// 「这条规则会命中哪几个数据源」的预览接口。羚牛后端漏搬了这条路由，所以这里模拟成失败。
const mockGetDatasourcesByQueries = jest.fn(() => Promise.reject(new Error('Not Found')));
jest.mock('@/pages/alertRules/Form/components/DatasourceValueSelect/services', () => ({
  __esModule: true,
  getDatasourcesByQueries: (...args: any[]) => mockGetDatasourcesByQueries.apply(null, args as any),
}));

import '@/i18n';
import '@/pages/alertRules/locale';

import { CommonStateContext } from '@/App';
import Metric from '@/pages/alertRules/Form/Rule/Rule/Metric';

const commonState: any = {
  ...require('../helpers/appMock').defaultCommonState,
  groupedDatasourceList: {
    mysql: [
      { id: 1, name: 'mysql-prod', plugin_type: 'mysql' },
      { id: 2, name: 'mysql-test', plugin_type: 'mysql' },
    ],
    prometheus: [{ id: 7, name: 'prom-a', plugin_type: 'prometheus' }],
  },
  setDatasourceList: jest.fn(),
};

// 照真实结构渲染：外层 <Form.List name='strategies'>，里面每条策略渲染一个 Metric
// （src/pages/alertRules/Form/index.tsx:198,341-346）
function renderMetric(strategy: any) {
  const Wrapper = () => {
    const [form] = Form.useForm();
    return (
      <CommonStateContext.Provider value={commonState}>
        <MemoryRouter>
        <Form form={form} initialValues={{ strategies: [strategy] }}>
          <Form.List name='strategies'>
            {(fields) => (
              <>
                {fields.map((field) => (
                  <Metric key={field.key} form={form} type={0} assets={{}} field={field} />
                ))}
              </>
            )}
          </Form.List>
        </Form>
        </MemoryRouter>
      </CommonStateContext.Provider>
    );
  };
  return render(<Wrapper />);
}

const mysqlStrategy = {
  prod: 'metric',
  cate: 'mysql',
  datasource_queries: [{ match_type: 0, op: 'in', values: [1] }],
  rule_config: { queries: [], triggers: [] },
};

const prometheusStrategy = {
  prod: 'metric',
  cate: 'prometheus',
  datasource_ids: [0],
  rule_config: { queries: [], triggers: [] },
};

describe('阶段 2 · 新 8 种挂 V2 筛选器', () => {
  it('渲染不抛异常', () => {
    expect(() => renderMetric(mysqlStrategy)).not.toThrow();
  });

  it('筛选条件的字段落在 strategies[0].datasource_queries 下（不是顶层、也没被套两层前缀）', () => {
    const { container } = renderMetric(mysqlStrategy);
    // 匹配方式 / 包含关系 / 数据源三个下拉
    expect(container.querySelector('#strategies_0_datasource_queries_0_match_type')).not.toBeNull();
    expect(container.querySelector('#strategies_0_datasource_queries_0_op')).not.toBeNull();
    expect(container.querySelector('#strategies_0_datasource_queries_0_values')).not.toBeNull();
    // 反证一：不许掉回夜莺那种表单顶层的路径
    expect(container.querySelector('#datasource_queries_0_match_type')).toBeNull();
    // 反证二：不许被 Form.List 再套一层前缀（拿不准-W2.md 第 2 条说的那个坑）
    expect(container.querySelector('#strategies_strategies_0_datasource_queries_0_match_type')).toBeNull();
    // 新 8 种不该再出现老选择器
    expect(container.querySelector('#strategies_0_datasource_ids')).toBeNull();
  });

  it('筛选器的文案是中文的（说明 common:datasource.queries.* 这组键补上了）', () => {
    const { container } = renderMetric(mysqlStrategy);
    expect(container.textContent).toContain('数据源筛选');
    expect(container.textContent).toContain('数据源预览');
  });

  it('预览接口失败时显示「预览不可用」，不抛错', async () => {
    const { container } = renderMetric(mysqlStrategy);
    await waitFor(() => {
      expect(mockGetDatasourcesByQueries).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(container.textContent).toContain('预览不可用');
    });
    // 表单本身照旧在，字段没被清掉（不挡保存）
    expect(container.querySelector('#strategies_0_datasource_queries_0_match_type')).not.toBeNull();
  });
});

describe('阶段 2 · 老类型仍用原来的选择器', () => {
  it('prometheus 渲染的是老选择器（绑 datasource_ids），DOM 里没有 V2 的特征元素', () => {
    const { container } = renderMetric(prometheusStrategy);
    expect(container.querySelector('#strategies_0_datasource_ids')).not.toBeNull();
    expect(container.querySelector('#strategies_0_datasource_queries_0_match_type')).toBeNull();
    expect(container.textContent).not.toContain('数据源筛选');
  });

  it('prometheus 下预览接口一次都不会被调（老类型压根不挂 V2）', () => {
    renderMetric(prometheusStrategy);
    expect(mockGetDatasourcesByQueries).not.toHaveBeenCalled();
  });
});
