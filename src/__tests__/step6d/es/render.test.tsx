/**
 * 第六步 · ES 升级轮（step6f）的冒烟与行为测试。
 *
 * 本轮把四层都按 fe v9.1.0 覆盖了（L1 数据源表单 / L2 即时查询经典页 /
 * L3 仪表盘 ES 查询编辑器 / L3b 仪表盘 ES 取数），这份文件挡的是「白屏级」的低级错，
 * 外加把三处「羚牛这边特意补的胶水」用断言钉住：
 *   1. L1 详情页的多地址列表与「写配置」一栏（覆盖带进来的新内容）；
 *   2. L3 编辑器的薄适配（pub 的 QueryEditor 传 chartForm/variableConfig/dashboardId，
 *      fe 新版只收 datasourceValue，适配层负责从表单里取）；
 *   3. L3b 取数的两件事——返回值取成数组（pub 的 useQuery 期望数组）、
 *      仪表盘变量在进 fe 取数函数之前先替换掉（顾问意见 X-8 补核②）。
 *
 * 写法照 `../l2/explorers.render.test.tsx`、`../l3/queryBuilders.render.test.tsx` 与 `../README.md` 第三节：
 * 渲染一律用 renderToString（不跑 useEffect，最干净），services 全部 mock 成空数据。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form } from 'antd';
import { StaticRouter } from 'react-router-dom';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// @ant-design/plots 会拖进 @antv/g2plot -> d3-interpolate，那是纯 ESM，jest 读不了。
jest.mock('@ant-design/plots', () => ({
  __esModule: true,
  measureTextWidth: () => 100,
}));
// 「查询语法说明」抽屉 import 了 @uiw/react-md-editor（再拖进只发 ESM 的 react-markdown），
// 与本测试要证的事无关，整个 mock 掉（同 l2/l3 两份测试的做法）。
jest.mock('@/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// ES 页面一进来就会拉索引 / 字段 / 日志，全部换成空数据。
jest.mock('@/pages/explorer/Elasticsearch/services', () => ({
  __esModule: true,
  getIndices: jest.fn(() => Promise.resolve([])),
  getFields: jest.fn(() => Promise.resolve({ allFields: [], fields: [] })),
  getFullFields: jest.fn(() => Promise.resolve({ allFields: [], fields: [] })),
  getLogsQuery: jest.fn(() => Promise.resolve({ total: 0, list: [] })),
  getDsQuery: jest.fn(() => Promise.resolve([])),
  getESVersion: jest.fn(() => Promise.resolve('7.10.2')),
  cancelQuery: jest.fn(),
}));
jest.mock('@/pages/log/IndexPatterns/services', () => ({
  __esModule: true,
  getESIndexPatterns: jest.fn(() => Promise.resolve([])),
  getFullFields: jest.fn(() => Promise.resolve({ allFields: [], fields: [] })),
}));

import '@/i18n'; // 初始化 i18next（否则各组件 locale/index.ts 里的 addResourceBundle 会炸）
import '@/pages/datasource/locale';
import '@/pages/explorer/locale';
import '@/pages/dashboard/locale';

import ESDetail from '@/pages/datasource/Datasources/ElasticSearch/Detail';
import ESExplorer from '@/pages/explorer/Elasticsearch';
import ESQueryEditor from '@/pages/dashboard/Editor/QueryEditor/Elasticsearch';

describe('ES 升级轮 · L1 数据源详情页', () => {
  it('renderToString 不抛；多地址逐行列出，且有「写配置」一栏', () => {
    const data = {
      http: { urls: ['http://10.0.0.1:9200', 'http://10.0.0.2:9200'], timeout: 10000 },
      auth: { basic_auth_user: 'elastic' },
      settings: { version: '7.10.2', max_shard: 5, min_interval: 10, enable_write: true },
    };
    let html = '';
    expect(() => {
      html = renderToString(<ESDetail data={data} />);
    }).not.toThrow();
    // 覆盖带进来的第一处：http.urls 是数组时逐行渲染（fe v9.1.0 Detail.tsx:21-25）
    expect(html).toContain('http://10.0.0.1:9200');
    expect(html).toContain('http://10.0.0.2:9200');
    // 覆盖带进来的第二处：多了「写配置」一栏，enable_write=true 时显示「允许写入」
    // 词条 form.es.write_config / enable_write 见 src/pages/datasource/locale/{zh_CN,step6d.zh_CN}.ts
    expect(html).toContain('写配置');
    expect(html).toContain('允许写入');
  });

  it('http 只有单个 url（老数据）时仍然渲染得出来', () => {
    const data = { http: { url: 'http://127.0.0.1:9200' }, settings: {} };
    let html = '';
    expect(() => {
      html = renderToString(<ESDetail data={data} />);
    }).not.toThrow();
    expect(html).toContain('http://127.0.0.1:9200');
    // enable_write 缺省时显示「不允许写入」（词条 form.es.disable_write，本轮补进 step6d.zh_CN.ts）
    expect(html).toContain('不允许写入');
  });
});

describe('ES 升级轮 · L2 即时查询经典页', () => {
  it('renderToString 不抛（headerExtra 给 null 时跳过 portal）', () => {
    const Wrapper = () => {
      const [form] = Form.useForm();
      return (
        <StaticRouter location='/log/explorer'>
          <Form form={form}>
            <ESExplorer headerExtra={null} datasourceValue={1} form={form} />
          </Form>
        </StaticRouter>
      );
    };
    let html = '';
    expect(() => {
      html = renderToString(<Wrapper />);
    }).not.toThrow();
    expect(html.length).toBeGreaterThan(0);
  });
});

describe('ES 升级轮 · L3 仪表盘 ES 查询编辑器', () => {
  it('renderToString 不抛；薄适配层照 pub 的老 props 也能挂起来', () => {
    const Wrapper = () => {
      const [chartForm] = Form.useForm();
      return (
        <Form
          form={chartForm}
          initialValues={{
            datasourceValue: 7,
            targets: [{ refId: 'A', query: { index: 'logstash-*', date_field: '@timestamp', values: [{ func: 'count' }] } }],
          }}
        >
          {/* pub 的 QueryEditor/index.tsx:61 就是这么传的，一个字没改 */}
          <ESQueryEditor chartForm={chartForm} variableConfig={[]} dashboardId='1' />
        </Form>
      );
    };
    let html = '';
    expect(() => {
      html = renderToString(<Wrapper />);
    }).not.toThrow();
    expect(html.length).toBeGreaterThan(0);
  });
});

