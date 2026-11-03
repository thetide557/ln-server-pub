/**
 * N33 批 A-3（lead 拍板 L-09 / L-10）· 仪表盘「数据源类型」下拉的准入门。
 *
 * 要证的事：opensearch 不该出现在这个下拉里，而羚牛已经接好的那几种一个都不许少。
 *
 * 背景（N29 结论正本 A-4、`n29/前端补充-opensearch.md` N-os-01）：
 * 这个下拉原来只筛 `!!item.dashboard`，于是 opensearch（准入表里 `dashboard: true`）也进了下拉；
 * 可是本仓库的查询编辑器没有 opensearch 分支（`QueryEditor/index.tsx` 落兜底 `<Monitoring/>` = PromQL 框），
 * 取数时 `fetchQueryMap['opensearch']` 是 undefined，`fetchQueryMap[cate](props)` 直接抛「不是函数」。
 *
 * 上游 fe 的门是 `dashboard === true && (graphPro ? IS_PLUS : true)`
 * （fe v9.1.0 同文件 :55）。**照抄会出事**：羚牛准入表里 `graphPro: true` 的有五个
 * ——ck / doris / mysql / pgsql / opensearch——前四个羚牛已经把实现搬进来了，照抄会把它们一起挡掉。
 * 所以 N33-A 用的是「白名单先放行 + 其余走上游那道门」（写法照
 * `src/pages/logExplorer/utils/datasourceAvailability.ts:25-27`，拍板 M239 ②）。
 *
 * 这个用例就是把上面那句话钉死：白名单里的四种在、opensearch 不在。
 * 用真实的 `baseCates`（不是手写的假表），所以将来谁动了准入表里的 `dashboard` / `graphPro`，这里会红。
 *
 * mock 写法照 `src/__tests__/step6d/l4/dsqueries.render.test.tsx`。
 */
import React from 'react';
import { Form } from 'antd';
import { render, fireEvent, waitFor } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/
jest.mock('antd/es/form/context', () => require('antd/lib/form/context'));

// src/App.tsx 会把整个路由树拉进来，这里只要它导出的 CommonStateContext
jest.mock('@/App', () => require('../helpers/appMock'));
// 被测组件只从这个入口取一个 ProSvg 图标组件，而这个入口会顺带拉进一整套数据源选择器
jest.mock('@/components/DatasourceSelect', () => ({
  __esModule: true,
  ProSvg: () => null,
}));

import '@/i18n';

import { CommonStateContext } from '@/App';
import { baseCates } from '@/components/AdvancedWrap/utils';
import DatasourceSelect from '@/pages/dashboard/Editor/QueryEditor/components/DatasourceSelect';

/** 每种类型都给一条实例，免得「下拉里没有实例」影响渲染 */
const groupedDatasourceList: Record<string, any[]> = {};
baseCates.forEach((cate, idx) => {
  groupedDatasourceList[cate.value] = [{ id: 100 + idx, name: `${cate.value}-ds`, plugin_type: cate.value }];
});

const commonState: any = {
  ...require('../helpers/appMock').defaultCommonState,
  // 用真实的准入表，不手写假数据
  datasourceCateOptions: baseCates,
  groupedDatasourceList,
};

function renderSelect() {
  const Wrapper = () => {
    const [form] = Form.useForm();
    return (
      <CommonStateContext.Provider value={commonState}>
        <Form form={form}>
          <DatasourceSelect chartForm={form} variableConfig={[]} />
        </Form>
      </CommonStateContext.Provider>
    );
  };
  return render(<Wrapper />);
}

/** 打开「数据源类型」那个下拉（它是页面上第一个 Select），把选项的文字读回来 */
async function openCateDropdownAndReadOptions(container: HTMLElement) {
  const selector = container.querySelectorAll('.ant-select-selector')[0] as HTMLElement;
  expect(selector).toBeTruthy();
  fireEvent.mouseDown(selector);
  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
  });
  return Array.from(document.querySelectorAll('.ant-select-item-option')).map((el) => (el.textContent || '').trim());
}

describe('N33-A · 仪表盘数据源类型下拉的准入门', () => {
  it('渲染不抛异常', () => {
    expect(() => renderSelect()).not.toThrow();
  });

  it('羚牛已经接好的八种都在下拉里（含 graphPro 白名单那四种）', async () => {
    const { container } = renderSelect();
    const options = await openCateDropdownAndReadOptions(container);

    // 上游 graphPro:false、羚牛本来就有的
    expect(options).toContain('Prometheus');
    expect(options).toContain('Elasticsearch');
    expect(options).toContain('IoTDB');
    expect(options).toContain('TDengine');
    // 上游 graphPro:true，但羚牛把实现搬进来了 → 靠 DASHBOARD_SUPPORTED_PRO_CATES 白名单放行。
    // 这四条就是「不许照抄 fe 那一行」的证据：照抄的话它们会一起消失。
    expect(options).toContain('ClickHouse');
    expect(options).toContain('Doris');
    expect(options).toContain('MySQL');
    expect(options).toContain('PostgreSQL');
  });

  it('opensearch 不在下拉里（本批要修的就是它）', async () => {
    const { container } = renderSelect();
    const options = await openCateDropdownAndReadOptions(container);
    expect(options).not.toContain('OpenSearch');
  });

  it('loki / victorialogs 也不在（它们在准入表里本来就是 dashboard:false）', async () => {
    const { container } = renderSelect();
    const options = await openCateDropdownAndReadOptions(container);
    expect(options).not.toContain('Loki');
    expect(options).not.toContain('VictoriaLogs');
  });
});
