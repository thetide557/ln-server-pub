/**
 * 样板测试 B —— 列表页「服务端渲染一遍，不抛异常」的冒烟测试。
 *
 * 用 react-dom/server 的 renderToString，好处是不跑 useEffect、不发请求、不碰定时器，
 * 只要页面组件树里有一处 import 错、context 少了字段、组件签名对不上，就会立刻抛出来。
 * 后面搬完一个新数据源、往列表页 / 详情页里加东西，照这个抄一份就能挡住「白屏级」的低级错。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

// 同样三行：@/App 太重换掉；列表页会调的 services 全部换成空数据
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/pages/datasource/services', () => ({
  __esModule: true,
  getDataSourcePluginList: jest.fn(() => Promise.resolve([])),
  getDataSourceList: jest.fn(() => Promise.resolve([])),
  getDataSourceDetailById: jest.fn(() => Promise.resolve({})),
  submitRequest: jest.fn(() => Promise.resolve({})),
  updateDataSourceStatus: jest.fn(() => Promise.resolve({})),
  deleteDataSourceById: jest.fn(() => Promise.resolve({})),
  getServerClusters: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import '@/i18n';
import '@/pages/datasource/locale';
import DatasourceListPage from '@/pages/datasource';

describe('样板 B：数据源列表页 renderToString 冒烟', () => {
  it('整棵组件树能渲染出字符串，不抛异常', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        <StaticRouter location='/help/source'>
          <DatasourceListPage />
        </StaticRouter>,
      );
    }).not.toThrow();

    expect(html.length).toBeGreaterThan(0);
    // PageLayout 的外壳
    expect(html).toContain('page-wrapper');
    // 列表页自己的容器 div（src/pages/datasource/index.tsx 里的 <div className='srm'>）
    expect(html).toContain('srm');
    // i18n 词条确实翻出来了（src/pages/datasource/locale/zh_CN.ts:2 title / :3 list_title）
    expect(html).toContain('数据源管理');
    expect(html).toContain('已接入的数据源');
  });
});