describe('ES 升级轮 · L3b 仪表盘 ES 取数的目录内 shim', () => {
  // 这一组不渲染组件，只测 shim 那一层：变量替换 + 返回值取成数组。
  // 把 fe 的取数函数（./query）整个换掉，好看清 shim 到底送了什么进去。
  const queryMock = jest.fn(() => Promise.resolve({ series: [{ id: 'a', name: 'n', metric: {}, data: [] }], query: [{ some: 'raw' }] }));
  jest.doMock('@/pages/dashboard/Renderer/datasource/elasticsearch/query', () => ({
    __esModule: true,
    default: queryMock,
  }));

  beforeEach(() => {
    queryMock.mockClear();
  });

  it('返回的是 series 数组，不是 {series, query} 对象（pub 的 useQuery.tsx:82 期望数组）', async () => {
    const elasticSearchQuery = require('@/pages/dashboard/Renderer/datasource/elasticsearch').default;
    const res = await elasticSearchQuery({
      datasourceCate: 'elasticsearch',
      datasourceValue: 7,
      time: { start: 'now-1h', end: 'now' },
      targets: [{ refId: 'A', query: { index: 'a', date_field: '@timestamp' } }],
    });
    expect(_isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('a');
  });

  it('带 $变量的 filter 与 datasourceValue，在进 fe 取数函数之前已经替换好（X-8 补核②）', async () => {
    const elasticSearchQuery = require('@/pages/dashboard/Renderer/datasource/elasticsearch').default;
    const variableConfig = [
      { name: 'app', type: 'custom', value: 'nginx', options: [] },
      { name: 'ds', type: 'datasource', value: 7, options: [] },
    ];
    await elasticSearchQuery({
      dashboardId: '1',
      datasourceCate: 'elasticsearch',
      datasourceValue: '$ds',
      time: { start: 'now-1h', end: 'now' },
      targets: [{ refId: 'A', query: { index: 'a', date_field: '@timestamp', filter: 'service:$app' } }],
      variableConfig,
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
    const passed: any = (queryMock.mock.calls[0] as any[])[0];
    expect(passed.targets[0].query.filter).toBe('service:nginx');
    expect(String(passed.datasourceValue)).toBe('7');
    // 原来的 options 对象没被就地改坏：filter 是新对象上的值
    expect(passed.targets[0].query.index).toBe('a');
  });
});

function _isArray(v: any) {
  return Object.prototype.toString.call(v) === '[object Array]';
}
