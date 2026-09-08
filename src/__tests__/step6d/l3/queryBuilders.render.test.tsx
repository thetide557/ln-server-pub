/**
 * 第六步 L3 · 仪表盘查询编辑器的冒烟测试。
 *
 * 挡的是「白屏级」的低级错：搬进来的三个 QueryBuilder 只要有一处 import 错、
 * context 少字段、组件签名对不上，渲染时就会抛出来。
 * 写法照 `../samples/dsList.render.test.tsx` 与 `../README.md` 第三节。
 *
 * iotdb / tdengine 用 renderToString（不跑 useEffect，最干净）；
 * ck 那条只能用 @testing-library 的 render——它的 `Form.useWatch('type')`
 * （rc-field-form/lib/useWatch.js:34 是 `useState()` 无初值）第一次渲染必然是 undefined，
 * 而 `clickHouse/Dashboard/QueryBuilder.tsx:25` 写着 `if (!type) return null`，
 * 不跑 effect 就只能得到空串。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form, Input } from 'antd';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 这里把它指回等价的 CommonJS 版 lib/。只影响本文件，不动共用的 jest.config.ts。
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// ck 的「查询语法说明」抽屉整个 mock 掉：它 import 了两样 jest 读不了的东西——
// ①@uiw/react-md-editor 拖进来的 react-markdown 只发 ESM（先例：拍板-15 的 L5-2 同样 mock 掉 @/components/Markdown）；
// ②三个 .md 文档，vite 有 md() 插件、jest.config.ts 的 moduleNameMapper 没有对应规则。
// 跟本测试要证的事（编辑器渲染得出来）无关。
jest.mock('@/plugins/clickHouse/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// 三个类型的 services 全部换成空数据：QueryBuilder 里的 Meta 弹窗 / 表结构补全一进来就会发请求
jest.mock('@/plugins/iotdb/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getColumns: jest.fn(() => Promise.resolve([])),
  getDsQuery: jest.fn(() => Promise.resolve([])),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/plugins/TDengine/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getColumns: jest.fn(() => Promise.resolve([])),
  getDsQuery: jest.fn(() => Promise.resolve([])),
  getSqlTemplate: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/plugins/clickHouse/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getDescTable: jest.fn(() => Promise.resolve([])),
  getDsQuery2: jest.fn(() => Promise.resolve([])),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  getSQLPreview: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/iotdb/locale';
import '@/plugins/TDengine/locale';
import '@/plugins/clickHouse/locale';

import IotDB from '@/plugins/iotdb/Dashboard/QueryBuilder';
import TDengine from '@/plugins/TDengine/Dashboard/QueryBuilder';
import CK from '@/plugins/clickHouse/Dashboard/QueryBuilder';

// antd 会按 Form.Item 的 name 生成 input 的 id：['targets', 0, 'query', 'query'] → targets_0_query_query
// 按 id 断言比按中文文案稳，不受 i18n 改词影响（README 第三节第 3 条）。
const QUERY_INPUT_ID = 'targets_0_query_query';

describe('L3：三个仪表盘查询编辑器能渲染出来', () => {
  it('iotdb QueryBuilder：renderToString 不抛，且有查询输入框', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        <Form initialValues={{ targets: [{ refId: 'A' }] }}>
          <IotDB datasourceValue={1} />
        </Form>,
      );
    }).not.toThrow();
    expect(html).toContain(QUERY_INPUT_ID);
    // src/plugins/iotdb/Dashboard/QueryBuilder.tsx:136 那个写死的按钮文案
    expect(html).toContain('+ add query');
    // db_iotdb 这个命名空间的词条确实注册上了（locale/zh_CN.ts 的 query.query）
    expect(html).not.toContain('db_iotdb:query.query');
  });

  it('tdengine QueryBuilder：renderToString 不抛，且有查询输入框', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        <Form initialValues={{ targets: [{ refId: 'A' }] }}>
          <TDengine datasourceValue={1} />
        </Form>,
      );
    }).not.toThrow();
    expect(html).toContain(QUERY_INPUT_ID);
    expect(html).toContain('+ add query');
    expect(html).not.toContain('db_tdengine:query.query');
  });

  it('ck QueryBuilder：render 不抛，且有 timeSeries / raw 两种模式的下拉', () => {
    let container: HTMLElement | undefined;
    expect(() => {
      const r = render(
        <Form initialValues={{ type: 'timeseries', targets: [{ refId: 'A', query: { mode: 'timeSeries' } }] }}>
          {/* `type` 必须真的注册成一个字段：rc-field-form 1.26.7 的 useWatch（useWatch.js:78）
              是拿 `getFieldsValue()` 取初值的，而它只返回**已注册字段**的值。
              真实页面里 `type` 是图表类型选择器（pub src/pages/dashboard/Editor/index.tsx），本来就注册着；
              这里补一个 hidden 的顶上，否则 `if (!type) return null` 会让整个编辑器渲染成空。 */}
          <Form.Item name='type' hidden>
            <Input />
          </Form.Item>
          <CK datasourceValue={1} />
        </Form>,
      );
      container = r.container;
    }).not.toThrow();
    // clickHouse/Dashboard/QueryBuilder.tsx:86 的模式下拉，name=[0,'query','mode']
    expect(container!.querySelector('#targets_0_query_mode')).not.toBeNull();
    // :67 写死的 className
    expect(container!.innerHTML).toContain('n9e-mysql-dashboard-querybuilder-query-item');
    // n9e-ck 这个命名空间的词条注册上了：query.dashboard.mode.timeSeries → 时序数据
    expect(container!.innerHTML).toContain('时序数据');
    expect(container!.innerHTML).not.toContain('n9e-ck:query.query');
  });
});
