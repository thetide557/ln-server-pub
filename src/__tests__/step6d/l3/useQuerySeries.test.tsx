/**
 * 第六步 L3 · pub 的 useQuery 把 fe 的 `{ series, query }` 拆成数组这件事，得有测试盯着。
 *
 * 背景（顾问意见 X-6 (b)）：pub `src/pages/dashboard/Renderer/datasource/useQuery.tsx:65`
 * 写的是 `.then((res: any[]) => setSeries(res))`，期望拿到**数组**；
 * 而 fe 的 `plugins/<t>/Dashboard/datasource.tsx` 返回的是 `{ series, query }` **对象**。
 * 所以接线时每条 map 都包了一层 `.then((r) => r.series)`。
 * 这一层要是哪天被人顺手删掉，图表会变成空白但不报错——静默故障，必须锁住。
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

// pub 自带的三个取数模块跟本测试无关，但 elasticsearch 那条会把 @antv/g2 的 TS 源码拖进来（jest 不转译 node_modules），
// 所以一并换成空实现。路径写成 @/… 与 useQuery 里的 './xxx' 解析到同一个文件，jest 的模块表按解析后的真实路径认。
jest.mock('@/pages/dashboard/Renderer/datasource/prometheus', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/pages/dashboard/Renderer/datasource/elasticsearch', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/pages/dashboard/Renderer/datasource/apiservice', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve([])) }));

// 关键的一条：让 tdengine 的取数函数返回 fe 的原始形状 { series, query }
const tdengineRaw = { series: [1], query: [{ url: '/api/takin/query-range-batch' }] };
jest.mock('@/plugins/TDengine/Dashboard/datasource', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve(tdengineRaw)),
}));
jest.mock('@/plugins/iotdb/Dashboard/datasource', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ series: [], query: [] })),
}));
jest.mock('@/plugins/clickHouse/Dashboard/datasource', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ series: [], query: [] })),
}));

// 先把 i18n 初始化好：useQuery 链上的 TimeRangePicker 的 locale/index.ts 一进来就调 i18next.addResourceBundle
import '@/i18n';

import useQuery from '@/pages/dashboard/Renderer/datasource/useQuery';
import tdengineQuery from '@/plugins/TDengine/Dashboard/datasource';

let captured: any = null;

function Probe() {
  const res = useQuery({
    dashboardId: 'test-dashboard',
    datasourceCate: 'tdengine',
    datasourceValue: 1,
    time: { start: 'now-1h', end: 'now' },
    targets: [{ refId: 'A' } as any],
    inViewPort: true,
  });
  captured = res;
  return <div data-testid='probe'>{JSON.stringify(res.series)}</div>;
}

describe('L3：useQuery 里三条 map 会把 { series, query } 拆成 series 数组', () => {
  beforeEach(() => {
    captured = null;
  });

  it('cate=tdengine 时，插件返回对象，useQuery 交给图表的是数组', async () => {
    render(<Probe />);
    // useQuery 用 ahooks 的 useDebounceFn（wait 500），等它跑完
    await waitFor(
      () => {
        expect(captured?.series).toEqual([1]);
      },
      { timeout: 5000 },
    );
    expect(tdengineQuery).toHaveBeenCalledTimes(1);
    // 传进去的就是 useQuery 收到的整个 props（fe 的 datasource.tsx 只取 datasourceValue / time / targets）
    const passed = (tdengineQuery as unknown as jest.Mock).mock.calls[0][0];
    expect(passed.datasourceValue).toBe(1);
    expect(passed.targets).toEqual([{ refId: 'A' }]);
    // 对象里的 query 字段被丢掉了（pub 没有「查询详情」面板），不会混进 series
    expect(captured?.series).not.toContainEqual(tdengineRaw.query[0]);
    expect(captured?.error).toBe('');
  });

  it('源码里三条 map 都带着 .then((r: any) => r.series) 这层包装', () => {
    // 静态兜底：万一将来 useQuery 的实现改成别的写法，上面那条动态用例可能失效，这里直接盯源码。
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../../pages/dashboard/Renderer/datasource/useQuery.tsx'), 'utf8');
    expect(src).toContain('iotdb: (p) => iotdbQuery(p).then((r: any) => r.series)');
    expect(src).toContain('tdengine: (p) => tdengineQuery(p).then((r: any) => r.series)');
    expect(src).toContain('ck: (p) => ckQuery(p).then((r: any) => r.series)');
  });
});
