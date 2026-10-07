/**
 * N36 批 A（A-1）· IBEX 自愈配置页的保存按钮「只对 Admin 显示」。
 *
 * 钉的是什么：这个按钮发的是 `PUT /notify-config`
 * （`src/pages/help/NotificationSettings/services.ts` 的 `putNotifyConfig`），
 * u-sec 安全批之后后端已经收成仅 Admin 可写（ln-server `center/router/router.go:843` 的 `rt.admin()`），
 * 同一个接口还管着 SMTP 与 ibex 回调的账号密码。
 *
 * 改之前这里的判法是「Admin 角色 **或** 有 `/ibex-settings/save` 这个权限点」。
 * 后端第八份交接第二节 1 查证：`/ibex-settings/save` 在羚牛基线、公司 2.1、n9e 主线后端
 * 三边全仓零命中，角色权限种子 65 条里也没有——也就是说它永远是 false，留着只会让人以为
 * 「配个权限点就能放开」。N36 批 A 把这一半删掉，判法与 N33 批 D 给另外 5 个通知配置页
 * 定的口径统一：**只认 `profile.roles` 含 `Admin`**。
 *
 * 所以下面第二个用例是本文件的要害：**故意把 `permList` 填上 `/ibex-settings/save`**，
 * 非 Admin 仍然看不到保存按钮——这正是改之前会失败、改之后才过的那条。
 *
 * 提醒一句：这是 UI 层的「别让人白点」，不是权限控制。真正拦住请求的还是后端的 `rt.admin()`；
 * 本用例证的只是「界面不把一个注定 403 的按钮摆出来」。
 *
 * 写法照 `src/__tests__/step6d/n33/notificationAdminGate.render.test.tsx`（同一批的 5 个兄弟页面）。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// `@/App` 会 import './routers'，等于把整棵路由树拉进来；本页只要它导出的 CommonStateContext。
jest.mock('@/App', () => require('../../helpers/appMock'));

// IBEX/index.tsx 用 CodeMirror 编辑那段 ibex_server 配置。@uiw/react-codemirror 与 @codemirror/view
// 在 jest 里既重又是 ESM（jest.config.ts:59 默认不转译 node_modules），换成纯 textarea 壳。
jest.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => require('react').createElement('textarea', { className: 'codemirror-stub', value: value ?? '', onChange }),
}));
jest.mock('@codemirror/view', () => ({
  __esModule: true,
  EditorView: { lineWrapping: {}, theme: () => ({}) },
}));

// 接口层：GET 回一段最小配置文本；PUT mock 住——本用例只看渲染、不点击。
const mockPutNotifyConfig = jest.fn(() => Promise.resolve({}));
jest.mock('@/pages/help/NotificationSettings/services', () => ({
  __esModule: true,
  getNotifyConfig: jest.fn(() => Promise.resolve('Addrs = ["127.0.0.1:10090"]')),
  putNotifyConfig: (...args: any[]) => mockPutNotifyConfig.apply(null, args as any),
}));

import '@/i18n';
import '@/pages/help/NotificationSettings/locale';
import { CommonStateContext, defaultCommonState } from '@/App';
import IBEX from '@/pages/help/NotificationSettings/IBEX';

// 词条取自 src/locales/common/zh_CN.ts 的 btn.save。
const BTN_SAVE = '保存';
// antd 4 的 Button 会给「两个汉字」的文案中间塞一个空格（DOM 里是 `保 存`，见 antd 4 Button 的
// insertSpace 处理），所以文案比对一律先把空白去掉。
const squash = { normalizer: (s: string) => s.replace(/\s+/g, '') };

function renderAs(roles: string[], permList: string[]) {
  const value = {
    ...defaultCommonState,
    profile: { ...defaultCommonState.profile, roles, role: roles[0], admin: roles.includes('Admin') },
    permList,
  };
  return render(
    <CommonStateContext.Provider value={value}>
      <IBEX />
    </CommonStateContext.Provider>,
  );
}

describe('N36-A (A-1)：IBEX 自愈配置页的保存按钮只对 Admin 显示', () => {
  it('非 Admin（roles=[Standard]，permList 为空）：看不到保存按钮', async () => {
    const { container, queryByText } = renderAs(['Standard'], []);
    // 等 useEffect 里的 GET 回来、表单渲染出来，再断言按钮不在（否则可能只是还没渲染完）
    await waitFor(() => expect(container.querySelector('form')).toBeTruthy());
    expect(queryByText(BTN_SAVE, squash)).toBeNull();
  });

  it('非 Admin 但带着 /ibex-settings/save 权限点：**仍然**看不到保存按钮（改之前这条会失败）', async () => {
    const { container, queryByText } = renderAs(['Standard'], ['/ibex-settings/save']);
    await waitFor(() => expect(container.querySelector('form')).toBeTruthy());
    expect(queryByText(BTN_SAVE, squash)).toBeNull();
  });

  it('Admin：看得到保存按钮', async () => {
    const { findByText } = renderAs(['Admin'], []);
    expect(await findByText(BTN_SAVE, squash)).toBeTruthy();
  });

  it('Admin 且 permList 为空也看得到（判的是角色，跟权限点没关系了）', async () => {
    const { findByText } = renderAs(['Admin'], []);
    expect(await findByText(BTN_SAVE, squash)).toBeTruthy();
  });

  it('兜底：整个渲染过程一次 PUT /notify-config 都没发出去（本用例只看渲染，不点击）', () => {
    expect(mockPutNotifyConfig).not.toHaveBeenCalled();
  });
});
