/**
 * L1 · opensearch 数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.4：
 * opensearch 走 `else` 分支，字段写在 settings 里、key 带 `os.` 前缀（不是 `opensearch.`）；
 * 节点是数组 `os.nodes`（后端 Validate 判的就是它）；用户名密码在 `os.basic` 这一层里、
 * **不走 AES**（待办 3.0(c)，本轮明文）；跳过证书校验在 `os.tls` 里。
 * 版本必须 2.x（后端 Validate 直接卡 `strings.HasPrefix(os.Version,"2")`），fe 表单做成了只有 2.0+ 的下拉。
 * 另：headers 填在 settings['os.headers']，表单里是 [{key,value}] 数组，
 * 由包装层 src/pages/datasource/Form.tsx 新加的那个 if 块转成对象再发（拍板-01）。
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

describe('L1：opensearch 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后 plugin_type=opensearch，节点在 settings["os.nodes"] 数组里，账号在 os.basic 里', async () => {
    const { container } = renderForm('opensearch');

    setInput(container, 'name', 'os_test_ds');
    setInput(container, 'settings_os.nodes_0', 'http://127.0.0.1:9200');
    setInput(container, 'settings_os.basic_os.user', 'admin');
    setInput(container, 'settings_os.basic_os.password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][opensearch] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(body.plugin_type).toBe('opensearch');
    expect(body.name).toBe('os_test_ds');
    expect(body.settings['os.nodes']).toEqual(['http://127.0.0.1:9200']);
    expect(body.settings['os.basic']['os.user']).toBe('admin');
    // 明文，不带 {{cipher}} 前缀
    expect(body.settings['os.basic']['os.password']).toBe('p@ssw0rd');
    expect(body.settings['os.version']).toBe('2.0+');
    expect(body.settings['os.max_shard']).toBe(5);
    expect(body.settings['os.min_interval']).toBe(10);
    expect(typeof body.settings['os.timeout']).toBe('number');
  });

  // 注意这条用例锁的是「和 fe v9.1.0 一模一样的现状」，不是「正确行为」：
  // opensearch 的 settings 前缀是 os.，而包装层那个 if 块看的是 `${plugin_type}.headers`（= opensearch.headers），
  // 两边对不上，所以 header 是以 [{key,value}] 数组原样发出去的，没被转成对象。
  // fe v9.1.0 和 fe 最新 HEAD 都是这个写法（未查到官方修复），本轮按「原生迁移」保持一致，
  // 登记在 拿不准-L1.md #1，等用户 / 后端拍板。
  it('填了自定义 header：现状是原样发数组（与 fe v9.1.0 一致，见 拿不准-L1.md #1）', async () => {
    const { container } = renderForm('opensearch');

    setInput(container, 'name', 'os_test_ds');
    setInput(container, 'settings_os.nodes_0', 'http://127.0.0.1:9200');

    // 页面上有两个「加一行」的加号：第一个是 HTTPList 的节点，第二个是 itemsNG/Headers 的 header
    const plusIcons = container.querySelectorAll('.anticon-plus-circle');
    expect(plusIcons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(plusIcons[1]);

    await waitFor(() => {
      expect(container.querySelector('[id="settings_os.headers_0_key"]')).toBeTruthy();
    });
    setInput(container, 'settings_os.headers_0_key', 'X-Tenant');
    setInput(container, 'settings_os.headers_0_value', 'lingniu');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const body = upsertCalls()[0][1].data;
    expect(body.settings['os.headers']).toEqual([{ key: 'X-Tenant', value: 'lingniu' }]);
    // 对照：如果哪天口径改成「必须转成对象」，把上面一行换成下面这行即可
    // expect(body.settings['os.headers']).toEqual({ 'X-Tenant': 'lingniu' });
  });

  it('节点地址没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('opensearch');
    setInput(container, 'name', 'os_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
