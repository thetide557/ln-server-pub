/**
 * 第六步 · ES 升级轮（step6f）的冒烟测试。
 *
 * 分两类，看注释里的标记：
 *   【本轮覆盖】L1 数据源详情页 —— 按 fe v9.1.0 覆盖过，这里要证「覆盖后还能渲染」，
 *              并且把覆盖带进来的两处新东西（多地址列表、写配置一栏）钉住。
 *   【本轮未覆盖·基线】L2 即时查询经典页 / L3 仪表盘 ES 查询编辑器 / L3b 仪表盘 ES 取数
 *              —— 这三层按任务书的判定规则本轮没覆盖（原因见
 *              `第六步-流水线/多数据源/ES升级轮-拿不准.md` 第 2、3、4 条）。
 *              先把 pub 现在的样子用冒烟测试钉下来，将来那一轮再覆盖时好对照。
 *
 * 写法照 `../l2/explorers.render.test.tsx`、`../l3/queryBuilders.render.test.tsx` 与 `../README.md` 第三节：
 * 一律 renderToString（不跑 useEffect，最干净），services 全部 mock 成空数据。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form } from 'antd';
import { StaticRouter } from 'react-router-dom';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// @ant-design/plots 会拖进 @antv/g2plot -> d3-interpolate，那是纯 ESM，jest 读不了。
// pub 的 explorer/Elasticsearch/utils.tsx:4 只用它的 measureTextWidth 算列宽，与本测试要证的事无关。
jest.mock('@ant-design/plots', () => ({
  __esModule: true,
  measureTextWidth: () => 100,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// ES 经典页一进来就会拉索引 / 字段 / 日志，全部换成空数据。
jest.mock('@/pages/explorer/Elasticsearch/services', () => ({
  __esModule: true,
  getIndices: jest.fn(() => Promise.resolve([])),
  getFields: jest.fn(() => Promise.resolve({ allFields: [], fields: [] })),
  getFullFields: jest.fn(() => Promise.resolve({ allFields: [], fields: [] })),
  getLogsQuery: jest.fn(() => Promise.resolve({ total: 0, list: [] })),
  getDsQuery: jest.fn(() => Promise.resolve([])),
  getESVersion: jest.fn(() => Promise.resolve('7.10.2')),
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
import { getLogsQuery as buildLogsQuery, getSeriesQuery as buildSeriesQuery } from '@/pages/dashboard/Renderer/datasource/elasticsearch/queryBuilder';

describe('ES 升级轮 · L1 数据源详情页（本轮已按 fe v9.1.0 覆盖）', () => {
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

describe('ES 升级轮 · 本轮未覆盖的三层，先钉一条基线', () => {
  it('L2 即时查询经典页：renderToString 不抛（headerExtra 给 null 时跳过 portal）', () => {
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

  it('L3 仪表盘 ES 查询编辑器：renderToString 不抛，能渲染出一条查询', () => {
    const Wrapper = () => {
      const [chartForm] = Form.useForm();
      return (
        <Form form={chartForm} initialValues={{ targets: [{ refId: 'A', query: { index: 'logstash-*', date_field: '@timestamp' } }] }}>
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

  it('L3b 仪表盘 ES 取数：queryBuilder 生成的请求体形状', () => {
    const target: any = {
      index: 'logstash-*',
      filter: 'level:error',
      date_field: '@timestamp',
      limit: 100,
      values: [{ func: 'count' }],
      group_by: [],
    };
    const logs: any = buildLogsQuery(target);
    expect(logs.size).toBe(100);
    expect(JSON.stringify(logs)).toContain('level:error');

    const series: any = buildSeriesQuery({ ...target, interval: 60 } as any, 'interval');
    expect(series.size).toBe(0);
    expect(series.query).toBeTruthy();
  });
});
