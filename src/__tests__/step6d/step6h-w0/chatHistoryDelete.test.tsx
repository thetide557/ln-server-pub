/**
 * N33 批 C（2026-10-07）改写：这份用例现在钉的是「AI 浮窗会话列表的「更多」菜单里有「删除」，
 * 点了先弹确认框（正文说清分享链接会失效），确认后才调 services.deleteChat」。
 *
 * 这份文件的三段身世（为什么断言被翻来覆去改过）：
 *   1. 阶段 II · W0 小修① 时，`src/components/AiChatNG/ChatHistory.tsx` 里有一段被上游 fe v9.1.0
 *      自己注释掉的 `Popconfirm` + 删除图标，W0 把它放了出来（后端 5b 点击测试因此判 C-06 FAIL，见
 *      `ln-server/第三步-流水线/阶段5b/点击测试/前端交接-2026-09-06.md` 第 1 节）。那时这份用例断言
 *      「每条历史里有一个 `.anticon-delete` 按钮，点了弹 Popconfirm，确认后调 deleteChat」。
 *   2. N26（B）把 `AiChatNG` 整块升到夜莺 fe `ee48e701`，`ChatHistory.tsx` 按统一尺子 2.3 表 #9
 *      「收上游」整文件换成上游版本，而上游**把删除入口整个去掉了**（不是挪进菜单）。N28 据此把这份
 *      用例反过来写成「菜单恰好两项、不含删除、deleteChat 一次不被调」，当作钉住上游现状的回归用例，
 *      并在 `n26/N28-小批-进度.md`「用例二」里写明「将来谁把删除入口加回来，这份用例会先红，提醒
 *      回来更新」。提交 `14112fcd`。
 *   3. 本批（N33-C）就是那个「加回来」。查清的事实（判定门 `主session拍板记录.md` M299 / M300 / M302）：
 *      上游 04-20 `74e81635` 重做历史列表时把 `Popconfirm` 删除入口**注释掉**（基线 v9.1.0 里就是注释态，
 *      所以羚牛阶段 II 搬来的也是注释态）；08-13 `78d1de35` 重写聚合页时把注释块清掉、换成只有重命名的
 *      菜单，之后再加分享。三个提交说明都没写原因、没有关联 PR、fe 与 nightingale 两个仓库 issue 搜索
 *      零结果、fe 文档零命中，也没有 `plus:` / `IS_ENT` 门控；而 `handleDelete` / `deleteChat` / `onDelete`
 *      前端全都在，后端真删接口也在（`ln-server` 的 `center/router/router.go:1402` 与 `:1534` 两条
 *      `DELETE /assistant/chat/:chatId`）。判为「重构时搁置的半成品，不是商业版独有」，用户拍板加回来，
 *      并要求加一句确认提示说明「删除后该会话的分享链接将失效」（分享 URL 按 chat_id 构造、后端按
 *      chat_id 真删，所以这个因果成立）。**这是羚牛自加，上游至今没有这个菜单项。**
 *
 * 本批改的是组件 + locale + 这份用例；分享逻辑（`handleShare`、`share.ts`）一行没碰。
 *
 * 现在钉五件事：
 *   1. `compact` + `showActions` 下每条会话有一个「更多会话操作」按钮（入口只在这两个 prop 同时为真时
 *      才画，默认都是 `false`，见 `ChatHistory.tsx:64` 与 `:239`）；
 *   2. 点开菜单恰好三项，文案依次是「重命名」「分享会话」「删除」，删除项带 antd 的 danger 样式；
 *   3. 点「删除」先弹确认框，标题是 `history.delete_confirm`（「删除该会话？」）、正文是
 *      `history.delete_share_notice`（「删除后该会话的分享链接将失效」），确认按钮是 danger 型；
 *   4. 点确认后 `deleteChat` 被调一次、参数是 `'chat-bbb'`（列表按 `last_update` 倒序，第一条是它），
 *      而且该条从列表里消失、另一条还在（`handleDelete` 自己 `setHistory(filter)`，见 `:92-103`）；
 *   5. 点取消一次都不调 `deleteChat`。
 *
 * 上游没有 `ChatHistory.test.tsx` 可照抄
 * （`git -C …/fe ls-tree -r --name-only ee48e701 src/components/AiChatNG | grep -i test` 的 8 个文件里没有它），
 * 所以断言是按组件代码逐行核出来、再用一个临时探查用例打印真实 DOM 定下来的，不是照搬。探到的几条：
 *   - Dropdown 的 overlay 里 antd 4.21 渲染出来的是 `.ant-dropdown-menu-item`（**不是**独立 Menu 的
 *     `.ant-menu-item`）；danger 项多一个 `.ant-dropdown-menu-item-danger`；
 *   - `Modal.confirm` 渲染到 `document.body`，根节点 `.ant-modal-confirm`，标题 `.ant-modal-confirm-title`、
 *     正文 `.ant-modal-confirm-content`、按钮两个在 `.ant-modal-confirm-btns` 里（第 0 个取消、第 1 个确认），
 *     `okType: 'danger'` 让确认按钮带 `.ant-btn-dangerous`；
 *   - 按钮文案在本测试环境里是英文 `Cancel` / `OK`（没套 `ConfigProvider`，antd 用自带的 enUS），
 *     所以**按 class 和位置选，不按文案选**；
 *   - 确认 / 取消之后 modal 节点会从 DOM 里移走，用例之间不会互相污染（探过：下一个用例开头
 *     `.ant-modal-confirm` 与 `.ant-dropdown` 都是 0 个）。
 * 临时探查文件跑完即删、没有提交。
 *
 * 一条已知的、无害的噪音：第 3 条用例（点确认）跑的时候控制台会出一句
 * `Warning: Can't perform a React state update on an unmounted component`。**不是本批代码的问题**——
 * 栈顶在 `node_modules/rc-overflow/lib/Overflow.js:36`，往下是 rc-menu → antd Menu → rc-trigger 的
 * Dropdown overlay，整条链都在 antd 自己的组件里，没有一帧落在 `ChatHistory` 上。成因是：删除成功后
 * 被删那一行从列表里去掉，连带把那一行的 Dropdown / Menu 卸载了，而 rc-overflow 用 `raf` 排的那次
 * 内部 setState 还没跑完。React 的这条警告只在开发构建里出现、本身是 no-op，所以不去压它——
 * 压 `console.error` 会把真问题一起盖掉。点「重命名」不会出这句（探过），因为那一行不会消失。
 *
 * 写法照 `../README.md` 第三节与 `../es/render.test.tsx`：services 整个 mock 掉，i18n 手工初始化。
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Modal } from 'antd';

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

/** 渲染列表、等历史落地、点开第一条（倒序后是 chat-bbb）的「更多」菜单，返回菜单项节点。 */
async function openFirstItemMenu() {
  const { container } = render(<ChatHistory compact showActions onSelect={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('第一条会话')).toBeInTheDocument());
  const moreButtons = container.querySelectorAll('button[aria-label="更多会话操作"]');
  expect(moreButtons.length).toBe(2);
  fireEvent.click(moreButtons[0]);
  await waitFor(() => expect(screen.getByText('重命名')).toBeInTheDocument());
  const menuItems = Array.from(document.querySelectorAll('.ant-dropdown .ant-dropdown-menu-item'));
  return { container, menuItems };
}

