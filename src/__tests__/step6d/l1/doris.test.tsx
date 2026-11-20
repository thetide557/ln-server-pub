/**
 * L1 · doris 数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.3：
 * doris 走 `else` 分支，字段写在 settings 里、key 带 `doris.` 前缀，而且**不是数组**、直接平铺。
 * 密码在 `settings['doris.password']`，**不走 AES**（待办 3.0(c)，本轮明文）。
 * 待办里 doris 有 14 个字段，fe v9.1.0 的表单只放了其中一部分（没有 internal_addr / fe_addr /
 * cluster_name / enable_write / user_write / password_write）——照拍板「fe 原样搬」，差异登记在拿不准-L1.md。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import request from '@/utils/request';
import '@/i18n';
import '@/pages/datasource/locale';
import DatasourceFormPage from '@/pages/datasource/Form';
// N36 批 C：数据源表单测试共用的 request 假实现 + 「等集群项自动填好」的小工具，原由见该文件头注释
import { datasourceRequestImpl, waitClusterAutoFilled, AUTO_FILLED_CLUSTER } from '../helpers/datasourceFormHelpers';

const requestMock = request as unknown as jest.Mock;

function upsertCalls() {
  return requestMock.mock.calls.filter((c) => String(c[0]).includes('datasource/upsert'));
}

function renderForm(type: string) {
  return render(
    <MemoryRouter initialEntries={[`/help/source/add/${type}`]}>
      <Route path='/help/source/:action/:type/:id?'>
        <DatasourceFormPage />
      </Route>
    </MemoryRouter>,
  );
}

function setInput(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`[id="${id}"]`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('L1：doris 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    // N36 批 C：换成按 URL 分流的假实现，让 GET /api/takin/server-clusters 返回一个真列表。
    // 原来一律返回 {}，items/Cluster.tsx 的集群项既填不进值、校验规则又判它无效，
    // 整张表单永远提交不出去——这是 N28 U-N28-3 那 8 红的第一层原因。
    requestMock.mockImplementation(datasourceRequestImpl);
  });

  it('提交后 plugin_type=doris，字段平铺在 settings 里、key 带 doris. 前缀', async () => {
    const { container } = renderForm('doris');

    setInput(container, 'name', 'doris_test_ds');
    setInput(container, 'settings_doris.addr', '127.0.0.1:9030');
    setInput(container, 'settings_doris.user', 'root');
    setInput(container, 'settings_doris.password', 'p@ssw0rd');

    // N36 批 C：先等「告警引擎集群」这一项被 items/Cluster.tsx 自动填好，再点提交。
    // 不等的话点下去那一刻 cluster_name 还是空的（那个 .then 是微任务，排不进同步语句之间），
    // Cluster.tsx:31-37 的校验规则会把整张表单拦住、onFinish 根本不跑——8 红的第二层原因。
    await waitClusterAutoFilled(container);

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][doris] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/takin/datasource/upsert');
    expect(body.plugin_type).toBe('doris');
    // N36 批 C：集群名由 items/Cluster.tsx 自动填，提交体里会带上它
    expect(body.cluster_name).toBe(AUTO_FILLED_CLUSTER);
    expect(body.name).toBe('doris_test_ds');
    expect(body.settings['doris.addr']).toBe('127.0.0.1:9030');
    expect(body.settings['doris.user']).toBe('root');
    expect(body.settings['doris.password']).toBe('p@ssw0rd');
    expect(body.settings['doris.timeout']).toBe(100000);
    expect(body.settings['doris.max_query_rows']).toBe(500);
    // 不是数组结构
    expect(body.settings['doris.shards']).toBeUndefined();
  });

  it('地址没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('doris');
    setInput(container, 'name', 'doris_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
