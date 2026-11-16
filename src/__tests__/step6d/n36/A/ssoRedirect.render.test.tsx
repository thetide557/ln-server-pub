/**
 * N36 批 A（A-2 / A-2b / A-3）· 登录页点「CAS / OIDC / OAuth2 登录」时的三件事。
 *
 * 一、判据从 dat 的 `valid` 字段换成 `res.dat?.redirect`（A-2，后端第八份交接第二节 2）
 * -------------------------------------------------------------------------------
 * `valid` 是公司私有改造加的字段，上游后端没有。u-sec 把它定成「**用户传上来的回跳地址**
 * 是不是安全的站内路径」（ln-server `center/router/router_login.go:36-50` 的 `isSafeInternalRedirect`），
 * **不是**「SSO 配置能不能用」。原来前端当成后者判，于是一旦我们开始往后端发 `redirect`
 * （就是下面第二件事），一个不安全的回跳值会被误读成「CAS 配置失败」，明明能跳的也不跳了。
 * 本文件第一组用例正是钉这个：后端回 `{redirect: '…', valid: false}` 时**要跳**。
 *
 * 二、把 `redirect` 发给后端，而且只发过白名单的值（A-2b，lead 拍板 D-N36-2）
 * --------------------------------------------------------------------
 * 值取 `src/pages/login/redirect.ts:86` 的 `getSafeRedirect(location.search)`——只放行站内相对路径。
 * 为什么不能把地址栏原值直接发出去：后端「用户已经登录」那条分支会把收到的 `redirect`
 * **原样回传**（`router_login.go:1241-1248`），前端判到有地址就跳；不过滤的话，谁构造一条
 * `/login?redirect=https://evil.example` 都能把已登录用户送去外站（开放重定向）。
 * 第二组用例钉的就是「外站值到不了服务函数」。
 *
 * 三、CAS 的 `state` 非空才存（A-3，lead 拍板 D-N36-1）
 * ------------------------------------------------
 * `state` 是 CAS 流程防跨站请求伪造（CSRF）的一次性串，后端只在「CAS 已启用且用户未登录」
 * 那条分支才回（`router_login.go:1274-1275` 的注释写明「前端按 dat.state 非空才存」）。
 * 不加守卫的话，另外两条分支会把字符串 `"undefined"` 写进 localStorage，留给下一次真回调去核对。
 *
 * 为什么这里选「把整个登录页渲染出来点一下」而不是只测纯函数：要证的三件事全在
 * `loginSso.tsx` 的 `handleOtherLogin` 里（判据、传什么参数、存不存 state），
 * 这个函数没有被导出，只能从按钮进去。代价是得把十来个 service 与 `plus:/` 的 `useSsoWay`
 * 一起 mock 掉——下面逐个写了为什么。
 * （N33 批 F 的 `n33/loginRedirect.test.ts` 选的是另一条路：那次要证的判断全在纯函数
 * `sanitizeRedirect` 里，就没渲染页面。两边不矛盾，是「要证的东西在哪一层」不同。）
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { message } from 'antd';

// ---- mock 们 ----------------------------------------------------------------

// `plus:/parcels/SSOConfigs/useSsoWay` 已经由 jest.config.ts:31 的 moduleNameMapper 指到
// plugins/PlusPlaceholder.tsx（默认导出返回 null），这里不用再管。

// 三个「取 SSO 跳出地址」的函数是本文件的主角：每条用例自己设返回值、自己断言收到的参数。
// 其余的只是让页面挂得起来：
//   - getSsoConfig / ifShowCaptcha：挂载时的两个 useEffect 会调（`loginSso.tsx:160,171` 一带）；
//   - getCaptcha：ifShowCaptcha 回 show=false 时走不到，给个空实现兜底；
//   - 其余（authLogin / authLoginLdap / getRSAConfig / getDeepseektoken / getSystemTheme）
//     只在点「登录」提交时才会跑，本文件不点，给空实现防 import 报错。
const mockGetRedirectURL = jest.fn();
const mockGetRedirectURLCAS = jest.fn();
const mockGetRedirectURLOAuth = jest.fn();
jest.mock('@/services/login', () => ({
  __esModule: true,
  getRedirectURL: (...args: any[]) => mockGetRedirectURL.apply(null, args as any),
  getRedirectURLCAS: (...args: any[]) => mockGetRedirectURLCAS.apply(null, args as any),
  getRedirectURLOAuth: (...args: any[]) => mockGetRedirectURLOAuth.apply(null, args as any),
  getSsoConfig: jest.fn(() => Promise.resolve({ dat: { oidcDisplayName: 'OIDC', casDisplayName: 'CAS', oauthDisplayName: 'OAuth' } })),
  ifShowCaptcha: jest.fn(() => Promise.resolve({ dat: { show: false } })),
  getCaptcha: jest.fn(() => Promise.resolve({ dat: null })),
  getSystemTheme: jest.fn(() => Promise.resolve({ dat: null })),
  authLogin: jest.fn(() => Promise.resolve({})),
  authLoginLdap: jest.fn(() => Promise.resolve({})),
  getRSAConfig: jest.fn(() => Promise.resolve({ dat: {} })),
  getDeepseektoken: jest.fn(() => Promise.resolve({})),
  UpdateAccessToken: jest.fn(() => Promise.resolve({})),
}));

// 这两个只在账号密码登录成功之后才调（查大屏、查业务组），本文件不走那条路，mock 掉省得拉 request 链路。
jest.mock('@/services/sxxc/bigScreen', () => ({
  __esModule: true,
  getBigScreen: jest.fn(() => Promise.resolve({ dat: [] })),
  getBigScreen2: jest.fn(() => Promise.resolve({ dat: [] })),
}));
jest.mock('@/services/common', () => ({
  __esModule: true,
  getBusiGroups: jest.fn(() => Promise.resolve({ dat: [] })),
}));

// 挂载时会拿 localStorage 里记住的密码解一次（`loginSso.tsx:125,146`）。真的 aes 要读配置，换成直通。
jest.mock('@/utils/aes', () => ({
  __esModule: true,
  aesEncrypt: (v: string) => v,
  aesDecrypt: (v: string) => v,
}));

// 组件里 `useTranslation()` 要一个已经初始化好的 i18next 实例，不然每次渲染都打一条
// 「You will need to pass in an i18next instance」的警告。本文件要找的按钮文案是写死的中文，
// 跟词条无关，import 它纯粹是为了把这条噪音去掉。
import '@/i18n';
import LoginSso from '@/pages/login/loginSso';

// ---- window.location 的桩 ----------------------------------------------------

/**
 * 组件跳转用的是 `window.location.href = …`。jsdom 不实现真正的导航：直接赋值只会在控制台
 * 留一条 "Not implemented: navigation"，`href` 的值并不会变，断言就无从下手。所以换一个
 * 只有 `href` 的桩对象。换桩只影响当前这个测试文件（jest 每个文件一个独立的 jsdom 环境）。
 * 做法与 `n33/loginRedirect.test.ts:30-40` 一致。
 *
 * 注意：页面读「地址栏里的 `?redirect=`」走的是 react-router 的 `useLocation()`，
 * 不是 `window.location`——所以下面用 `MemoryRouter` 的 `initialEntries` 来摆 query 串，
 * 跟这个桩互不干扰。
 */
