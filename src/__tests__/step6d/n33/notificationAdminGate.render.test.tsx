/**
 * N33 批 D · (d)：通知配置 5 个页面的「写入口只对 Admin 显示」渲染用例。
 *
 * 钉的是什么：后端第七份交接 6.1（u-sec 安全批）把这 5 条写接口改成**仅 Admin 可写**——
 *   PUT /webhooks        → ln-server center/router/router.go:831  pages.PUT("/webhooks", rt.auth(), rt.admin(), …)
 *   PUT /notify-script   → ln-server center/router/router.go:834
 *   PUT /notify-channel  → ln-server center/router/router.go:837
 *   PUT /notify-contact  → ln-server center/router/router.go:840
 *   PUT /notify-config   → ln-server center/router/router.go:843
 * 普通用户点下去只会拿到 403。拍板 L-07 的做法是**隐藏入口**（照羚牛样板
 * src/pages/alertRules/List/index.tsx:245 的条件渲染），判法只认 `profile.roles?.includes('Admin')`，
 * 不夹权限点那一半——因为后端只认角色。这是 UI 层的「别让人白点」，**不是权限控制**：
 * 真正拦请求的还是后端的 rt.admin()。
 *
 * 每页断言两组：
 *   - 非 Admin（roles=['Standard']）：会发那条 PUT 的控件一个都不在；
 *   - Admin（roles=['Admin']）：它们都在。
 * Channels / Contacts 两页额外断言「隐藏」列的启停 Switch 在非 Admin 下带 disabled——
 * 它是直接发 PUT 的控件，但要让人看到当前状态，所以按 L-07 选的是置灰而不是藏掉。
 *
 * 为什么用 @testing-library 的 render 而不是 renderToString：Channels / Contacts 的
 * 「修改」「删除」「Switch」都长在表格行里，行数据来自 useEffect 里的 GET；renderToString 不跑 effect，
 * 表格就是空的、列的 render 根本不会被调用（先例与理由同 l4/dsqueries.render.test.tsx 文件头）。
 *
 * mock 的 GET 都回最小数据；PUT 一律 mock 成 resolve，本用例不点击、不触发它们。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// `@/App` 会 import './routers'，等于把整棵路由树拉进来；这 5 个页面只要它导出的 CommonStateContext。
jest.mock('@/App', () => require('../helpers/appMock'));

// Script.tsx / SMTP/index.tsx 用 CodeMirror 编辑脚本与 SMTP 配置。@uiw/react-codemirror 与
// @codemirror/view 在 jest 里既重又是 ESM（jest.config.ts:59 默认不转译 node_modules），换成纯 textarea 壳。
jest.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => require('react').createElement('textarea', { className: 'codemirror-stub', value: value ?? '', onChange }),
}));
jest.mock('@codemirror/view', () => ({
  __esModule: true,
  EditorView: { lineWrapping: {}, theme: () => ({}) },
}));

// 5 个页面的接口层。GET 回最小数据（Channels / Contacts 各给一行、built_in=false 才会渲染「删除」）；
// PUT 全部 mock 住，用例只看渲染、不点击。
const mockPutWebhooks = jest.fn(() => Promise.resolve({}));
const mockPutNotifyScript = jest.fn(() => Promise.resolve({}));
const mockPutNotifyChannels = jest.fn(() => Promise.resolve({}));
const mockPutNotifyContacts = jest.fn(() => Promise.resolve({}));
const mockPutNotifyConfig = jest.fn(() => Promise.resolve({}));
jest.mock('@/pages/help/NotificationSettings/services', () => ({
  __esModule: true,
  getWebhooks: jest.fn(() => Promise.resolve([{ enable: true, note: 'n', url: 'http://127.0.0.1:1', timeout: 5, headers: {}, skip_verify: false }])),
  putWebhooks: (...args: any[]) => mockPutWebhooks.apply(null, args as any),
  getNotifyScript: jest.fn(() => Promise.resolve({ enable: true, content: 'echo 1', timeout: 5, type: 0 })),
  putNotifyScript: (...args: any[]) => mockPutNotifyScript.apply(null, args as any),
  getNotifyChannels: jest.fn(() => Promise.resolve([{ name: '钉钉', ident: 'dingtalk', hide: false, built_in: false }])),
  putNotifyChannels: (...args: any[]) => mockPutNotifyChannels.apply(null, args as any),
  getNotifyContacts: jest.fn(() => Promise.resolve([{ name: '手机号', ident: 'phone', hide: false, built_in: false }])),
  putNotifyContacts: (...args: any[]) => mockPutNotifyContacts.apply(null, args as any),
  getNotifyConfig: jest.fn(() => Promise.resolve('Host = "127.0.0.1"')),
  putNotifyConfig: (...args: any[]) => mockPutNotifyConfig.apply(null, args as any),
}));

import '@/i18n';
import '@/pages/help/NotificationSettings/locale';
import { CommonStateContext, defaultCommonState } from '@/App';
import Webhooks from '@/pages/help/NotificationSettings/Webhooks';
import Script from '@/pages/help/NotificationSettings/Script';
import SMTP from '@/pages/help/NotificationSettings/SMTP';
import Channels from '@/pages/help/NotificationSettings/Channels';
import Contacts from '@/pages/help/NotificationSettings/Contacts';

// 词条取自 src/locales/common/zh_CN.ts:20,22,23（btn.save / btn.modify / btn.delete）
// 与 src/pages/help/NotificationSettings/locale/zh_CN.ts:30（channels.add）。
const BTN_SAVE = '保存';
const BTN_MODIFY = '修改';
const BTN_DELETE = '删除';
const BTN_ADD = '添加';

// antd 的 Button 会给「两个汉字」的文案中间塞一个空格（DOM 里是 `保 存`，见 antd 4 Button 的
// insertSpace 处理），所以文案比对一律先把空白去掉。findByText / queryByText 都收 normalizer。
const squash = { normalizer: (s: string) => s.replace(/\s+/g, '') };

function renderAs(roles: string[], node: React.ReactElement) {
  const value = { ...defaultCommonState, profile: { ...defaultCommonState.profile, roles, role: roles[0], admin: roles.includes('Admin') } };
  return render(<CommonStateContext.Provider value={value}>{node}</CommonStateContext.Provider>);
}

describe('N33-D (d)：通知配置 5 页的写入口只对 Admin 显示', () => {
  describe('Webhooks（PUT /webhooks）', () => {
    // 本页唯一会发 PUT 的控件是保存按钮；Form.List 的「添加」与行内 X 只动本地表单状态，按 L-07 口径不算写入口。
    it('非 Admin 看不到保存按钮', async () => {
      const { container, queryByText } = renderAs(['Standard'], <Webhooks />);
      await waitFor(() => expect(container.querySelector('.webhooks-content')).toBeTruthy());
      expect(queryByText(BTN_SAVE, squash)).toBeNull();
    });

    it('Admin 看得到保存按钮', async () => {
      const { findByText } = renderAs(['Admin'], <Webhooks />);
      expect(await findByText(BTN_SAVE, squash)).toBeTruthy();
    });
  });

  describe('Script（PUT /notify-script）', () => {
    it('非 Admin 看不到保存按钮', async () => {
      const { container, queryByText } = renderAs(['Standard'], <Script />);
      await waitFor(() => expect(container.querySelector('form')).toBeTruthy());
      expect(queryByText(BTN_SAVE, squash)).toBeNull();
    });

    it('Admin 看得到保存按钮', async () => {
      const { findByText } = renderAs(['Admin'], <Script />);
      expect(await findByText(BTN_SAVE, squash)).toBeTruthy();
    });
  });

  describe('SMTP（PUT /notify-config）', () => {
    it('非 Admin 看不到保存按钮', async () => {
      const { container, queryByText } = renderAs(['Standard'], <SMTP />);
      await waitFor(() => expect(container.querySelector('form')).toBeTruthy());
      expect(queryByText(BTN_SAVE, squash)).toBeNull();
    });

    it('Admin 看得到保存按钮', async () => {
      const { findByText } = renderAs(['Admin'], <SMTP />);
      expect(await findByText(BTN_SAVE, squash)).toBeTruthy();
    });
  });

  describe('Channels（PUT /notify-channel）', () => {
    it('非 Admin：添加 / 修改 / 删除都不在，启停 Switch 置灰', async () => {
      const { container, queryByText } = renderAs(['Standard'], <Channels />);
      // 等 useEffect 里的 GET 回来、表格把那一行渲染出来（行里才有修改 / 删除 / Switch）
      await waitFor(() => expect(queryByText('钉钉')).toBeTruthy());
      expect(queryByText(BTN_ADD, squash)).toBeNull();
      expect(queryByText(BTN_MODIFY, squash)).toBeNull();
      expect(queryByText(BTN_DELETE, squash)).toBeNull();
      const sw = container.querySelector('.ant-switch');
      expect(sw).toBeTruthy();
      expect(sw).toBeDisabled();
    });

    it('Admin：添加 / 修改 / 删除都在，启停 Switch 可点', async () => {
      const { container, queryByText, findByText } = renderAs(['Admin'], <Channels />);
      expect(await findByText('钉钉')).toBeTruthy();
      expect(queryByText(BTN_ADD, squash)).toBeTruthy();
      expect(queryByText(BTN_MODIFY, squash)).toBeTruthy();
      expect(queryByText(BTN_DELETE, squash)).toBeTruthy();
      const sw = container.querySelector('.ant-switch');
      expect(sw).toBeTruthy();
      expect(sw).not.toBeDisabled();
    });
  });

  describe('Contacts（PUT /notify-contact）', () => {
    it('非 Admin：添加 / 修改 / 删除都不在，启停 Switch 置灰', async () => {
      const { container, queryByText } = renderAs(['Standard'], <Contacts />);
      await waitFor(() => expect(queryByText('手机号')).toBeTruthy());
      expect(queryByText(BTN_ADD, squash)).toBeNull();
      expect(queryByText(BTN_MODIFY, squash)).toBeNull();
      expect(queryByText(BTN_DELETE, squash)).toBeNull();
      const sw = container.querySelector('.ant-switch');
      expect(sw).toBeTruthy();
      expect(sw).toBeDisabled();
    });

    it('Admin：添加 / 修改 / 删除都在，启停 Switch 可点', async () => {
      const { container, queryByText, findByText } = renderAs(['Admin'], <Contacts />);
      expect(await findByText('手机号')).toBeTruthy();
      expect(queryByText(BTN_ADD, squash)).toBeTruthy();
      expect(queryByText(BTN_MODIFY, squash)).toBeTruthy();
      expect(queryByText(BTN_DELETE, squash)).toBeTruthy();
      const sw = container.querySelector('.ant-switch');
      expect(sw).toBeTruthy();
      expect(sw).not.toBeDisabled();
    });
  });

  it('兜底：5 个页面渲染过程中一次 PUT 都没发出去（本用例只看渲染，不点击）', () => {
    expect(mockPutWebhooks).not.toHaveBeenCalled();
    expect(mockPutNotifyScript).not.toHaveBeenCalled();
    expect(mockPutNotifyChannels).not.toHaveBeenCalled();
    expect(mockPutNotifyContacts).not.toHaveBeenCalled();
    expect(mockPutNotifyConfig).not.toHaveBeenCalled();
  });
});
