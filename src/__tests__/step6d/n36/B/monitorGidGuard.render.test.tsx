/**
 * N36 批 B（C-2）· 监控列表页（`/xh/monitor`）：业务组列表为空时**不发** `GET /api/n9e/xh/monitoring/filter`。
 *
 * 和同目录另外两份（卡片 C-3、表格 C-4）是同一类毛病，只是参数名叫 `gId`：
 * 测试账号不属于任何用户组 → `busi-groups` 回空 → `groupIds?.toString()` 是空串 → 当 `gId` 发出去 →
 * 后端 `ln-server/center/router/router_monitoring.go:245-249` 判 `gId == "" && !isAdmin` 回 **400**
 *「gId 参数不能为空」。证据：`A13本地回归/证据/T5/10-T510-standard-login.txt:144`（Standard，05:02:02）。
 *
 * 守卫带 Admin 这一档是照抄后端那一行，Admin 行为不变。
 * 这一页有一千四百行、还挂着资产树与各种弹窗，本用例只关心「getMonitorInfoList 被不被调、带什么 gId」，
 * 所以接口层与重组件全换成替身。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../../helpers/appMock'));

// 要数的那一次：`src/services/manage.ts:22-27` 的 getMonitorInfoList。
const mockGetMonitorInfoList = jest.fn(() => Promise.resolve({ dat: { list: [], total: 0 } }));
jest.mock('@/services/manage', () => ({
  __esModule: true,
  getMonitorInfoList: (...args: any[]) => mockGetMonitorInfoList.apply(null, args as any),
  deleteXhMonitor: jest.fn(() => Promise.resolve({})),
  deleteXhBatchMonitor: jest.fn(() => Promise.resolve({})),
  updateMonitorStatus: jest.fn(() => Promise.resolve({})),
}));

// 资产相关接口一律回空，页面能挂上就行。
const emptyList = () => Promise.resolve({ dat: [] });
jest.mock('@/services/assets', () => ({
  __esModule: true,
  getAssetstypes: emptyList,
  getAssetstypesByParams: emptyList,
  getAssetsByCondition: emptyList,
  getAssetsByMonitor: emptyList,
  getAssetDirectoryTree: emptyList,
  getXhAsset: () => Promise.resolve({ dat: {} }),
  getMonitorAssetstypes: emptyList,
  getAssetsMonitor: emptyList,
  getAssetstypesNew: emptyList,
  delXhAssetstypesNew: () => Promise.resolve({}),
  getMonitortree: emptyList,
}));

// RawQuery 那条链会拉进 PromQueryBuilder → TimeRangePicker → `rc-picker/es/generate/moment`（只发 ESM，
// jest 默认不转译 node_modules）。本页只用它把 PromQL 画成一行字，换成最简实现。
jest.mock('@/components/PromQueryBuilder/RawQuery', () => ({
  __esModule: true,
  renderQuery: () => '',
  default: () => null,
}));
jest.mock('@/components/pageLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => require('react').createElement('div', { className: 'page-layout-stub' }, children),
}));
jest.mock('@/components/CustomForm/CommonModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/RefreshIcon', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/xh/monitor/OperationModal', () => ({ __esModule: true, OperationModal: () => null, default: () => null }));
jest.mock('@/pages/xh/monitor/Accordion/accordionModal', () => ({ __esModule: true, default: () => null }));

import '@/i18n';
import { CommonStateContext, defaultCommonState } from '@/App';
import XhMonitor from '@/pages/xh/monitor';

function renderMonitor(roles: string[], busiGroups: any[]) {
  const value = {
    ...defaultCommonState,
    profile: { ...defaultCommonState.profile, roles, role: roles[0], admin: roles.includes('Admin') },
    busiGroups,
  };
  return render(
    <MemoryRouter initialEntries={['/xh/monitor']}>
      <CommonStateContext.Provider value={value}>
        <XhMonitor />
      </CommonStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('N36-B (C-2)：监控列表 —— 业务组为空时不发 xh/monitoring/filter', () => {
  beforeEach(() => {
    mockGetMonitorInfoList.mockClear();
  });

  it('非 Admin + 业务组为空数组：getMonitorInfoList 一次都不被调（改之前这条会失败）', async () => {
    const { container } = renderMonitor(['Standard'], []);
    await waitFor(() => expect(container.querySelector('.page-layout-stub')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(mockGetMonitorInfoList).not.toHaveBeenCalled();
  });

  it('非 Admin + 有两个业务组：照常调，gId 是那两个 id', async () => {
    renderMonitor(['Standard'], [{ id: 3, name: 'g3' }, { id: 4, name: 'g4' }]);
    await waitFor(() => expect(mockGetMonitorInfoList).toHaveBeenCalled(), { timeout: 5000 });
    expect(mockGetMonitorInfoList.mock.calls[0][0]).toMatchObject({ gId: '3,4' });
  });

  it('Admin + 业务组为空：仍然照常调（后端允许 Admin 带空 gId，行为不变）', async () => {
    renderMonitor(['Admin'], []);
    await waitFor(() => expect(mockGetMonitorInfoList).toHaveBeenCalled(), { timeout: 5000 });
    expect(mockGetMonitorInfoList.mock.calls[0][0]).toMatchObject({ gId: '' });
  });
});
