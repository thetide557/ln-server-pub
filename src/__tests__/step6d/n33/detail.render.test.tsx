/**
 * N33 批 B · B-1：数据源「详情抽屉」11 种类型各渲染一遍的冒烟测试。
 *
 * 钉的是什么：`src/pages/datasource/Datasources/Detail.tsx` 原来只有 prometheus / elasticsearch /
 * jaeger 三个分支，另外九种新类型全落到最后那行 `plus:` 占位上；而 `plus:` 在版本 A 里被解析成
 * `plugins/PlusPlaceholder.tsx`（返回 null，jest 这边由 jest.config.ts:31 的 moduleNameMapper 照做），
 * 所以那九种点开详情抽屉时「HTTP」「认证」「Headers」几块整块是空白的（n29/结论正本.md B-2）。
 * 本批把 12 个分支补齐之后，这份用例对 11 种 plugin_type 各渲染一次，断言：
 *   ①不抛异常；②渲染出来的 HTML 非空——这一条就是「没落到 `plus:` 占位」的判据，
 *     因为占位组件 return null、renderToString 的结果是空字符串（本文件最后一个 it 反证了这一点）；
 *   ③每种都至少出现一个 `page-title` 小标题（11 个组件都用它分块）。
 *
 * 为什么用 react-dom/server 的 renderToString：不跑 useEffect、不发请求、不碰定时器，
 * 只要组件树里有一处 import 错、少了 locale 命名空间、字段取法对不上，就会立刻抛出来。
 * 写法照样板 src/__tests__/step6d/samples/dsList.render.test.tsx。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';

// `@/App` 太重（会把整棵路由树拉进来）；AdvancedWrap 只要它导出的 CommonStateContext，
// es 的 Detail（ElasticSearch/Detail.tsx:84）和 tdengine 的 Detail 都 import 了 AdvancedWrap。
jest.mock('@/App', () => require('../helpers/appMock'));

import '@/i18n';
import '@/pages/datasource/locale';
// mysql / pgsql 两个详情组件的词条挂在各自插件的命名空间里（n9e-mysql / pgsql），
// 这两份 locale/index.ts 要显式 import 才会 addResourceBundle（见 src/plugins/pgsql/locale/index.ts 的注释）。
import '@/plugins/mysql/locale';
import '@/plugins/pgsql/locale';
import Detail from '@/pages/datasource/Datasources/Detail';

// 每种类型的最小字段。取法照各自 Detail 组件真正读的那几个键：
// mysql / pgsql 的 `settings['<type>.shards']` 是直接 `.map()`（没有可选链），所以必须给数组；
// doris 的 `settings['doris.addr']`、ck 的 `settings['ck.*']` 也是直接取，settings 不能缺。
const samples: Record<string, any> = {
  prometheus: { http: { url: 'http://127.0.0.1:9090' }, auth: {}, settings: {} },
  elasticsearch: { http: { url: 'http://127.0.0.1:9200' }, auth: {}, settings: {} },
  opensearch: {
    http: {},
    auth: {},
    settings: { 'os.nodes': ['http://127.0.0.1:9200'], 'os.basic': {}, 'os.version': '2.11.0' },
  },
  iotdb: { http: { url: 'http://127.0.0.1:18080' }, auth: {}, settings: {} },
  tdengine: { http: { url: 'http://127.0.0.1:6041' }, auth: {}, settings: {} },
  loki: { http: { url: 'http://127.0.0.1:3100' }, auth: {}, settings: {} },
  ck: {
    http: {},
    auth: {},
    settings: { 'ck.protocol': 'native', 'ck.nodes': ['127.0.0.1:9000'], 'ck.user': 'default' },
  },
  mysql: {
    http: {},
    auth: {},
    settings: {
      'mysql.shards': [{ 'mysql.addr': '127.0.0.1:3306', 'mysql.user': 'readonly' }],
      'mysql.tables': [],
    },
  },
  pgsql: {
    http: {},
    auth: {},
    settings: {
      'pgsql.shards': [{ 'pgsql.addr': '127.0.0.1:5432', 'pgsql.user': 'readonly', 'pgsql.db': 'n9e_pgsql_db' }],
      'pgsql.tables': [],
    },
  },
  doris: { http: {}, auth: {}, settings: { 'doris.addr': 'http://127.0.0.1:8030', 'doris.user': 'root' } },
  victorialogs: { http: {}, auth: {}, settings: { 'victorialogs.addr': 'http://127.0.0.1:9428' } },
};

function render(pluginType: string, extra?: any) {
  const data = { id: 1, name: `ds-${pluginType}`, plugin_type: pluginType, ...(samples[pluginType] ?? { http: {}, auth: {}, settings: {} }), ...extra };
  return renderToString(<Detail data={data} />);
}

describe('N33 批 B：数据源详情抽屉 11 种类型都渲染得出来', () => {
  it('11 种 plugin_type 都有真分支接住：不抛异常、HTML 非空、各自有 page-title 小标题', () => {
    const types = Object.keys(samples);
    expect(types).toHaveLength(11);

    types.forEach((type) => {
      let html = '';
      expect(() => {
        html = render(type);
      }).not.toThrow();
      // 非空 = 没落到 `plus:` 占位（占位 return null → 空字符串）
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('page-title');
    });
  });

  it('反证：未知的 plugin_type 才会落到 `plus:` 占位，渲染结果是空字符串', () => {
    expect(render('n33-not-a-real-datasource')).toBe('');
  });

  it('pgsql 详情里能看见分片的「数据库」（批 A 新加的 pgsql.db，羚牛比上游多一列）', () => {
    const html = render('pgsql');
    expect(html).toContain('n9e_pgsql_db');
    // 标签复用 n9e-mysql 命名空间的 datasource.shards.db（src/plugins/mysql/locale/zh_CN.ts:46）
    expect(html).toContain('数据库');
  });

  it('ck 详情里的两个开关翻成了中文（本批给 common 补的 yes / no 词条生效）', () => {
    const html = render('ck');
    // secure_connection / skip_ssl_verify 都没给值 → 都显示「否」；
    // 若 common:no 这个键缺着，i18next 会把键名原样印成 "no"
    expect(html).toContain('否');
    expect(html).not.toContain('>no<');
  });

  it('mysql / pgsql 的分片地址与用户名都显示出来了', () => {
    expect(render('mysql')).toContain('127.0.0.1:3306');
    expect(render('pgsql')).toContain('127.0.0.1:5432');
    expect(render('mysql')).toContain('readonly');
  });
});
