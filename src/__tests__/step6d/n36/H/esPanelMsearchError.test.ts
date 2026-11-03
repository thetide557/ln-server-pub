/**
 * N36 批 H1 第 2 条：ES 仪表盘面板的 `_msearch` 报错时，把错误原因冒出来，别只画空图。
 *
 * 背景（后端第九份第二节 2）：ES 的 `/_msearch` 出错时 HTTP 仍是 200，错误装在 `responses[i].error` 里；
 * pub 的 `src/utils/request.ts` 对 `/api/n9e/proxy` 这类地址是「200 就原样返回、不查错误字段」，
 * 所以错误会一路走到取数函数。不判的话 `processResponseToSeries` 把它当成「查到 0 条」，
 * 面板显示空图、一个字看不到（典型：Group By 选了 text 型字段，ES 回
 * `Fielddata is disabled on text fields by default`）。
 *
 * 抛出来之后由 `src/pages/dashboard/Renderer/datasource/useQuery.tsx:116-118` 的 `.catch`
 * `setError(e.message)` 显示到面板上。做法与 N33 在即时查询那条路上的同款一致
 *（`src/pages/explorer/Elasticsearch/services.ts:206-209`，测试 `../../step6h-w0/esGetLogsQueryError.test.ts`）。
 * 上游 fe `ee48e701` 的同文件（`.../elasticsearch/index.ts`）也没判 error → 上游无，羚牛自加。
 */
// rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/
//（做法同 `../../es/render.test.tsx:22-23`）。query.ts 会一路 import 到 TimeRangePicker。
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
// query.ts 会一路 import 到 TimeRangePicker，它的 locale/index.ts 一加载就调 i18next.addResourceBundle；
// 先把 i18next 初始化好（做法同 `../../es/render.test.tsx:57`）。
import '@/i18n';

const getDsQueryMock = jest.fn();
const getESVersionMock = jest.fn(() => Promise.resolve('7.10.2'));

jest.mock('@/services/warning', () => ({
  __esModule: true,
  getDsQuery: (...args: any[]) => getDsQueryMock.apply(null, args as []),
  getESVersion: (...args: any[]) => getESVersionMock.apply(null, args as []),
}));
jest.mock('@/pages/log/IndexPatterns/services', () => ({
  __esModule: true,
  getESIndexPatterns: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/pages/dashboard/Renderer/datasource/elasticsearch/services.shim', () => ({
  __esModule: true,
  fetchHistoryRangeBatch2: jest.fn(() => Promise.resolve({ dat: [] })),
}));

import elasticSearchQuery from '@/pages/dashboard/Renderer/datasource/elasticsearch/query';

const baseOptions = {
  datasourceCate: 'elasticsearch',
  datasourceValue: 7,
  id: 'panel-1',
  time: { start: 'now-1h', end: 'now' },
  targets: [
    {
      refId: 'A',
      query: {
        index: 'log-*',
        date_field: '@timestamp',
        interval: 1,
        interval_unit: 'min',
        values: [{ func: 'count' }],
        group_by: [],
      },
    },
  ],
} as any;

describe('N36 批 H1 第 2 条 · 仪表盘 ES 面板把 _msearch 的错误冒出来', () => {
  beforeEach(() => {
    getDsQueryMock.mockReset();
  });

  it('① responses[0].error 存在时 reject，message 取 root_cause[0].reason', async () => {
    getDsQueryMock.mockReturnValue(
      Promise.resolve([
        {
          error: {
            type: 'search_phase_execution_exception',
            reason: 'all shards failed',
            root_cause: [
              {
                type: 'illegal_argument_exception',
                reason: 'Fielddata is disabled on text fields by default. Set fielddata=true on [message]',
              },
            ],
          },
        },
      ]),
    );

    await expect(elasticSearchQuery(baseOptions)).rejects.toThrow('Fielddata is disabled on text fields by default');
  });

  it('①b 没有 root_cause 时退回顶层 reason；两者都没有时给 JSON 串', async () => {
    getDsQueryMock.mockReturnValue(Promise.resolve([{ error: { reason: 'index_not_found_exception' } }]));
    await expect(elasticSearchQuery(baseOptions)).rejects.toThrow('index_not_found_exception');

    getDsQueryMock.mockReturnValue(Promise.resolve([{ error: { status: 500 } }]));
    await expect(elasticSearchQuery(baseOptions)).rejects.toThrow('{"status":500}');
  });

  it('①c 错误在第二个 response 上也要被冒出来（多个查询并一次 _msearch）', async () => {
    getDsQueryMock.mockReturnValue(
      Promise.resolve([
        { hits: { total: { value: 0 }, hits: [] }, aggregations: {} },
        { error: { root_cause: [{ reason: 'No mapping found for [nope]' }] } },
      ]),
    );
    await expect(elasticSearchQuery(baseOptions)).rejects.toThrow('No mapping found for [nope]');
  });

  it('② 正常响应仍 resolve、行为不变（没有 error 时一个字没改）', async () => {
    getDsQueryMock.mockReturnValue(Promise.resolve([{ hits: { total: { value: 0 }, hits: [] }, aggregations: {} }]));
    const res = await elasticSearchQuery(baseOptions);
    expect(res).toHaveProperty('series');
    expect(Array.isArray(res.series)).toBe(true);
  });
});
