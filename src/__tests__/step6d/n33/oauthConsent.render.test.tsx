/**
 * N33 批 E · OAuth 同意页 `/oauth-consent` 的渲染与提交用例。
 *
 * 这页是什么：羚牛自带的那个「OAuth 授权服务器」（后端 `[HTTP.MCPAuth]`，发货默认关）走到
 * 征求用户同意这一步时，后端 `GET /oauth/authorize` 校验完 client_id / redirect_uri / PKCE，
 * 会 302 把浏览器跳到这个前端页，地址栏上挂一个签了名的票据 `?req=<JWT>`。页面把票据里的
 * 申请方、回调地址、申请权限摊开给用户看，用户点「允许」就把决定 POST 给
 * `POST /api/takin/mcp/oauth/authorize`（后端 ln-server center/router/router.go:1396，
 * 带 `rt.auth(), rt.user()`），后端签出授权码再把浏览器送回申请方的 redirect_uri。
 *
 * 钉的是什么（三件）：
 *   ① 地址栏上没有 `req` → 显示「授权请求无效或已过期」的错误态，不发任何请求；
 *   ② 有 `req` → 把票据 payload 里的 client_name / redirect_uri 的 host / scope 显示出来，
 *      并显示当前登录身份（Provider 给的 profile）。scope 是 `mcp` 时页面故意显示成 `mcp/a2a`
 *      （上游 index.tsx:78-79 的注释：后端不按 scope 细分鉴权，写 mcp/a2a 免得被误读成只授权 MCP）；
 *   ③ 点「允许」→ 只发一次请求，URL / method / body 和后端约定逐字对上，
 *      后端回 `{dat:{redirect:…}}` 时把浏览器送到那个地址。
 *
 * 票据只是**显示用**地解一下 base64，不验签（上游 index.tsx:42-43 的注释），所以用例里自造一个
 * `header.payload.sig` 三段式字符串就够，签名段随便填。
 *
 * 为什么 mock 这几样：
 *   - `@/App`：src/App.tsx 会 import './routers'，等于把整棵路由树拉进来；这页只要它导出的
 *     CommonStateContext（先例与理由同 helpers/appMock.tsx 文件头）。
 *   - `@/utils/request`：真的会发 fetch。换成 jest.fn 才能断言 URL / method / body。
 *   - `window.location`：jsdom 不实现跳转，直接给 `location.href` 赋值只会打一行
 *     "Not implemented: navigation"，断言不到。所以整个 location 对象换成一个普通对象，用完还原。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../helpers/appMock'));

// request 的默认导出被换掉。用一层 apply 转发，是为了让 jest.config.ts 的 clearMocks
// 在每个用例前清计数（直接把 jest.fn 放进工厂里会被 clearMocks 清掉实现）。
const mockRequest = jest.fn();
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: (...args: any[]) => mockRequest.apply(null, args as any),
}));

import '@/i18n';
import '@/pages/oauthConsent/locale';
import { CommonStateContext, defaultCommonState } from '@/App';
import { RequestMethod } from '@/store/common';
import OAuthConsent from '@/pages/oauthConsent';

// 词条取自 src/pages/oauthConsent/locale/zh_CN.ts（jest 默认语言是 zh_CN，
// 见 src/i18n.ts:23 `localStorage.getItem('language') || 'zh_CN'`）。
const TXT_INVALID_HEAD = '授权请求无效或已过期';
const BTN_ALLOW = '允许';
const BTN_DENY = '拒绝';

// antd 的 Button 会给「两个汉字」的文案中间塞一个空格（DOM 里是 `允 许`，antd 4 Button 的 insertSpace），
// 所以文案比对一律先把空白去掉（先例 n33/notificationAdminGate.render.test.tsx:84）。
const squash = { normalizer: (s: string) => s.replace(/\s+/g, '') };

// 票据的 payload。base64url = 标准 base64 把 + / 换成 - _ 再去掉末尾的 =。
const CLAIMS = {
  client_name: 'cli-x',
  redirect_uri: 'http://localhost:1234/cb',
  scope: 'mcp',
};
const REQ_TICKET = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(CLAIMS), 'utf8').toString('base64url'), 'not-a-real-signature'].join('.');

// 当前登录身份：故意把 nickname 留空，让页面落到 `profile.username` 这一支
// （上游 index.tsx:140 `profile?.nickname || profile?.username || '-'`）。
const USERNAME = 'oauth-tester';
const commonState = {
  ...defaultCommonState,
  profile: { ...defaultCommonState.profile, nickname: '', username: USERNAME },
};

function renderPage(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/oauth-consent${search}`]}>
      <CommonStateContext.Provider value={commonState}>
        <OAuthConsent />
      </CommonStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('N33-E：OAuth 同意页 /oauth-consent', () => {
  it('① 地址栏没有 req：显示「授权请求无效或已过期」，不发任何请求', async () => {
    const { findByText, queryByText } = renderPage('');
    expect(await findByText(TXT_INVALID_HEAD, { exact: false })).toBeTruthy();
    // 错误态下「允许」「拒绝」两个按钮都不该渲染出来
    expect(queryByText(BTN_ALLOW, squash)).toBeNull();
    expect(queryByText(BTN_DENY, squash)).toBeNull();
    expect(mockRequest).toHaveBeenCalledTimes(0);
  });

  it('② 有 req：显示申请方、回调地址的 host、申请权限 mcp/a2a 与当前登录身份', async () => {
    const { findByText, getByText } = renderPage(`?req=${REQ_TICKET}`);
    // 申请方（票据 client_name）
    expect(await findByText('cli-x')).toBeTruthy();
    // 回调地址只显示 host，不显示整条 URL（上游 hostOf()）
    expect(getByText('localhost:1234')).toBeTruthy();
    // scope=mcp 要显示成 mcp/a2a
    expect(getByText('mcp/a2a')).toBeTruthy();
    // 当前登录身份
    expect(getByText(USERNAME)).toBeTruthy();
    // 两个按钮都在
    expect(getByText(BTN_ALLOW, squash)).toBeTruthy();
    expect(getByText(BTN_DENY, squash)).toBeTruthy();
  });

  it('③ 点「允许」：发一次 POST /api/takin/mcp/oauth/authorize，body 是 {req, decision:"allow"}，然后跳回调地址', async () => {
    const REDIRECT = 'http://localhost:1234/cb?code=1';
    mockRequest.mockResolvedValue({ dat: { redirect: REDIRECT } });

    // jsdom 的 window.location 不能真跳；换成普通对象，用完还原。
    const rawLocation = window.location;
    const fakeLocation: any = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: fakeLocation });

    try {
      const { findByText } = renderPage(`?req=${REQ_TICKET}`);
      const allowBtn = await findByText(BTN_ALLOW, squash);
      fireEvent.click(allowBtn);

      await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
      expect(mockRequest.mock.calls[0][0]).toBe('/api/takin/mcp/oauth/authorize');
      expect(mockRequest.mock.calls[0][1]).toEqual({
        method: RequestMethod.Post,
        data: { req: REQ_TICKET, decision: 'allow' },
      });
      // RequestMethod.Post 的字面值（src/store/common.ts:63-68）
      expect(mockRequest.mock.calls[0][1].method).toBe('Post');

      await waitFor(() => expect(fakeLocation.href).toBe(REDIRECT));
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, writable: true, value: rawLocation });
    }
  });
});
