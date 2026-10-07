/**
 * N28（2026-10-07）改写：这份用例原本钉的是「历史条目里有一个删除按钮，点了弹 Popconfirm，
 * 确认后调 services.deleteChat」。
 *
 * 原由：阶段 II · W0 小修① 把 `src/components/AiChatNG/ChatHistory.tsx` 里那段被上游 fe v9.1.0
 * 自己注释掉的 Popconfirm + 删除图标放了出来（后端 5b 点击测试因此判 C-06 FAIL，见
 * `ln-server/第三步-流水线/阶段5b/点击测试/前端交接-2026-09-06.md` 第 1 节）。
 *
 * 为什么改：N26（B）把 `AiChatNG` 整块升到夜莺 fe `ee48e701`，`ChatHistory.tsx` 按统一尺子
 * 2.3 表 #9「收上游」整文件换成上游版本。**上游的会话操作入口改成了「更多」下拉菜单，而那个菜单
 * 里只有「重命名」和「分享会话」两项——删除入口上游是整个去掉了，不是挪进了菜单**：
 *   - 菜单项就两条：`ChatHistory.tsx:246-249`（`{ key: 'rename' … }`、`{ key: 'share' … }`）；
 *   - `handleDelete` 还在（`:92-103`，里面确实调 `deleteChat(chat.chat_id)`），但**全文件只有定义处
 *     这一次出现**（`grep -n 'handleDelete' src/components/AiChatNG/ChatHistory.tsx` 只有 `:92`），
 *     也就是说它在上游就是一段够不到的死代码；`onDelete` 这个 prop 同理（`index.tsx:109` 传了
 *     `handleDeleteChat`，但 `ChatHistory` 永远不会触发它）。
 *   - 上游 fe `ee48e701` 的同文件也是这个样子（`git -C …/fe show HEAD:src/components/AiChatNG/ChatHistory.tsx`
 *     里 `handleDelete` 同样只出现在定义处，菜单同样只有 rename / share），所以这是上游的现状、
 *     不是我们搬漏了。
 * 按用户 M290「改测试跟上上游、不改组件」，这里**改测试、不改组件**。locale 的
 * `history.delete_confirm`（「删除该会话？」）键还留着（`locale/zh_CN.ts:19`），只是组件不再用它。
 *
 * 改完这份用例钉四件事（都是上游 `ee48e701` 的实际行为）：
 *   1. 历史列表照旧渲染、照旧按 `last_update` 倒序；
 *   2. `compact` + `showActions` 下每条会话有一个「更多会话操作」按钮（`ChatHistory.tsx:241-274`，
 *      注意这个入口只在这两个 prop 同时为真时才画，默认都是 false）；
 *   3. 点开菜单只有「重命名」「分享会话」两项，**没有**删除项，整棵树里也没有旧的
 *      `.anticon-delete` 图标与「删除该会话？」确认文案；
 *   4. 整个交互走完 `deleteChat` 一次都没被调用——将来谁把删除入口加回来（或上游加回来我们跟上），
 *      第 3、4 条会先红，提醒回来更新这份用例。
 *
 * 上游没有 `ChatHistory.test.tsx` 可照抄
 * （`git -C …/fe ls-tree -r --name-only HEAD src/components/AiChatNG | grep -i test` 的 8 个文件里没有它），
 * 所以断言是按组件现有代码逐行核出来写的，不是照搬。
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
const mockRenameChat = jest.fn(() => Promise.resolve(undefined));
const mockGetChatHistory = jest.fn(() =>
  Promise.resolve([
    { chat_id: 'chat-aaa', title: '第一条会话', last_update: 1757000000 },
    { chat_id: 'chat-bbb', title: '第二条会话', last_update: 1757000100 },
  ]),
);
jest.mock('@/components/AiChatNG/services', () => ({
  __esModule: true,
  deleteChat: (...args: any[]) => mockDeleteChat.apply(null, args as []),
  renameChat: (...args: any[]) => mockRenameChat.apply(null, args as []),
  getChatHistory: (...args: any[]) => mockGetChatHistory.apply(null, args as []),
}));

import '@/i18n';
import '@/components/AiChatNG/locale';
import ChatHistory from '@/components/AiChatNG/ChatHistory';

describe('N28 · ChatHistory 跟上上游 ee48e701：会话操作改「更多」下拉，删除入口上游已去掉', () => {
  beforeEach(() => {
    mockDeleteChat.mockClear();
    mockRenameChat.mockClear();
    mockGetChatHistory.mockClear();
  });

  it('compact + showActions 下每条会话有「更多会话操作」按钮，菜单只有重命名 / 分享，没有删除', async () => {
    const onSelect = jest.fn();
    const { container } = render(<ChatHistory compact showActions onSelect={onSelect} />);

    // ① 等异步的 getChatHistory 落地
    await waitFor(() => expect(screen.getByText('第一条会话')).toBeInTheDocument());
    expect(screen.getByText('第二条会话')).toBeInTheDocument();

    // ② 旧的删除入口彻底没了：没有 anticon-delete 图标、没有确认文案
    expect(container.querySelectorAll('.anticon-delete').length).toBe(0);
    expect(screen.queryByText('删除该会话？')).not.toBeInTheDocument();

    // ③ 每条会话一个「更多会话操作」按钮（aria-label 取 zh_CN 的 history.more_actions）
    const moreButtons = container.querySelectorAll('button[aria-label="更多会话操作"]');
    expect(moreButtons.length).toBe(2);

    // ④ 点开第一条的菜单（列表按 last_update 倒序，第一条是 chat-bbb「第二条会话」）
    fireEvent.click(moreButtons[0]);
    await waitFor(() => expect(screen.getByText('重命名')).toBeInTheDocument());
    expect(screen.getByText('分享会话')).toBeInTheDocument();

    // ⑤ 菜单项就两条，里头没有任何「删除」
    // 注意 class 前缀：Dropdown 的 overlay 里 antd 4.21 渲染出来的是 .ant-dropdown-menu-item
    // （不是独立 Menu 的 .ant-menu-item），探查过真实 DOM 链才敢这么写。
    const menuItems = Array.from(document.querySelectorAll('.ant-dropdown .ant-dropdown-menu-item'));
    expect(menuItems.length).toBe(2);
    const menuTexts = menuItems.map((item) => (item.textContent || '').replace(/\s/g, ''));
    expect(menuTexts).toEqual(['重命名', '分享会话']);
    expect(menuTexts.some((text) => text.includes('删除'))).toBe(false);

    // ⑥ 整个交互走完没碰过 deleteChat（上游 handleDelete 是够不到的死代码）
    expect(mockDeleteChat).not.toHaveBeenCalled();
  });

  it('不传 compact / showActions 时连「更多」入口都不画，只显示时间（上游默认形态）', async () => {
    const onSelect = jest.fn();
    const { container } = render(<ChatHistory onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText('第一条会话')).toBeInTheDocument());

    // 两个 prop 默认都是 false（ChatHistory.tsx:64），走的是 :275-279 的「只显示时间」分支
    expect(container.querySelectorAll('button[aria-label="更多会话操作"]').length).toBe(0);
    expect(container.querySelectorAll('.anticon-delete').length).toBe(0);
    expect(mockDeleteChat).not.toHaveBeenCalled();
  });
});
