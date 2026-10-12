/**
 * 阶段 II · W0 小修③：ES 即时查询的兜底之前，先判 `responses[0].error`。
 *
 * 背景（判定门 `G8-ES兜底补丁核对.md` 第三节 + 主 session 拍板 M38）：
 * ES 的 `/_msearch` 出错时 HTTP 仍是 200，错误装在 `responses[0].error` 里；
 * pub 的 `src/utils/request.ts:106-111` 对 `/api/takin/proxy` 这类地址是「200 就原样返回」，
 * 所以错误会一路直达 `.then`。羚牛那个兜底（`_.get(res,'responses[0].hits',{hits:[],total:0})`）
 * 会把它当成「查到 0 条」，页面显示「暂无数据」、错误横幅还被 `index.tsx:291` 清空，
 * ES 说的真实原因一个字都看不到。本轮在兜底前加三行：有 error 就 throw ES 的 reason。
 *
 * 这份测试钉住三种响应：
 *   1. 出错的响应 → reject，message 是 `root_cause[0].reason`（具体原因，不是「all shards failed」）；
 *   2. 正常有命中的响应 → 照旧 resolve，total / list 不变（行为没被改坏）；
 *   3. `hits` 缺失且没有 error → 仍返回 `{ total: 0, list: [] }`（羚牛原补丁 50763f9 保住）。
 */
const mockRequest = jest.fn();
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: (...args: any[]) => mockRequest.apply(null, args as []),
}));

import { getLogsQuery } from '@/pages/explorer/Elasticsearch/services';

describe('step6h W0 小修③ · getLogsQuery 兜底前先判 responses[0].error', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('① responses[0].error 存在时 reject，message 取 root_cause[0].reason', async () => {
    mockRequest.mockReturnValue(
      Promise.resolve({
        responses: [
          {
            error: {
              type: 'search_phase_execution_exception',
              reason: 'all shards failed',
              root_cause: [
                {
                  type: 'query_shard_exception',
                  reason: 'No mapping found for [old_sort_field] in order to sort on',
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(getLogsQuery(1, {}, 'req-error')).rejects.toThrow('No mapping found for [old_sort_field]');
  });

  it('①b 没有 root_cause 时退回顶层 reason；两者都没有时给 JSON 串', async () => {
    mockRequest.mockReturnValue(Promise.resolve({ responses: [{ error: { reason: 'index_not_found_exception' } }] }));
    await expect(getLogsQuery(1, {}, 'req-error-2')).rejects.toThrow('index_not_found_exception');

    mockRequest.mockReturnValue(Promise.resolve({ responses: [{ error: { status: 500 } }] }));
    await expect(getLogsQuery(1, {}, 'req-error-3')).rejects.toThrow('{"status":500}');
  });

  it('② 正常响应仍 resolve、行为不变', async () => {
    mockRequest.mockReturnValue(
      Promise.resolve({
        responses: [
          {
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [
                { _id: 'a', _source: { message: 'hello' }, fields: {} },
                { _id: 'b', _source: { message: 'world' }, fields: {} },
              ],
            },
          },
        ],
      }),
    );

    const res = await getLogsQuery(1, {}, 'req-ok');
    expect(res.total).toBe(2);
    expect(res.list.length).toBe(2);
  });

  it('③ hits 缺失且没有 error 时，仍返回 { total: 0, list: [] }（羚牛补丁 50763f9 没被改坏）', async () => {
    mockRequest.mockReturnValue(Promise.resolve({ responses: [{}] }));
    const res = await getLogsQuery(1, {}, 'req-empty');
    expect(res.total).toBe(0);
    expect(res.list).toEqual([]);
  });
});
