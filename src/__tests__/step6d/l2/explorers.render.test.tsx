/**
 * 第六步 L2 · 即时查询页四个查询组件的冒烟测试。
 *
 * 挡的是「白屏级」的低级错：搬进来的 iotdb / tdengine / ck / loki 四个 Explorer
 * 只要有一处 import 错、context 少字段、组件签名对不上，渲染时就会抛出来。
 * 写法照 `../samples/dsList.render.test.tsx`、`../l3/queryBuilders.render.test.tsx` 与 `../README.md` 第三节。
 *
 * 四条都用 renderToString（不跑 useEffect，最干净）。props 照
 * `src/pages/explorer/Explorer.tsx` 里本轮加的四个分支（也就是 fe v9.1.0 同文件 :383-392）：
 * iotdb / tdengine 收 {datasourceValue, form}；loki 收 {datasourceValue, headerExtra, form}；
 * ck 收 {datasourceValue, headerExtra}，而且它自己用 `Form.useFormInstance()` 取表单，必须套在 <Form> 里。
 * headerExtra 一律给 null——它是「把工具条塞到页头那块 div 里」的 createPortal 目标，
 * 给 null 时组件自己会跳过（ck `Explorer/index.tsx:40`、loki `Loki/index.tsx` 的 headerExtra &&）。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Form } from 'antd';
import { StaticRouter } from 'react-router-dom';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 这里把它指回等价的 CommonJS 版 lib/。只影响本文件，不动共用的 jest.config.ts。（同 l3/queryBuilders.render.test.tsx）
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// ansi_up@6 是纯 ESM 包（package.json 的 "type": "module"），jest 读不了。
// loki 的日志行高亮 src/pages/explorer/Loki/component/logRow/highlight.tsx:3 用它把终端颜色码转成 HTML，
// 与本测试要证的事（页面渲染得出来）无关，整个换掉。
jest.mock('ansi_up', () => ({
  __esModule: true,
  AnsiUp: class {
    ansi_to_html(text: string) {
      return text;
    }
  },
}));
// ck 的「查询语法说明」抽屉：它 import 了 @uiw/react-md-editor（拖进只发 ESM 的 react-markdown）
// 和三个 .md 文档（jest 没有对应的 moduleNameMapper）。同 l3 的做法整个 mock 掉。
jest.mock('@/plugins/clickHouse/components/DocumentDrawer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// 三个插件的 services 与 loki 的 services 全部换成空数据：
// Meta 侧边栏、表结构补全、日志查询一进来就会发请求。
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
  getLogsQueryBatch: jest.fn(() => Promise.resolve([])),
  getSQLPreview: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/pages/explorer/Loki/services', () => ({
  __esModule: true,
  getLogsQuery: jest.fn(() => Promise.resolve({ result: [], resultType: 'streams' })),
}));

import '@/i18n';
import '@/pages/explorer/locale';
import '@/plugins/iotdb/locale';
import '@/plugins/TDengine/locale';
import '@/plugins/clickHouse/locale';

import IotDB from '@/plugins/iotdb/Explorer';
import TDengine from '@/plugins/TDengine/Explorer';
import CK from '@/plugins/clickHouse/Explorer';
import Loki from '@/pages/explorer/Loki';

// 把「拿 form 实例」这一步包一层：renderToString 里没法在外面先 Form.useForm()。
// initialValues 照即时查询页真实的两个字段（Explorer.tsx:61-64）。
function Wrapper({ children }: { children: (form: any) => React.ReactNode }) {
  const [form] = Form.useForm();
  return (
    <Form form={form} initialValues={{ datasourceCate: 'x', datasourceValue: 1 }}>
      {children(form)}
    </Form>
  );
}

describe('L2：四个即时查询组件能渲染出来', () => {
  it('iotdb Explorer：renderToString 不抛，容器与查询输入框都在', () => {
    let html = '';
    expect(() => {
      html = renderToString(<Wrapper>{(form) => <IotDB datasourceValue={1} form={form} />}</Wrapper>);
    }).not.toThrow();
    // src/plugins/iotdb/Explorer/index.tsx:51 写死的容器 className
    expect(html).toContain('iotdb-discover-container');
    // QueryBuilder 的输入框：Form.Item name={['query','query']} → antd 生成 id query_query
    expect(html).toContain('query_query');
    // db_iotdb 这个命名空间的词条确实注册上了，没吐出裸键
    expect(html).not.toContain('db_iotdb:');
  });

  it('tdengine Explorer：renderToString 不抛，容器与查询输入框都在', () => {
    let html = '';
    expect(() => {
      html = renderToString(<Wrapper>{(form) => <TDengine datasourceValue={1} form={form} />}</Wrapper>);
    }).not.toThrow();
    // src/plugins/TDengine/Explorer/index.tsx:45
    expect(html).toContain('tdengine-discover-container');
    expect(html).toContain('query_query');
    expect(html).not.toContain('db_tdengine:');
  });

  it('ck Explorer：renderToString 不抛（headerExtra 给 null 时跳过 portal）', () => {
    let html = '';
    expect(() => {
      html = renderToString(<Wrapper>{() => <CK datasourceValue={1} headerExtra={null} />}</Wrapper>);
    }).not.toThrow();
    // src/plugins/clickHouse/Explorer/index.tsx:39 的 `${NAME_SPACE}-explorer-container`，NAME_SPACE = 'n9e-ck'
    expect(html).toContain('n9e-ck-explorer-container');
    expect(html).not.toContain('n9e-ck:');
  });

  it('loki Explorer：renderToString 不抛，容器 / LogQL 输入框 / 查询按钮都在', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        // Loki/index.tsx:8 用了 useLocation，要有 Router 上下文
        <StaticRouter location='/log/explorer'>
          <Wrapper>{(form) => <Loki datasourceValue={1} headerExtra={null} form={form} />}</Wrapper>
        </StaticRouter>,
      );
    }).not.toThrow();
    // src/pages/explorer/Loki/index.tsx:195 的根容器 className
    // （`loki-discover-main` 在 :255，要等查到日志、data 非空才渲染，冒烟这条到不了）
    expect(html).toContain('es-discover-container');
    // LogQLInput 的编辑器容器（src/components/LogQLInput/index.tsx 的 promql-input），
    // 证明新装的 @fc-components/codemirror-promql 这条链能加载
    expect(html).toContain('promql-input');
    // t('query_btn') 翻成了「查询」而不是吐裸键，说明 explorer 这个命名空间的词条注册上了
    expect(html).toContain('查 询');
    expect(html).not.toContain('explorer:query_btn');
  });
});
