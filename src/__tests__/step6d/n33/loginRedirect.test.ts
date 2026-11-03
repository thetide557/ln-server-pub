/**
 * N33 批 F · 登录成功后的站内回跳 `?redirect=`。
 *
 * 要证的事（两件）：
 *  1. `getSafeRedirect` / `sanitizeRedirect` 只放行站内相对路径 —— 外站、协议相对 URL、
 *     反斜杠、伪协议、控制字符、`..`、`/login` 套娃、光秃秃的 `/` 全部拒掉；
 *  2. `goAfterLogin` 有合法 `redirect` 就跳它、不跑 `fallback`；没有就只跑 `fallback`、
 *     一步都不跳（羚牛原来「查大屏 → `/screenView` 或 `/home`」那一段就在 `fallback` 里）。
 *
 * 背景：401 时 `src/utils/request.ts:69-72` 把当前地址 `encodeURIComponent` 一次挂到
 * `/login?redirect=…`；上游夜莺登录成功后 `window.location.href = redirect || '/'`
 * （`ee48e701:src/pages/login/index.tsx:189`），羚牛重写登录页时丢了这一支。
 * 白名单判法照后端同一套（`ln-server:center/router/router_login.go:36-50`
 * 的 `isSafeInternalRedirect`），另外自己多严了两条（整条值不许有反斜杠、不许有 `..`）。
 *
 * 为什么只测纯函数、不测页面渲染：五个入口（`loginNormal` / `loginSso` /
 * `loginCallback/{index,cas,oauth}`）要跑起来得先把十来个 service、`plus:/` 的
 * `useSsoWay`、less、AES、Cookies 全 mock 一遍，而真正要证的判断全在这个纯函数里；
 * 页面那一层只是「把原来的跳转包进 fallback」，用 `git show` 对比 fallback 内部一行未改
 * 更直接（核法写在 `n33/改动清单-F.md` 第四节）。
 */
import { getSafeRedirect, sanitizeRedirect, goAfterLogin } from '@/pages/login/redirect';

/**
 * 把 `window.location` 换成一个只有 `href` 的桩，这样 `goAfterLogin` 的赋值可以断言。
 * jsdom 不实现真正的导航，直接赋值只会在控制台留一条 "Not implemented: navigation"、
 * 而 `href` 的值并不会变，所以必须换桩。换桩只影响当前这个测试文件（jest 每个文件
 * 一个独立的 jsdom 环境）。
 */
const realLocation = window.location;
function stubLocation(): { href: string } {
  const stub = { href: '', search: '', pathname: '/' } as any;
  delete (window as any).location;
  (window as any).location = stub;
  return stub;
}
afterEach(() => {
  delete (window as any).location;
  (window as any).location = realLocation;
});

describe('getSafeRedirect：放行站内路径', () => {
  it('裸写的站内路径带 query 也能过，原样返回（OAuth 同意页的票据不能丢）', () => {
    expect(getSafeRedirect('?redirect=/oauth-consent?req=abc')).toBe('/oauth-consent?req=abc');
  });

  it('编码过的值由 URLSearchParams 解一次码，解出来正是原地址', () => {
    // request.ts:71 发出来的就是这个形状：encodeURIComponent('/oauth-consent?req=x')
    expect(getSafeRedirect('?redirect=%2Foauth-consent%3Freq%3Dx')).toBe('/oauth-consent?req=x');
  });

  it('普通页面路径能过', () => {
    expect(getSafeRedirect('?redirect=/home')).toBe('/home');
    expect(getSafeRedirect('?redirect=/alert-rules?id=3')).toBe('/alert-rules?id=3');
  });

  it('开头的 ? 可有可无', () => {
    expect(getSafeRedirect('redirect=/home')).toBe('/home');
  });
});

describe('getSafeRedirect：没有 redirect 就当没有', () => {
  it('query 里没有 redirect → undefined', () => {
    expect(getSafeRedirect('?foo=1')).toBeUndefined();
  });

  it('空 query / 空值 → undefined', () => {
    expect(getSafeRedirect('')).toBeUndefined();
    expect(getSafeRedirect('?redirect=')).toBeUndefined();
  });

  it('光秃秃的 "/" → undefined：它是后端的默认兜底值，不带「原来在哪」的信息，让位给 fallback 的大屏判断', () => {
    expect(getSafeRedirect('?redirect=%2F')).toBeUndefined();
    expect(sanitizeRedirect('/')).toBeUndefined();
  });
});