/** 点菜单里的「删除」，等确认框出现，返回确认框节点。 */
async function clickDeleteAndWaitModal(menuItems: Element[]) {
  const deleteItem = menuItems.find((item) => (item.textContent || '').includes('删除'));
  expect(deleteItem).toBeTruthy();
  fireEvent.click(deleteItem as Element);
  await waitFor(() => expect(document.querySelectorAll('.ant-modal-confirm').length).toBe(1));
  return document.querySelector('.ant-modal-confirm') as HTMLElement;
}

describe('N33-C · AI 浮窗会话列表加回「删除」：菜单第三项 + 确认提示（含分享链接失效）', () => {
  beforeEach(() => {
    mockDeleteChat.mockClear();
    mockRenameChat.mockClear();
    mockGetChatHistory.mockClear();
    // 把上一条用例留下的确认框销毁掉。这一行是必须的，踩过坑才加上：
    // `Modal.confirm` 不是渲染进 RTL 的 container，而是 antd 自己 `ReactDOM.render` 到一个挂在
    // `document.body` 上的新 div 里，所以 RTL 的自动 cleanup 清不掉它，会一条条堆在 body 里。
    // 不清的话，上面第 2 条用例（只弹框、不点按钮）留下的那个框会被第 3 条用例的
    // `waitFor(.ant-modal-confirm 有 1 个)` 当场命中，`querySelector` 取回的是**上一条用例的旧框**，
    // 点它的确认按钮触发的是那个已经卸载掉的组件实例的 handleDelete——`deleteChat` 照样被调一次
    // （所以那条断言还是绿的，很能骗人），但 `setHistory` 作用在旧实例上，当前这棵树里的「第二条会话」
    // 永远不会消失，用例就在「列表刷新」那一条上红。实测：加这一行之前 5 条里红 2 条，加上之后全绿。
    Modal.destroyAll();
  });

  it('「更多」菜单恰好三项：重命名 / 分享会话 / 删除，删除项带 danger 样式', async () => {
    const { container, menuItems } = await openFirstItemMenu();

    // ① 三项，文案与顺序都钉住
    expect(menuItems.length).toBe(3);
    const menuTexts = menuItems.map((item) => (item.textContent || '').replace(/\s/g, ''));
    expect(menuTexts).toEqual(['重命名', '分享会话', '删除']);

    // ② 删除项是 antd 的 danger 项（`items` 里写的 `danger: true`，
    //    类型支持见 node_modules/antd/lib/menu/hooks/useItems.d.ts:4）
    const deleteItem = menuItems[2];
    expect(deleteItem.className).toContain('ant-dropdown-menu-item-danger');

    // ③ 加回来的是菜单项，不是阶段 II 那个挂在条目上的老删除图标
    expect(container.querySelectorAll('.anticon-delete').length).toBe(0);

    // ④ 只是点开菜单，还没点删除，所以 deleteChat 不该被调
    expect(mockDeleteChat).not.toHaveBeenCalled();
  });

  it('点「删除」弹确认框：标题「删除该会话？」、正文说明分享链接将失效、确认按钮是 danger 型', async () => {
    const { menuItems } = await openFirstItemMenu();
    const modal = await clickDeleteAndWaitModal(menuItems);

    // ① 标题取 locale 的 history.delete_confirm
    expect((modal.querySelector('.ant-modal-confirm-title') || {}).textContent).toBe('删除该会话？');

    // ② 正文取 locale 的 history.delete_share_notice——用户拍板要求把「分享链接会失效」说清
    const content = (modal.querySelector('.ant-modal-confirm-content') || {}).textContent || '';
    expect(content).toContain('分享链接将失效');
    expect(content).toBe('删除后该会话的分享链接将失效');

    // ③ 两个按钮（取消 / 确认），确认按钮带 okType: 'danger' 的 .ant-btn-dangerous。
    //    按 class 和位置选，不按文案选——本测试环境没套 ConfigProvider，antd 用自带 enUS，
    //    按钮文案是 'Cancel' / 'OK'。
    const buttons = Array.from(modal.querySelectorAll('.ant-modal-confirm-btns button'));
    expect(buttons.length).toBe(2);
    expect(buttons[1].className).toContain('ant-btn-dangerous');

    // ④ 光弹框还没确认，一次都不该调 deleteChat
    expect(mockDeleteChat).not.toHaveBeenCalled();
  });

  it('点确认 → deleteChat 被调一次、参数是被点那条的 chat_id，列表里该条消失', async () => {
    const { menuItems } = await openFirstItemMenu();
    const modal = await clickDeleteAndWaitModal(menuItems);

    const okButton = modal.querySelector('.ant-btn-dangerous') as HTMLElement;
    fireEvent.click(okButton);

    // ① 真调了删除接口，参数是列表倒序后第一条（chat-bbb，last_update 1757000100 更大）
    await waitFor(() => expect(mockDeleteChat).toHaveBeenCalledTimes(1));
    expect(mockDeleteChat).toHaveBeenCalledWith('chat-bbb');

    // ② 列表刷新：被删那条消失，另一条还在（handleDelete 自己 setHistory(filter)，ChatHistory.tsx:92-103）
    await waitFor(() => expect(screen.queryByText('第二条会话')).not.toBeInTheDocument());
    expect(screen.getByText('第一条会话')).toBeInTheDocument();

    // ③ 确认框关掉
    await waitFor(() => expect(document.querySelectorAll('.ant-modal-confirm').length).toBe(0));
  });

  it('点取消 → 一次都不调 deleteChat，列表两条都还在', async () => {
    const { menuItems } = await openFirstItemMenu();
    const modal = await clickDeleteAndWaitModal(menuItems);

    // .ant-modal-confirm-btns 里第 0 个是取消（文案在本环境是 'Cancel'，所以按位置选）
    const cancelButton = modal.querySelectorAll('.ant-modal-confirm-btns button')[0] as HTMLElement;
    fireEvent.click(cancelButton);

    await waitFor(() => expect(document.querySelectorAll('.ant-modal-confirm').length).toBe(0));
    expect(mockDeleteChat).not.toHaveBeenCalled();
    expect(screen.getByText('第一条会话')).toBeInTheDocument();
    expect(screen.getByText('第二条会话')).toBeInTheDocument();
  });

  it('不传 compact / showActions 时连「更多」入口都不画，只显示时间（上游默认形态，N28 钉的这条保留）', async () => {
    const { container } = render(<ChatHistory onSelect={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('第一条会话')).toBeInTheDocument());

    // 两个 prop 默认都是 false（ChatHistory.tsx:64），走的是「只显示时间」那条分支
    expect(container.querySelectorAll('button[aria-label="更多会话操作"]').length).toBe(0);
    expect(container.querySelectorAll('.anticon-delete').length).toBe(0);
    expect(mockDeleteChat).not.toHaveBeenCalled();
  });
});
