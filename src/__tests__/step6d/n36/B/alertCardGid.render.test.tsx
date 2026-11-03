/**
 * N36 批 B（C-3）· 当前告警事件的卡片视图：业务组列表为空时**不发** `GET /api/n9e/alert-cur-events/card/xh`。
 *
 * 和同目录 `eventTableGid.render.test.tsx`（表格视图，C-4）是同一个页面的两个视图、同一类毛病：
 * 测试账号不属于任何用户组 → `GET /api/n9e/busi-groups` 回空列表 → `busiGroups` 是空数组 →
 * `groupIds?.toString()` 得到空串 → 当 `gid` 发出去 → 后端
 * `ln-server/center/router/router_alert_cur_event.go:166-168` 判 `gid == "" && !admin` 回 **400**「gid 参数为空」。
 * 证据：`A13本地回归/证据/T5/10-T510-standard-login.txt:145`（Standard，05:02:04）、
 * `11-T511-guest-login.txt:205`、`:207`（Guest 两次）。
 *
 * 不能「只省掉参数」：后端取参是 `ginx.QueryStr(c, "gid", "")`，不带和带空值取回来都是空串，一样 400。
 * 守卫带 Admin 这一档，是照抄后端那一行——Admin 带空 gid 是合法的（看全部），行为不变。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../../helpers/appMock'));

// card.tsx 顶部 `import { ReactNode } from 'react-markdown/lib/react-markdown'` 只是拿一个类型，
// 但语法上是值导入，jest 会真去加载 react-markdown（只发 ESM，默认不转译 node_modules）。换空壳。
jest.mock('react-markdown/lib/react-markdown', () => ({}), { virtual: true });

// card.tsx 反过来 import './index'（整个「当前告警」页），那一页会拉进 TimeRangePicker → rc-picker 的 ESM。
// card.tsx 只用到它三样东西，换最小替身。
jest.mock('@/pages/event/index', () => ({
  __esModule: true,
  deleteAlertEventsModal: jest.fn(),
  SeverityColor: ['red', 'orange', 'yellow'],
  SeverityFont: ['一级告警', '二级告警', '三级告警'],
  default: () => null,
}));

// 卡片视图左侧那棵「按规则分组」的树负责把 groupId 交上来（card.tsx `:326` 的 onRefreshRule={setGroupId}）。
// 没有 groupId，reloadCard 第一行就 return 了（`:68`），请求根本不会发——那样三条用例都成立但什么也没证到。
// 所以这个替身一挂上就把 groupId 交上去，让代码真的走到发请求那一步。
jest.mock('@/pages/event/cardLeft', () => ({
  __esModule: true,
  default: ({ onRefreshRule }: any) => {
    const React2 = require('react');
    React2.useEffect(() => {
      onRefreshRule('-1');
    }, []);
    return React2.createElement('div', { className: 'card-left-stub' });
  },
}));

// 要数的那一次：`src/services/warning.ts:406-411` 的 getAlertCards。
const mockGetAlertCards = jest.fn(() => Promise.resolve({ dat: [] }));
jest.mock('@/services/warning', () => ({
  __esModule: true,
  getAlertCards: (...args: any[]) => mockGetAlertCards.apply(null, args as any),
  getCardDetail: jest.fn(() => Promise.resolve({ dat: [] })),
  getStrategiesByRuleIds: jest.fn(() => Promise.resolve({ dat: [] })),
  deleteAlertEvents: jest.fn(() => Promise.resolve({})),
}));

import '@/i18n';
import { CommonStateContext, defaultCommonState } from '@/App';
import Card from '@/pages/event/card';

function renderCard(roles: string[], busiGroups: any[]) {
  const value = {
    ...defaultCommonState,
    profile: { ...defaultCommonState.profile, roles, role: roles[0], admin: roles.includes('Admin') },
    busiGroups,
  };
  return render(
    <MemoryRouter>
      <CommonStateContext.Provider value={value}>
        <Card filter={{ start: -1, end: -1 }} header={null} refreshFlag='r1' />
      </CommonStateContext.Provider>
    </MemoryRouter>,
  );
}

describe('N36-B (C-3)：当前告警事件卡片 —— 业务组为空时不发 alert-cur-events/card/xh', () => {
  beforeEach(() => {
    mockGetAlertCards.mockClear();
  });

  it('非 Admin + 业务组为空数组：getAlertCards 一次都不被调（改之前这条会失败）', async () => {
    const { container } = renderCard(['Standard'], []);
    await waitFor(() => expect(container.querySelector('.card-left-stub')).toBeTruthy());
    // reloadCard 是 useDebounceFn(wait: 500)（card.tsx `:86-88`），只等渲染完就断言是假绿，要等过防抖窗口
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(mockGetAlertCards).not.toHaveBeenCalled();
  });

  it('非 Admin + 有两个业务组：照常调一次，gid 是那两个 id', async () => {
    renderCard(['Standard'], [{ id: 1, name: 'g1' }, { id: 2, name: 'g2' }]);
    await waitFor(() => expect(mockGetAlertCards).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(mockGetAlertCards.mock.calls[0][0]).toMatchObject({ gid: '1,2' });
  });

  it('Admin + 业务组为空：仍然照常调（后端允许 Admin 带空 gid，行为不变）', async () => {
    renderCard(['Admin'], []);
    await waitFor(() => expect(mockGetAlertCards).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(mockGetAlertCards.mock.calls[0][0]).toMatchObject({ gid: '' });
  });
});
