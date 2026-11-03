/**
 * `@/App` 的替身。
 *
 * 为什么要替：src/App.tsx 会 import './routers'，等于把整个前端的路由树全拉进来
 * （echarts、codemirror、x6、react-markdown …），在 jest 里既慢又容易炸。
 * 但一大批组件只是想拿它导出的 CommonStateContext（比如
 * src/components/AdvancedWrap/index.tsx:3、src/components/pageLayout/index.tsx:25、
 * src/pages/datasource/components/SourceCards/index.tsx:6）。
 * 所以造一个只有 Context 的假模块顶上。
 *
 * 用法（写在测试文件顶部，jest.mock 会被 ts-jest 提到 import 之前）：
 *   jest.mock('@/App', () => require('../helpers/appMock'));
 */
import React from 'react';

export const defaultCommonState: any = {
  profile: {
    admin: true,
    nickname: 'step6d-tester',
    role: 'Admin',
    roles: ['Admin'],
    username: 'step6d',
    email: '',
    phone: '',
    id: 1,
    portrait: '',
  },
  licenseExpired: false,
  licenseRulesRemaining: false,
  isPlus: false,
  darkMode: false,
  busiGroups: [],
  curBusiId: 0,
  datasourceList: [],
  groupedDatasourceList: {},
  datasourceCateOptions: [],
  perms: [],
  // src/pages/datasource/components/SourceCards/index.tsx:17 直接 permList.includes(...)，缺了会炸
  permList: [],
  profileLoaded: true,
  siteInfo: {},
  versions: { version: 'test', github_verison: 'test', newVersion: false },
  feats: { fcBrain: false, plugins: [] },
};

export const CommonStateContext = React.createContext<any>(defaultCommonState);

export const initTheme = {
  title: '一体化综合运维管理平台',
  logo: '/image/topmenu/favicon.png',
  icon: '/image/plticon.png',
};

export default function App() {
  return null;
}
