/**
 * N34-var 第二条证据：变量替换真的走到了 v2 取数路径上。
 *
 * ck / doris / mysql / pgsql 四种源的仪表盘面板时序取数都经过
 * `src/pages/dashboard/Renderer/datasource/queryBatchV2.ts:178`，那一行调
 * `replaceTemplateVariables(sqlText, { range, scopedVars })`。接通垫片之前，
 * 面板 SQL 里的 `${host}` 会原样发给后端；接通之后发出去的应该是替换后的值。
 *
 * 做法：把发请求的 `./service` mock 掉，把真正发出去的信封留下来看一眼 SQL。
 */
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

import '@/i18n';

// 把发请求那一层换成假的，只记下信封；返回空结果集，让 queryBatchV2 正常走完。
const fetchDashboardQueryMock = jest.fn(() => Promise.resolve({ results: [] } as any));
jest.mock('@/pages/dashboard/Renderer/datasource/service', () => ({
  __esModule: true,
  fetchDashboardQuery: (...args: any[]) => fetchDashboardQueryMock(...(args as [])),
}));

import { queryBatchV2 } from '@/pages/dashboard/Renderer/datasource/queryBatchV2';
import { setGlobalState, toVariablesWithOptions } from '@/pages/dashboard/Variables/utils/n9eShim';

const range = { start: '2026-10-07T00:00:00.000Z', end: '2026-10-07T01:00:00.000Z' };

function sentSQL(): string {
  const envelope = fetchDashboardQueryMock.mock.calls[0]?.[0] as any;
  return envelope?.queries?.[0]?.query?.sql;
}

describe('N34-var 变量替换走到 v2 取数路径（queryBatchV2）', () => {
  beforeEach(() => {
    fetchDashboardQueryMock.mockClear();
    fetchDashboardQueryMock.mockImplementation(() => Promise.resolve({ results: [] } as any));
    setGlobalState('variablesWithOptions', []);
  });

  afterAll(() => {
    setGlobalState('variablesWithOptions', []);
  });

  test('没有变量时：SQL 里的 ${host} 原样发出去（这是改之前的行为）', async () => {
    await queryBatchV2({
      cate: 'ck',
      datasourceValue: 1,
      time: range,
      targets: [{ refId: 'A', query: { query: 'select * from t where h=${host}' } }],
    });
    expect(fetchDashboardQueryMock).toHaveBeenCalledTimes(1);
    expect(sentSQL()).toBe('select * from t where h=${host}');
  });

  test('ck（SQL 存在 query.query）：${host} 被换成当前值', async () => {
    setGlobalState(
      'variablesWithOptions',
      toVariablesWithOptions([{ name: 'host', type: 'query', definition: '', datasource: { cate: 'prometheus' }, options: ['a', 'b'], value: 'a' }]),
    );
    await queryBatchV2({
      cate: 'ck',
      datasourceValue: 1,
      time: range,
      targets: [{ refId: 'A', query: { query: 'select * from t where h=${host}' } }],
    });
    expect(sentSQL()).toBe('select * from t where h=a');
  });

  test('pgsql（SQL 存在 query.sql）：$host 被换成当前值，内置 $__from / $__to 也在', async () => {
    setGlobalState(
      'variablesWithOptions',
      toVariablesWithOptions([{ name: 'host', type: 'query', definition: '', datasource: { cate: 'prometheus' }, options: ['a'], value: 'a' }]),
    );
    await queryBatchV2({
      cate: 'pgsql',
      datasourceValue: 2,
      time: range,
      targets: [{ refId: 'A', query: { sql: 'select * from t where h=$host and ts>${__from}' } }],
    });
    expect(sentSQL()).toBe('select * from t where h=a and ts>1791331200000');
  });

  test('mysql：多选变量按 sqlstring 风格加引号（mysql 在 ajustData 里有专门分支）', async () => {
    setGlobalState(
      'variablesWithOptions',
      toVariablesWithOptions([{ name: 'host', type: 'query', definition: '', datasource: { cate: 'mysql' }, multi: true, options: ['a', 'b'], value: ['a', 'b'] }]),
    );
    await queryBatchV2({
      cate: 'mysql',
      datasourceValue: 3,
      time: range,
      targets: [{ refId: 'A', query: { query: 'select * from t where h in (${host})' } }],
    });
    expect(sentSQL()).toBe("select * from t where h in ('a','b')");
  });

  test('doris：[[host]] 写法也被换掉', async () => {
    setGlobalState(
      'variablesWithOptions',
      toVariablesWithOptions([{ name: 'host', type: 'query', definition: '', datasource: { cate: 'prometheus' }, options: ['a'], value: 'a' }]),
    );
    await queryBatchV2({
      cate: 'doris',
      datasourceValue: 4,
      time: range,
      targets: [{ refId: 'A', query: { query: 'select * from t where h=[[host]]' } }],
    });
    expect(sentSQL()).toBe('select * from t where h=a');
  });
});
