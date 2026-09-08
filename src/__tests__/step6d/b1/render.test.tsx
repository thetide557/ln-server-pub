/**
 * 第六步 B1（补搬轮）· victorialogs 即时查询页的冒烟测试。
 *
 * 挡的是「白屏级」的低级错：本轮搬进来的 victorialogs Explorer
 * 只要有一处 import 错、context 少字段、组件签名对不上，渲染时就会抛出来。
 * 写法照 `../l2/explorers.render.test.tsx`、`../l3/queryBuilders.render.test.tsx` 与 `../README.md` 第三节。
 *
 * 用 renderToString（不跑 useEffect，最干净）：props 照 `src/pages/explorer/Explorer.tsx` 本轮加的分支
 * （也就是 fe v9.1.0 同文件 :391-392），headerExtra 给 null——它是 createPortal 的目标，
 * 给 null 时组件自己会跳过（`plugins/victorialogs/Explorer/index.tsx:70`）。
 * 组件内部用 `Form.useFormInstance()` 取表单、用 `useLocation()` 读地址栏，所以要套 <Form> 与 <StaticRouter>。
 *
 * 注：原本这里还有一条 doris 仪表盘查询编辑器的用例，随 doris L3 一起按主 session 的 M3 兜底（丙）撤了，
 * 详见 `第六步-流水线/多数据源/拿不准-B1.md` B1-3、B1-10。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form } from 'antd';
import { StaticRouter } from 'react-router-dom';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 这里把它指回等价的 CommonJS 版 lib/。只影响本文件，不动共用的 jest.config.ts。（同 l2 / l3）
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// victorialogs 的 services 换成空数据：直方图与日志查询一进来就会发请求。
jest.mock('@/plugins/victorialogs/services', () => ({
  __esModule: true,
  getHistogram: jest.fn(() => Promise.resolve({ hits: [] })),
  getLogsQuery: jest.fn(() => Promise.resolve([])),
  logQuery: jest.fn(() => Promise.resolve([])),
}));

import '@/i18n';
import '@/plugins/victorialogs/locale';

import VictorialogsExplorer from '@/plugins/victorialogs/Explorer';

describe('B1：victorialogs 即时查询页能渲染出来', () => {
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