describe('getSafeRedirect：跳不出站（开放重定向的几种常见写法都拒）', () => {
  it('绝对 URL（含协议头）', () => {
    expect(getSafeRedirect('?redirect=https%3A%2F%2Fevil.example')).toBeUndefined();
    expect(sanitizeRedirect('https://evil.example')).toBeUndefined();
    expect(sanitizeRedirect('http://evil.example/a')).toBeUndefined();
  });

  it('协议相对 URL "//evil.example"', () => {
    expect(getSafeRedirect('?redirect=%2F%2Fevil.example')).toBeUndefined();
    expect(sanitizeRedirect('//evil.example')).toBeUndefined();
  });

  it('反斜杠（浏览器把 \\ 当 / 看）', () => {
    expect(getSafeRedirect('?redirect=%2F%5Cevil.example')).toBeUndefined();
    expect(sanitizeRedirect('/\\evil.example')).toBeUndefined();
    expect(sanitizeRedirect('/a\\b')).toBeUndefined();
  });

  it('伪协议 javascript:（大小写都拒，因为判的是「以 / 开头」）', () => {
    expect(getSafeRedirect('?redirect=javascript%3Aalert(1)')).toBeUndefined();
    expect(sanitizeRedirect('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeRedirect('JAVASCRIPT:alert(1)')).toBeUndefined();
    expect(sanitizeRedirect('data:text/html,<script>1</script>')).toBeUndefined();
  });

  it('控制字符：/%09//evil.example 解出来是 "/<TAB>//evil.example"，浏览器会把 TAB 删掉变成 "///evil.example"', () => {
    expect(getSafeRedirect('?redirect=%2F%09%2F%2Fevil.example')).toBeUndefined();
    expect(sanitizeRedirect('/\t//evil.example')).toBeUndefined();
    expect(sanitizeRedirect('/\n//evil.example')).toBeUndefined();
    expect(sanitizeRedirect('/\r//evil.example')).toBeUndefined();
  });

  it('前导空白：浏览器会把它去掉，所以不以 / 开头的一律拒', () => {
    expect(getSafeRedirect('?redirect=%20%2F%2Fevil.example')).toBeUndefined();
    expect(sanitizeRedirect(' //evil.example')).toBeUndefined();
  });

  it('双重编码（%252F%252F…）：只解一次码，解出来不以 / 开头 → 拒', () => {
    expect(getSafeRedirect('?redirect=%252F%252Fevil.example')).toBeUndefined();
  });

  it('".." 路径段', () => {
    expect(getSafeRedirect('?redirect=%2F..%2F%2Fevil.example')).toBeUndefined();
    expect(sanitizeRedirect('/..//evil.example')).toBeUndefined();
    expect(sanitizeRedirect('/a/../b')).toBeUndefined();
  });
});

describe('getSafeRedirect：不回跳到登录页自己（防套娃）', () => {
  it('/login?redirect=/x → undefined', () => {
    expect(getSafeRedirect('?redirect=%2Flogin%3Fredirect%3D%2Fx')).toBeUndefined();
    expect(sanitizeRedirect('/login?redirect=/x')).toBeUndefined();
    expect(sanitizeRedirect('/login')).toBeUndefined();
  });

  it('回调页也不回跳（/loginCallback… 被同一条前缀拒掉）', () => {
    expect(sanitizeRedirect('/loginCallback/cas')).toBeUndefined();
  });
});

describe('goAfterLogin', () => {
  it('有合法 redirect：跳它，fallback 一次都不跑', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '?redirect=%2Foauth-consent%3Freq%3Dabc');
    expect(loc.href).toBe('/oauth-consent?req=abc');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('redirect 不合法：只跑 fallback，一步都不跳', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '?redirect=https%3A%2F%2Fevil.example');
    expect(loc.href).toBe('');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('没有 redirect：只跑 fallback（羚牛原来的大屏判断照旧生效）', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '');
    expect(loc.href).toBe('');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('次选来源：地址栏没有，就用回调接口回的 res.dat.redirect（同样过白名单）', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '', '/oauth-consent?req=zzz');
    expect(loc.href).toBe('/oauth-consent?req=zzz');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('次选来源不合法也不跳（后端查过不等于这边免检）', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '', '//evil.example');
    expect(loc.href).toBe('');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('后端默认回的 "/" 不算回跳：走 fallback，SSO 回调的大屏判断不被挤掉', () => {
    // 羚牛 services/login.ts 的 getRedirectURL* 没把 redirect 发给后端（见 n33/拿不准-F.md U-F-02），
    // 所以 SSO 回调拿到的 res.dat.redirect 基本总是后端填的默认值 "/"（router_login.go:1205）。
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '', '/');
    expect(loc.href).toBe('');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('地址栏优先于接口回的值', () => {
    const loc = stubLocation();
    const fallback = jest.fn();
    goAfterLogin(fallback, '?redirect=%2Ffirst', '/second');
    expect(loc.href).toBe('/first');
    expect(fallback).not.toHaveBeenCalled();
  });
});
