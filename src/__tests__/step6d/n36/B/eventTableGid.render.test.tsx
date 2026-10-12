/**
 * N36 批 B（C-4）· 当前告警事件的表格视图：业务组列表为空时**不发** `GET /api/takin/alert-events/list/xh`。
 *
 * 钉的是什么：A13 本地回归里，测试账号不属于任何用户组 → `GET /api/takin/busi-groups` 回空列表 →
 * `src/App.tsx:318` 把 localStorage 的 `groupIds` 写成空串 → `src/pages/event/Table.tsx` 把这个空串
 * 当 `gid` 发出去 → 后端 `ln-server/center/router/router_alert_cur_event.go:525-527` 判
 * `gid == "" && !admin` 直接回 **400**「gid 不能为空」。
 * 证据：`ln-server/第三步-流水线/阶段6-A线收尾/A13本地回归/证据/T5/11-T511-guest-login.txt:204`、`:206`
 * （Guest 身份下四次 400），以及 `结论-T5.md:121` 的 T5-todo-7、后端第八份交接第六节。
 *
 * 为什么不能「只是把参数省掉」：后端取参用的是 `ginx.QueryStr(c, "gid", "")`，
 * 「不带这个参数」和「带一个空值」取回来都是空串，一样撞 400。所以只能不发请求。
 *
 * 为什么守卫要带 Admin 这一档：后端那一行的判法是 `gid == "" && !admin`——Admin 带空 gid 是**合法**的
 * （意思是「不按业务组过滤、看全部」）。前端照抄这一行，Admin 的行为一行都不变。
 * 前端判 Admin 用 `profile.roles.includes('Admin')`，和后端 `models/user.go:213 IsAdmin()` 比
 * `models/common.go:16 AdminRole = "Admin"` 是同一个口径。
 *
 * 三条用例里第一条是要害：**改之前它会失败**（`getEvents` 会被调一次、带着空 gid）。
 *
 * 写法照 `src/__tests__/step6d/n36/A/ibexAdminGate.render.test.tsx` 与 `../../README.md` 第三节：
 * `@/App` 换成只有 Context 的替身、接口层整个 mock 掉、i18n 手工初始化。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// `@/App` 会 import './routers'，等于把整棵路由树拉进来；这里只要它导出的 CommonStateContext。
jest.mock('@/App', () => require('../../helpers/appMock'));

// Table.tsx 反过来 import './index'（整个「当前告警」页，两个文件互相引用）。那一页会拉进
// `@/components/TimeRangePicker` → `rc-picker/es/generate/moment`，而 rc-picker 的 es 目录只发 ESM，
// jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），会报
// `Cannot use import statement outside a module`。Table.tsx 只用到它导出的三样东西
// （`:27-28` 的 deleteAlertEventsModal / SeverityColor / SeverityFont），换成最小替身即可。
const mockDeleteAlertEventsModal = jest.fn();
jest.mock('@/pages/event/index', () => ({
  __esModule: true,
  deleteAlertEventsModal: (...args: any[]) => mockDeleteAlertEventsModal.apply(null, args as any),
  SeverityColor: ['red', 'orange', 'yellow'],
  SeverityFont: ['一级告警', '二级告警', '三级告警'],
  default: () => null,
}));

// 本用例要数的那一次：`src/pages/event/services.ts` 的 getEvents（打 /api/takin/alert-events/list/xh）。
const mockGetEvents = jest.fn(() => Promise.resolve({ dat: { list: [], total: 0 } }));
jest.mock('@/pages/event/services', () => ({
  __esModule: true,
  getEvents: (...args: any[]) => mockGetEvents.apply(null, args as any),
  exportTemplet: jest.fn(() => Promise.resolve({})),
}));

// Table.tsx 拿到事件列表之后还会去补规则名（getStrategiesByRuleIds）；列表为空时不会走到，
// 但 mock 掉免得真发请求。deleteAlertEvents 是整页的删除接口，同理。
jest.mock('@/services/warning', () => ({
  __esModule: true,
  getStrategiesByRuleIds: jest.fn(() => Promise.resolve({ dat: [] })),
  deleteAlertEvents: jest.fn(() => Promise.resolve({})),
  getAlertCards: jest.fn(() => Promise.resolve({ dat: [] })),
  getCardDetail: jest.fn(() => Promise.resolve({ dat: [] })),
}));

import '@/i18n';
import { CommonStateContext, defaultCommonState } from '@/App';
import TableCpt from '@/pages/event/Table';

const GROUP_IDS_KEY = 'groupIds';

function renderTable(roles: string[], groupIds: string) {
  window.localStorage.setItem(GROUP_IDS_KEY, groupIds);
  const value = {
    ...defaultCommonState,
    profile: { ...defaultCommonState.profile, roles, role: roles[0], admin: roles.includes('Admin') },
  };
  return render(
    <MemoryRouter>
      <CommonStateContext.Provider value={value}>
        <TableCpt
          filterObj={{ severity: undefined, start: -1, end: -1 }}
          filter={{}}
          setFilter={() => undefined}
          header={null}
          selectedRowKeys={[]}
          setSelectedRowKeys={() => undefined}
          deleteAlert={() => undefined}
        />
      </CommonStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('N36-B (C-4)：当前告警事件表格 —— 业务组为空时不发 alert-events/list/xh', () => {
  beforeEach(() => {
    mockGetEvents.mockClear();
    window.localStorage.removeItem(GROUP_IDS_KEY);
    window.localStorage.removeItem('events_current_from');
  });

  it('非 Admin + 业务组为空（localStorage groupIds 是空串）：getEvents 一次都不被调（改之前这条会失败）', async () => {
    const { container } = renderTable(['Standard'], '');
    await waitFor(() => expect(container.querySelector('.ant-table')).toBeTruthy());
    // 要害：`useAntdTable` 的 debounceWait 是 500ms（Table.tsx 的 `:258` 一带），
    // 光等表格壳子渲染出来就断言「没发」是**假绿**——那时请求还没到时候。
    // 这里实测过：把守卫改成 `if (false && …)` 后只等壳子，这条仍然绿；
    // 等满 1500ms 再断言才会红。所以这个等待是本用例成立的前提，别删。
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(mockGetEvents).not.toHaveBeenCalled();
  });

  it('非 Admin + 有业务组：照常调一次，gid 就是那串 id', async () => {
    renderTable(['Standard'], '1,2');
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(1));
    expect(mockGetEvents.mock.calls[0][0]).toMatchObject({ gid: '1,2' });
  });

  it('Admin + 业务组为空：仍然照常调（后端那一行允许 Admin 带空 gid，行为不变）', async () => {
    renderTable(['Admin'], '');
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalledTimes(1));
    expect(mockGetEvents.mock.calls[0][0]).toMatchObject({ gid: '' });
  });
});
