/**
 * N36 批 A（A-2b）· `services/login.ts` 这一层：三个「取 SSO 跳出地址」的函数到底往网线上发了什么。
 *
 * 上一份用例（`ssoRedirect.render.test.tsx`）钉的是「页面传给服务函数的值对不对」；
 * 这一份往下再走一层，把 `@/utils/request` 换成假的，看服务函数真正交给它的 URL 与 `params`。
 * 要钉两件事：
 *
 *  1. 有值的时候，`params` 是 `{ redirect: '<站内路径>' }`——照上游
 *     `ee48e701:src/services/login.ts:73/87/101`（三个函数都是 `params: { redirect }`）。
 *  2. **没值的时候，整个 `params` 是 `undefined`，不是 `{ redirect: undefined }`。**
 *     为什么要特意钉这一条：如果写成 `params: { redirect }`，`redirect` 为 undefined 时
 *     umi-request 固然会把这个键丢掉，但只要哪天有人顺手改成模板串或者 `String(redirect)`，
 *     发出去就成了 `?redirect=undefined`——后端 `ginx.QueryStr(c, "redirect", "/")`
 *     会拿到字符串 "undefined" 当路径用，默认值 `/` 反而轮不到。整个参数不发最干净。
 *
 * 顺带还钉了三个 URL 没写错（CAS / OIDC / OAuth 三条路由各自对应哪个后端 handler，
 * 见 ln-server `center/router/router_login.go`：OIDC `loginRedirect` :1049 起、
 * CAS `loginRedirectCas` :1226 起、OAuth `loginRedirectOauth` :1392 起）。
 */

// `@/utils/request` 换成一个只记账的假函数。必须在 import services/login 之前 mock 掉——
// jest.mock 会被 ts-jest 提到 import 之前，所以写在这里就行。
const mockRequest = jest.fn(() => Promise.resolve({ dat: { redirect: '', valid: false } }));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: (...args: any[]) => mockRequest.apply(null, args as any),
}));

import { getRedirectURL, getRedirectURLCAS, getRedirectURLOAuth } from '@/services/login';
import { RequestMethod } from '@/store/common';

type Fn = (redirect?: string) => Promise<any>;

const cases: Array<[string, Fn, string]> = [
  ['getRedirectURL（OIDC）', getRedirectURL, '/api/n9e/auth/redirect'],
  ['getRedirectURLCAS', getRedirectURLCAS, '/api/n9e/auth/redirect/cas'],
  ['getRedirectURLOAuth', getRedirectURLOAuth, '/api/n9e/auth/redirect/oauth'],
];

describe('N36-A (A-2b)：三个 SSO 跳出接口发出去的 params', () => {
  it.each(cases)('%s：传站内路径 → params 为 { redirect: 那个路径 }，URL 不变、方法仍是 GET', async (_name, fn, url) => {
    await fn('/dashboard/1');
    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = mockRequest.mock.calls[0] as any[];
    expect(calledUrl).toBe(url);
    expect(options.method).toBe(RequestMethod.Get);
    expect(options.params).toEqual({ redirect: '/dashboard/1' });
  });

  it.each(cases)('%s：不传（undefined）→ params 整个是 undefined，不会发出 redirect=undefined', async (_name, fn, url) => {
    await fn(undefined);
    const [calledUrl, options] = mockRequest.mock.calls[0] as any[];
    expect(calledUrl).toBe(url);
    expect(options.params).toBeUndefined();
    // 兜一句死的：options 里连 redirect 这个键都不该冒出来
    expect(Object.prototype.hasOwnProperty.call(options, 'params')).toBe(true);
    expect(JSON.stringify(options)).not.toContain('undefined');
  });

  it.each(cases)('%s：一个参数都不传（旧调用方的写法）→ 同样不带 params，老调用点不会被这次改动带坏', async (_name, fn) => {
    await (fn as () => Promise<any>)();
    const [, options] = mockRequest.mock.calls[0] as any[];
    expect(options.params).toBeUndefined();
  });

  it.each(cases)('%s：传空串 → 当成没有，不带 params（后端会用它自己的默认 /）', async (_name, fn) => {
    await fn('');
    const [, options] = mockRequest.mock.calls[0] as any[];
    expect(options.params).toBeUndefined();
  });
});
