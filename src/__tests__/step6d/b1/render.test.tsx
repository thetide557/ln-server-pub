/**
 * 第六步 B1（补搬轮）· doris 仪表盘查询编辑器 + victorialogs 即时查询页的冒烟测试。
 *
 * 挡的是「白屏级」的低级错：本轮搬进来的这两块，只要有一处 import 错、context 少字段、
 * 组件签名对不上，渲染时就会抛出来。
 * 写法照 `../l2/explorers.render.test.tsx`、`../l3/queryBuilders.render.test.tsx` 与 `../README.md` 第三节。
 *
 * doris 那条用 @testing-library 的 render（同 l3 的 ck）：它的 `Form.useWatch('type')`
 * （rc-field-form 的 useWatch 是 `useState()` 无初值）在 renderToString 下必然是 undefined，
 * 而 `doris/Dashboard/QueryBuilder.tsx:31` 写着 `if (!type) return null`，不跑 effect 就只能得到空串。
 * victorialogs 那条用 renderToString（不跑 useEffect，最干净）：props 照 `src/pages/explorer/Explorer.tsx`
 * 本轮加的分支（也就是 fe v9.1.0 同文件 :391-392），headerExtra 给 null——它是 createPortal 的目标，
 * 给 null 时组件自己会跳过（`plugins/victorialogs/Explorer/index.tsx:70`）。
 * 组件内部用 `Form.useFormInstance()` 取表单、用 `useLocation()` 读地址栏，所以要套 <Form> 与 <StaticRouter>。
 *
 * 注：doris 那条曾随 doris L3 一起按主 session 的 M3 兜底（丙）撤掉，2026-09-09 机器加内存后按拍板-30
 * 构建通过（堆 8192 / 笼子 10G），连同 doris L3 一起**恢复**回来；来龙去脉见
 * `第六步-流水线/多数据源/拿不准-B1.md` B1-3、B1-10。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form, Input } from 'antd';
import { render } from '@testing-library/react';
import { StaticRouter } from 'react-router-dom';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 这里把它指回等价的 CommonJS 版 lib/。只影响本文件，不动共用的 jest.config.ts。（同 l2 / l3）
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// 「查询语法说明」抽屉：它 import 了三个 .md 文档（jest 没有对应的 moduleNameMapper），
// doris 的 SQLBuilder.tsx:9 / QueryStringBuilder.tsx:10 都用它。与本测试要证的事无关，整个换掉。
jest.mock('@/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
// @fc-components/monaco-editor 里是整包 monaco（只发 ESM、还要 web worker），jest 跑不动；
// doris 的 QueryBuilder.tsx:6 用它的 SqlMonacoPreview 只读展示 SQL、SQLInputWrap.tsx:4 用 SqlMonacoEditor 写 SQL。
// 换成两个占位组件，不影响「编辑器骨架渲染得出来」这件事。
jest.mock('@fc-components/monaco-editor', () => ({
  __esModule: true,
  SqlMonacoPreview: () => null,
  SqlMonacoEditor: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// 两个类型的 services 换成空数据：库表下拉、字段补全、直方图、日志查询一进来就会发请求。
jest.mock('@/plugins/doris/services', () => ({
  __esModule: true,
  getDatabases: jest.fn(() => Promise.resolve([])),
  getTables: jest.fn(() => Promise.resolve([])),
  getDescTable: jest.fn(() => Promise.resolve([])),
  getDsQuery2: jest.fn(() => Promise.resolve([])),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  getSQLPreview: jest.fn(() => Promise.resolve([])),
  getFields: jest.fn(() => Promise.resolve([])),
  getFieldSample: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/plugins/victorialogs/services', () => ({
  __esModule: true,
  getHistogram: jest.fn(() => Promise.resolve({ hits: [] })),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  logQuery: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/doris/locale';
import '@/plugins/victorialogs/locale';

import DorisQueryBuilder from '@/plugins/doris/Dashboard/QueryBuilder';
import VictorialogsExplorer from '@/plugins/victorialogs/Explorer';

describe('B1：doris 仪表盘查询编辑器 + victorialogs 即时查询页能渲染出来', () => {
  it('doris Dashboard QueryBuilder：render 不抛，骨架和 db_doris 词条都在', () => {
    let container: HTMLElement | undefined;
    expect(() => {
      const r = render(
        <Form initialValues={{ type: 'timeseries', targets: [{ refId: 'A', query: { mode: 'timeSeries' } }] }}>
          {/* `type` 必须真的注册成一个字段：rc-field-form 的 useWatch 是拿 `getFieldsValue()` 取初值的，
              而它只返回**已注册字段**的值。真实页面里 `type` 是图表类型选择器（pub src/pages/dashboard/Editor/Form.tsx），
              本来就注册着；这里补一个 hidden 的顶上，否则 `if (!type) return null` 会让整个编辑器渲染成空。（同 l3 的 ck 那条） */}
          <Form.Item name='type' hidden>
            <Input />
          </Form.Item>
          <DorisQueryBuilder datasourceValue={1} />
        </Form>,
      );
      container = r.container;
    }).not.toThrow();
    expect(container!.innerHTML).not.toBe('');
    // db_doris 这个命名空间的词条确实注册上了——渲染结果里不该出现裸键
    expect(container!.innerHTML).not.toContain('db_doris:');
  });

  it('victorialogs Explorer：renderToString 不抛，查询框 / 直方图容器 / 三个结果页签都在', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        <StaticRouter location='/log/explorer'>
          <Form initialValues={{ query: { query: '', limit: 500 }, range: { start: 'now-1h', end: 'now' } }}>
            <VictorialogsExplorer datasourceValue={1} headerExtra={null} />
          </Form>
        </StaticRouter>,
      );
    }).not.toThrow();
    // Explorer/index.tsx:69 的根容器 className 来自 constants.ts 的 STYLE_NAME_SPACE = `n9e-victorialogs`
    expect(html).toContain('n9e-victorialogs');
    // QueryBuilder.tsx 的「限制数量」输入框，antd 按 name=['query','limit'] 生成 id=query_limit
    // （查询语句那个 textarea 是自定义组件 components/QueryInput，没有 id，所以按这个断言）
    expect(html).toContain('query_limit');
    // Graph.tsx 顶上的 t('explorer.hits')：victorialogs 命名空间的词条真的注册上了才会是中文
    expect(html).toContain('匹配结果');
    // 三个结果页签（Logs/index.tsx 的分组 / 表格 / JSON）都渲染出来了
    expect(html).toContain('分组');
    expect(html).toContain('JSON');
    // 渲染结果里不该出现裸键
    expect(html).not.toContain('victorialogs:explorer.');
  });
});