const realLocation = window.location;
let loc: { href: string };
beforeEach(() => {
  loc = { href: '', search: '', pathname: '/' } as any;
  delete (window as any).location;
  (window as any).location = loc;
  localStorage.clear();
});
afterEach(() => {
  delete (window as any).location;
  (window as any).location = realLocation;
});

/**
 * 把登录页渲染出来。`entry` 是地址栏，带 query 串时写成 `/login?redirect=…`。
 * 页面默认停在「账号登录」那一栏（`toggle` 初值 true，`loginSso.tsx:71`）。
 */
function renderLogin(entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LoginSso />
    </MemoryRouter>,
  );
}

// 按钮文案是写死在组件里的（`loginSso.tsx:73-89` 的 otherLogin 列表），不走 i18n。
const BTN = { CAS: 'CAS登录', OIDC: 'OIDC登录', OAuth2: 'OAuth2登录' } as const;

/**
 * 点一下某个 SSO 入口。
 *
 * 「其他登录方式」那一排在 `toggle === false` 那一支里（`loginSso.tsx:480` 起的三元 else 分支），
 * 也就是顶上「单点登录」这一栏，所以要先点一下它把栏切过去，按钮才在 DOM 里。
 */
async function clickSso(utils: ReturnType<typeof renderLogin>, name: keyof typeof BTN) {
  fireEvent.click(await utils.findByText('单点登录'));
  const btn = await utils.findByText(BTN[name]);
  fireEvent.click(btn);
}

