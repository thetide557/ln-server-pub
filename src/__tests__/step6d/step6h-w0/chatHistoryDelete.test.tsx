/**
 * 阶段 II · W0 小修①：AI 浮窗历史列表的「删除会话」按钮。
 *
 * 背景：`src/components/AiChatNG/ChatHistory.tsx` 里那段 Popconfirm + 删除图标，
 * 上游 fe v9.1.0 自己就是注释掉的（不是羚牛注释的），后端 5b 点击测试因此判 C-06 FAIL
 * （`ln-server/第三步-流水线/阶段5b/点击测试/前端交接-2026-09-06.md` 第 1 节）。
 * 本轮把注释符去掉、补上 Button / Popconfirm / DeleteOutlined 三个 import，段内一个字符没改。
 *
 * 这份测试钉住两件事：
 *   1. 历史条目里确实渲染出了那个删除按钮（带 anticon-delete 图标）；
 *   2. 点按钮 → Popconfirm 弹出 → 点「确定」后调用了 services.deleteChat，且传的是该会话的 chat_id。
 *
 * 写法照 `../README.md` 第三节与 `../es/render.test.tsx`：services 整个 mock 掉，i18n 手工初始化。
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

// ChatHistory 里 import 的是 './services'，解析到同一个文件，用 @/ 别名 mock 等价。
const mockDeleteChat = jest.fn(() => Promise.resolve(undefined));
const mockGetChatHistory = jest.fn(() =>
  Promise.resolve([
    { chat_id: 'chat-aaa', title: '第一条会话', last_update: 1757000000 },
    { chat_id: 'chat-bbb', title: '第二条会话', last_update: 1757000100 },
  ]),
);
jest.mock('@/components/AiChatNG/services', () => ({
  __esModule: true,
  deleteChat: (...args: any[]) => mockDeleteChat.apply(null, args as []),
  getChatHistory: (...args: any[]) => mockGetChatHistory.apply(null, args as []),
}));

import '@/i18n';
import '@/components/AiChatNG/locale';
import ChatHistory from '@/components/AiChatNG/ChatHistory';

describe('step6h W0 小修① · ChatHistory 删除会话按钮', () => {
  beforeEach(() => {
    mockDeleteChat.mockClear();
    mockGetChatHistory.mockClear();
  });

  it('历史条目里渲染出删除按钮，确认后调用 deleteChat 并带上 chat_id', async () => {
    const onSelect = jest.fn();
    const { container } = render(<ChatHistory onSelect={onSelect} />);

    // 等异步的 getChatHistory 落地
    await waitFor(() => expect(screen.getByText('第一条会话')).toBeInTheDocument());

    // ① 有删除按钮：每条会话一个，图标是 antd 的 DeleteOutlined（class anticon-delete）
    const deleteIcons = container.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBe(2);
    const firstButton = deleteIcons[0].closest('button');
    expect(firstButton).not.toBeNull();

    // ② 点按钮 → Popconfirm 弹出（文案取 zh_CN 的 history.delete_confirm）
    fireEvent.click(firstButton as HTMLElement);
    await waitFor(() => expect(screen.getByText('删除该会话？')).toBeInTheDocument());

    // ③ 点 Popconfirm 的「确定」→ 调用 deleteChat('chat-bbb')
    //    注意列表按 last_update 倒序排，第一条是 chat-bbb。
    const okButton = document.querySelector('.ant-popover .ant-btn-primary');
    expect(okButton).not.toBeNull();
    fireEvent.click(okButton as HTMLElement);

    await waitFor(() => expect(mockDeleteChat).toHaveBeenCalledTimes(1));
    expect(mockDeleteChat).toHaveBeenCalledWith('chat-bbb');

    // ④ 删完本地列表把它去掉了
    await waitFor(() => expect(screen.queryByText('第二条会话')).not.toBeInTheDocument());
  });
});
