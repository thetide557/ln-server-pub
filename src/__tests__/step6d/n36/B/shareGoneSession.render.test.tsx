/**
 * N36 批 B（B-7 / C-6 / C-7，lead D-N36-8）· 只读分享页打开「已经被删掉的会话」时要给出明确文案。
 *
 * 钉的是什么：后端对「打开已删会话」回的是 **HTTP 200 + `{"err":"chat not found"}`**（不是 404），
 * 跨用户打开回 `{"err":"forbidden"}`——这点后端第八份交接第五节 3 说明过，前端按 `err` 文本判是对的。
 * 但羚牛的请求封装 `src/utils/request.ts` 对「200 + err 非空」抛出来的是一个**普通对象字面量**
 * （`{ name, message, silence, data, response }`），**不是 `Error` 实例**。
 * 而 `ChatPanel.tsx` 原来的 `isSessionGoneError` 只在 `error instanceof Error` 时读 `.message`，
 * 否则 `String(error)` 得到的是 `'[object Object]'`；加载历史那段又先把 error 包成
 * `new Error('load messages failed')` 再拿去判，`chat not found` 这几个字就彻底丢了
 * → `shareForbidden` 置不上 → 分享页只显示空白，不显示「这个分享会话只对分享者本人可见…」。
 * 查证与链路推演原文见 `第六步-流水线/n36/查证-两件.md` D-1 节（第 15、24、30-42 行）。
 *
 * 改了两处：`isSessionGoneError` 多一档「是普通对象且带 message 字段就读它的 message」；
 * 三处调用从 `isSessionGoneError(nextError)` 改成 `isSessionGoneError(error)`（拿原始对象判）。
 *
 * 没有官方修法可照抄：上游 `ee48e701` 的 ChatPanel 走的是 `reportPageError(normalizeError(...))`
 * 加路由里的 PageErrorGate 那一套，整个 `isSessionGoneError` 是羚牛自写的（`查证-两件.md:21` 查实）。
 *
 * 两条用例都要绿——这是本批的要求：
 *   1. 接口 reject 一个**普通对象** `{ message: 'chat not found' }`（= 真实链路，改之前这条会失败）；
 *   2. 接口 reject 一个**真 Error** `new Error('chat not found')`（改之前就能过，防止改坏原来那条路）。
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/App', () => require('../../helpers/appMock'));

// 本用例只管「历史拉不回来时显示什么」，所有接口都 mock 掉；getMessageHistory 由每条用例各自设定 reject 什么。
const mockGetMessageHistory = jest.fn();
jest.mock('@/components/AiChatNG/services', () => ({
  __esModule: true,
  getMessageHistory: (...args: any[]) => mockGetMessageHistory.apply(null, args as any),
  getMessageDetail: jest.fn(() => Promise.resolve(undefined)),
  createChat: jest.fn(() => Promise.resolve({ chat_id: 'new-chat' })),
  sendMessage: jest.fn(() => Promise.resolve(undefined)),
  cancelMessage: jest.fn(() => Promise.resolve(undefined)),
}));

// 分享只读态平时由 AiChatProvider 的 setShareReadonly 置上（share.ts 解析 URL 之后）。
// 这里不搭整个 Provider，直接把 useAiChatContext 换成固定值，省掉 URL 那一层。
jest.mock('@/components/AiChatNG/context', () => {
  // 同样要返回稳定对象：ChatPanel `:76` 解构出来的 setCachedSessionId 进了好几个 useCallback 的依赖。
  const setCachedSessionId = jest.fn();
  const stable = { shareReadonly: true, setCachedSessionId };
  return {
    __esModule: true,
    useAiChatContext: () => stable,
    AI_CHAT_CACHED_SESSION_KEY: 'ai-chat-last-session-id',
  };
});

// MessageBlocks.tsx 会拉进 ContentRenderer → PromQLInput → TimeRangePicker → `rc-picker/es/generate/moment`，
// 而 rc-picker 的 es 目录只发 ESM、jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 会报 `Cannot use import statement outside a module`。ChatPanel 只用它两个导出（`:12`），换成最小替身。
jest.mock('@/components/AiChatNG/MessageBlocks', () => ({
  __esModule: true,
  EmptyConversation: () => require('react').createElement('div', { className: 'empty-conversation-stub' }),
  MessageItem: () => require('react').createElement('div', { className: 'message-item-stub' }),
}));

// uiActionRuntime.ts 从 `@flashcatcloud/ai-kit/actions` 取运行时。那个包的 package.json 只给了
// `exports["./actions"].import`（纯 ESM 条件），jest-resolve 走的是 require 条件、解析不到，
// 报 `Cannot find module '@flashcatcloud/ai-kit/actions'`。ChatPanel 只用它的 execute / manifest
// 两个方法（`:156`、`:577`），本用例也不触发页面动作，换成空壳。
jest.mock('@/components/AiChatNG/uiActionRuntime', () => ({
  __esModule: true,
  uiActionRuntime: {
    execute: jest.fn(() => Promise.resolve(undefined)),
    manifest: jest.fn(() => []),
  },
}));

// 流式回复用的是 EventSource / fetch 流，jest 里不接；本用例不发消息，给个空壳。
// 要害：`start` / `stop` 必须是**每次渲染都同一个**函数。ChatPanel `:297` 把它们解构出来当
// useCallback / useEffect 的依赖，如果 mock 每次渲染都新建一份 jest.fn()，依赖项每帧都变，
// 组件会无限重渲染、jest 直接挂死（实测跑满 300 秒没出结果）。所以在工厂外面先建好再返回同一个对象。
jest.mock('@/components/AiChatNG/useStream', () => {
  const start = jest.fn();
  const stop = jest.fn();
  const stable = { start, stop, streaming: false };
  return {
    __esModule: true,
    useAiChatStream: () => stable,
  };
});

import '@/i18n';
import '@/components/AiChatNG/locale';
import ChatPanel from '@/components/AiChatNG/ChatPanel';

// 词条取自 src/components/AiChatNG/locale/zh_CN.ts:66 的 input.share_forbidden_notice。
const SHARE_FORBIDDEN_NOTICE = '这个分享会话只对分享者本人可见，当前账号没有查看权限';

function renderSharePanel() {
  return render(<ChatPanel chatId='chat-gone' />);
}

describe('N36-B (B-7)：分享页打开已删会话时显示明确文案', () => {
  beforeEach(() => {
    mockGetMessageHistory.mockReset();
  });

  it('请求封装抛的是**普通对象** { message: "chat not found" }：文案出现（改之前这条会失败）', async () => {
    // 形状照 src/utils/request.ts 对「200 + err 非空」抛出来的那个对象字面量
    mockGetMessageHistory.mockRejectedValue({
      name: 'chat not found',
      message: 'chat not found',
      silence: true,
      data: { err: 'chat not found' },
      response: {},
    });
    renderSharePanel();
    await waitFor(() => expect(screen.getByText(SHARE_FORBIDDEN_NOTICE)).toBeTruthy());
  });

  it('抛的是**真 Error**（"chat not found"）：文案同样出现（原来那条路没改坏）', async () => {
    mockGetMessageHistory.mockRejectedValue(new Error('chat not found'));
    renderSharePanel();
    await waitFor(() => expect(screen.getByText(SHARE_FORBIDDEN_NOTICE)).toBeTruthy());
  });

  it('抛的是普通对象 { message: "forbidden" }（跨用户打开别人的分享链接）：文案同样出现', async () => {
    mockGetMessageHistory.mockRejectedValue({ name: 'forbidden', message: 'forbidden', silence: true });
    renderSharePanel();
    await waitFor(() => expect(screen.getByText(SHARE_FORBIDDEN_NOTICE)).toBeTruthy());
  });

  it('抛的是跟会话无关的错（"timeout"）：不显示这条文案（别把所有失败都说成会话失效）', async () => {
    mockGetMessageHistory.mockRejectedValue({ name: 'timeout', message: 'timeout', silence: true });
    renderSharePanel();
    // 等一拍让 catch 跑完，再断言文案不在
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByText(SHARE_FORBIDDEN_NOTICE)).toBeNull();
  });
});