// ---- 一、判据：有地址就跳，没地址才弹错误 -------------------------------------

describe('N36-A (A-2)：判据看 res.dat.redirect，不看 valid', () => {
  const cases: Array<[keyof typeof BTN, jest.Mock, string]> = [
    ['CAS', mockGetRedirectURLCAS, 'https://sso.example/cas/login'],
    ['OIDC', mockGetRedirectURL, 'https://sso.example/oidc/auth'],
    ['OAuth2', mockGetRedirectURLOAuth, 'https://sso.example/oauth/authorize'],
  ];

  it.each(cases)('%s：后端回 {redirect: 有值, valid: false} —— 仍然跳（改之前这条会失败）', async (name, mockFn, url) => {
    // valid=false 的真实含义是「用户传的回跳地址不安全」，跟 SSO 配置能不能用没关系。
    // 改之前这里判的是 valid，于是会弹「获取…登录地址失败」而不跳。
    mockFn.mockResolvedValue({ dat: { redirect: url, valid: false } });
    const utils = renderLogin();
    await clickSso(utils, name);
    await waitFor(() => expect(loc.href).toBe(url));
  });

  it.each(cases)('%s：后端回 {redirect: 有值, valid: true} —— 跳', async (name, mockFn, url) => {
    mockFn.mockResolvedValue({ dat: { redirect: url, valid: true } });
    const utils = renderLogin();
    await clickSso(utils, name);
    await waitFor(() => expect(loc.href).toBe(url));
  });

  it.each(cases)('%s：后端回 {redirect: "", valid: true} —— 不跳，弹错误文案（SSO 没启用就是这一条）', async (name, mockFn) => {
    // 对应后端 `router_login.go:1253-1264`：CAS 未启用时回 {redirect: "", valid: false}；
    // 这里把 valid 故意写成 true，证明前端真的只看 redirect。
    const spy = jest.spyOn(message, 'error').mockImplementation((() => ({} as any)) as any);
    mockFn.mockResolvedValue({ dat: { redirect: '', valid: true } });
    const utils = renderLogin();
    await clickSso(utils, name);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(loc.href).toBe('');
    // 文案一个字没动（`loginSso.tsx` 三处 message.error）
    expect(spy.mock.calls[0][0]).toBe(`获取${name}登录地址失败，请检查${name}登录配置`);
    spy.mockRestore();
  });

  it.each(cases)('%s：接口整个失败（reject）—— 不跳，弹同一条错误文案', async (name, mockFn) => {
    const spy = jest.spyOn(message, 'error').mockImplementation((() => ({} as any)) as any);
    mockFn.mockRejectedValue(new Error('boom'));
    const utils = renderLogin();
    await clickSso(utils, name);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(loc.href).toBe('');
    spy.mockRestore();
  });
});

// ---- 二、带 redirect：只带过了白名单的值 ---------------------------------------

