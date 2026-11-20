/**
 * N36 批 H1 第 14 条：个人中心改资料这条请求必须带 `contacts`。
 *
 * 背景（后端第十份第三节 1，待办 `LN-USER-CONTACTS-SELF-01`）：后端在 `POST /api/takin/users`
 * 与 `PUT /api/takin/user/:id/profile` 两条上已经把 contacts 兜成 `{}`，
 * 但**个人中心自己改资料这条** `PUT /api/takin/self/profile` 走的是裸字串、没兜。
 * 不带这个字段就会在库里落成空串，空串不是合法 JSON，之后用户列表
 * `GET /api/takin/users` 与用户详情整个请求都会失败（`sql: Scan error … contacts`）。
 *
 * 组装处 `src/pages/account/info.tsx:109-142` 的 `contacts` 来自表单，表单里没填就是 undefined，
 * `JSON.stringify` 会把 undefined 的键整个丢掉；所以兜底加在 `src/services/account.ts` 的
 * `UpdateProfile` 里——那是这条请求唯一的出口。
 */
const mockRequest = jest.fn(() => Promise.resolve({}));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: (...args: any[]) => mockRequest.apply(null, args as []),
}));

import { UpdateProfile } from '@/services/account';

describe('N36 批 H1 第 14 条 · PUT /api/takin/self/profile 的请求体带 contacts', () => {
  beforeEach(() => {
    mockRequest.mockClear();
  });

  it('① 调用方没给 contacts 时，请求体里是空对象 {}（不是 undefined、不是空串）', async () => {
    await UpdateProfile({ nickname: '小明', email: '', phone: '' });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [url, options] = (mockRequest.mock.calls[0] as any[]) as [string, any];
    expect(url).toBe('/api/takin/self/profile');
    expect(String(options.method).toUpperCase()).toBe('PUT');
    expect(options.data).toHaveProperty('contacts');
    expect(options.data.contacts).toEqual({});
    // 真会被发出去（JSON.stringify 不会把它丢掉）
    expect(JSON.parse(JSON.stringify(options.data))).toHaveProperty('contacts');
  });

  it('① b contacts 是 undefined / null 时一样兜成 {}', async () => {
    await UpdateProfile({ nickname: 'a', contacts: undefined });
    expect(((mockRequest.mock.calls[0] as any[])[1] as any).data.contacts).toEqual({});

    mockRequest.mockClear();
    await UpdateProfile({ nickname: 'a', contacts: null });
    expect(((mockRequest.mock.calls[0] as any[])[1] as any).data.contacts).toEqual({});
  });

  it('② 调用方给了 contacts 就原样发（兜底不会顶掉真值）', async () => {
    await UpdateProfile({ nickname: 'a', contacts: { dingtalk_robot_token: 'abc' } });
    const body = ((mockRequest.mock.calls[0] as any[])[1] as any).data;
    expect(body.contacts).toEqual({ dingtalk_robot_token: 'abc' });
    expect(body.nickname).toBe('a');
  });
});
