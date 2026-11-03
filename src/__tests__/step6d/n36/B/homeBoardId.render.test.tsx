/**
 * N36 批 B（C-1）· 首页（`/home`）在「用户没有设过首页看板」时不要去请求 `GET /api/n9e/board/0`。
 *
 * 钉的是什么：`/home` 这条路由渲染的是 `<Detail isPreview isHome />`
 * （`src/pages/home/index.tsx:6`、`src/routers/index.tsx:182`，`/` 由 `:337-338` 重定向过来）。
 * `Detail.tsx` 里原来是这么取 id 的：
 *     id = _.toString(profile.board_id) || '1'
 * `profile.board_id` 为 **0** 时 `_.toString(0)` 得到字符串 `'0'`——它是**真值**，`|| '1'` 兜不住，
 * 于是发出 `GET /api/n9e/board/0`，后端回 **404**。
 * A13 本地回归里这条一次登录就打了三遍：
 * `ln-server/第三步-流水线/阶段6-A线收尾/A13本地回归/证据/T5/10-T510-standard-login.txt:142`
 * （`404 GET /api/n9e/board/0`，05:01:33 / :52 / :53），归在 OBS-T5-4 / T5-todo-7 名下。
 *
 * 改法：只认大于 0 的 `board_id`，其余（0 / undefined / null）一律回落到默认首页看板 `'1'`。
 *
 * 第一条用例是要害：**改之前它会失败**（会拿到 `'0'`）。
 *
 * 这个页面的子组件很重（面板渲染器、编辑器、时间选择器都在里面，还会拉进只发 ESM 的 rc-picker），
 * 本用例只关心「`getDashboard` 被拿什么 id 调」，所以把子组件和接口层全换成替身。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../../helpers/appMock'));

// 要数的那一次：`src/services/dashboardV2.ts:76-82` 的 getDashboard（打 /api/n9e/board/:id）。
const mockGetDashboard = jest.fn(() =>
  Promise.resolve({ id: 1, name: 'home', configs: { panels: [], var: [] }, update_at: 0 }),
);
jest.mock('@/services/dashboardV2', () => ({
  __esModule: true,
  getDashboard: (...args: any[]) => mockGetDashboard.apply(null, args as any),
  getBuiltinDashboard: jest.fn(() => Promise.resolve({ configs: { panels: [] } })),
  getDashboardPure: jest.fn(() => Promise.resolve({ update_at: 0 })),
  updateDashboardConfigs: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/services/metric', () => ({
  __esModule: true,
  SetTmpChartData: jest.fn(() => Promise.resolve({ dat: '' })),
}));

// uuid 这个包只发 ESM（node_modules/uuid/dist/esm-browser/index.js），jest 默认不转译 node_modules，
// 会报 `Unexpected token 'export'`。Detail.tsx 只用它生成新面板的 id，本用例不新建面板。
jest.mock('uuid', () => ({ __esModule: true, v4: () => 'stub-uuid' }));

// 下面这一串都是「只为了让 Detail 能渲染出来」的替身，本用例一个都不断言。
// 换掉它们的原因：时间选择器那条链会拉进 `rc-picker/es/generate/moment`（只发 ESM，同样的报错）；
// 面板渲染器与编辑器则是整棵图表树，又重又跟本用例无关。
jest.mock('@/components/TimeRangePicker', () => ({
  __esModule: true,
  default: () => null,
  getDefaultValue: (_key: string, fallback: any) => fallback,
  isValid: () => false,
  parseRange: (range: any) => range,
  AutoRefresh: () => null,
}));
jest.mock('@/components/pageLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => require('react').createElement('div', { className: 'page-layout-stub' }, children),
}));
jest.mock('@/pages/help/migrate/MigrationModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/dashboard/VariableConfig', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/dashboard/VariableConfig/constant', () => ({
  __esModule: true,
  replaceExpressionVars: (expression: string) => expression,
}));
jest.mock('@/pages/dashboard/DashboardLinks', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/dashboard/Panels', () => ({ __esModule: true, default: () => require('react').createElement('div', { className: 'panels-stub' }) }));
jest.mock('@/pages/dashboard/Detail/Title', () => ({ __esModule: true, default: () => require('react').createElement('div', { className: 'title-stub' }) }));
jest.mock('@/pages/dashboard/Editor', () => ({ __esModule: true, default: () => null }));

import '@/i18n';
import { CommonStateContext, defaultCommonState } from '@/App';
import Detail from '@/pages/dashboard/Detail/Detail';

function renderHome(boardId: any) {
  const value = {
    ...defaultCommonState,
    profile: { ...defaultCommonState.profile, board_id: boardId },
  };
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <CommonStateContext.Provider value={value}>
        <Detail isPreview isHome />
      </CommonStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('N36-B (C-1)：首页看板 id 为 0 时不请求 board/0', () => {
  beforeEach(() => {
    mockGetDashboard.mockClear();
  });

  it('board_id = 0（没设过首页看板）：请求的是 board/1，不是 board/0（改之前这条会失败）', async () => {
    renderHome(0);
    await waitFor(() => expect(mockGetDashboard).toHaveBeenCalled());
    expect(mockGetDashboard.mock.calls[0][0]).toBe('1');
  });

  it('board_id = undefined（profile 里压根没这个字段）：同样回落到 board/1', async () => {
    renderHome(undefined);
    await waitFor(() => expect(mockGetDashboard).toHaveBeenCalled());
    expect(mockGetDashboard.mock.calls[0][0]).toBe('1');
  });

  it('board_id = 7（用户设过首页看板）：照常请求 board/7', async () => {
    renderHome(7);
    await waitFor(() => expect(mockGetDashboard).toHaveBeenCalled());
    expect(mockGetDashboard.mock.calls[0][0]).toBe('7');
  });
});