describe('N36-A (A-2b)：发给后端的 redirect 必须先过白名单', () => {
  const cases: Array<[keyof typeof BTN, jest.Mock]> = [
    ['CAS', mockGetRedirectURLCAS],
    ['OIDC', mockGetRedirectURL],
    ['OAuth2', mockGetRedirectURLOAuth],
  ];

  it.each(cases)('%s：地址栏 ?redirect=%%2Fdashboard%%2F1 —— 服务函数收到解过码的站内路径', async (name, mockFn) => {
    mockFn.mockResolvedValue({ dat: { redirect: 'https://sso.example/x' } });
    const utils = renderLogin('/login?redirect=%2Fdashboard%2F1');
    await clickSso(utils, name);
    await waitFor(() => expect(mockFn).toHaveBeenCalled());
    expect(mockFn).toHaveBeenCalledWith('/dashboard/1');
  });

  it.each(cases)('%s：地址栏 ?redirect=https%%3A%%2F%%2Fevil.example（外站）—— 服务函数收到 undefined，外站值到不了后端', async (name, mockFn) => {
    mockFn.mockResolvedValue({ dat: { redirect: 'https://sso.example/x' } });
    const utils = renderLogin('/login?redirect=https%3A%2F%2Fevil.example');
    await clickSso(utils, name);
    await waitFor(() => expect(mockFn).toHaveBeenCalled());
    expect(mockFn).toHaveBeenCalledWith(undefined);
  });

  it.each(cases)('%s：地址栏没有 redirect —— 服务函数收到 undefined（后端用它自己的默认 /）', async (name, mockFn) => {
    mockFn.mockResolvedValue({ dat: { redirect: 'https://sso.example/x' } });
    const utils = renderLogin('/login');
    await clickSso(utils, name);
    await waitFor(() => expect(mockFn).toHaveBeenCalled());
    expect(mockFn).toHaveBeenCalledWith(undefined);
  });

  it.each(cases)('%s：地址栏 ?redirect=%%2F%%2Fevil.example（协议相对 URL）—— 同样拦住', async (name, mockFn) => {
    mockFn.mockResolvedValue({ dat: { redirect: 'https://sso.example/x' } });
    const utils = renderLogin('/login?redirect=%2F%2Fevil.example');
    await clickSso(utils, name);
    await waitFor(() => expect(mockFn).toHaveBeenCalled());
    expect(mockFn).toHaveBeenCalledWith(undefined);
  });

  it('OAuth 同意页那种带票据的深链接能原样带过去（票据丢了用户要回客户端重来）', async () => {
    mockGetRedirectURLCAS.mockResolvedValue({ dat: { redirect: 'https://sso.example/cas' } });
    const utils = renderLogin('/login?redirect=%2Foauth-consent%3Freq%3Dabc');
    await clickSso(utils, 'CAS');
    await waitFor(() => expect(mockGetRedirectURLCAS).toHaveBeenCalled());
    expect(mockGetRedirectURLCAS).toHaveBeenCalledWith('/oauth-consent?req=abc');
  });
});

// ---- 三、CAS 的 state：非空才存 ------------------------------------------------

describe('N36-A (A-3)：CAS 的 state 非空才写 localStorage', () => {
  it('后端带 state：存进 CAS_state，然后才跳', async () => {
    mockGetRedirectURLCAS.mockResolvedValue({ dat: { redirect: 'https://sso.example/cas', state: 'abc', valid: true } });
    const utils = renderLogin();
    await clickSso(utils, 'CAS');
    await waitFor(() => expect(loc.href).toBe('https://sso.example/cas'));
    expect(localStorage.getItem('CAS_state')).toBe('abc');
  });

  it('后端不带 state（已登录 / CAS 未启用两条分支）：localStorage 里不出现 CAS_state，更不会写进字符串 "undefined"', async () => {
    // 这一条钉的是守卫：没有 `if (res.dat?.state)` 的话，`setItem` 会把 undefined 转成 "undefined"。
    mockGetRedirectURLCAS.mockResolvedValue({ dat: { redirect: '/already-logged-in', valid: true } });
    const utils = renderLogin();
    await clickSso(utils, 'CAS');
    await waitFor(() => expect(loc.href).toBe('/already-logged-in'));
    expect(localStorage.getItem('CAS_state')).toBeNull();
  });

  it('后端不带 state 时，原来存着的旧值不被覆盖成 "undefined"', async () => {
    localStorage.setItem('CAS_state', '旧值');
    mockGetRedirectURLCAS.mockResolvedValue({ dat: { redirect: '/already-logged-in', valid: true } });
    const utils = renderLogin();
    await clickSso(utils, 'CAS');
    await waitFor(() => expect(loc.href).toBe('/already-logged-in'));
    expect(localStorage.getItem('CAS_state')).toBe('旧值');
  });

  it('OIDC / OAuth2 不碰 CAS_state', async () => {
    mockGetRedirectURL.mockResolvedValue({ dat: { redirect: 'https://sso.example/oidc', state: 'xyz' } });
    const utils = renderLogin();
    await clickSso(utils, 'OIDC');
    await waitFor(() => expect(loc.href).toBe('https://sso.example/oidc'));
    expect(localStorage.getItem('CAS_state')).toBeNull();
  });
});
