/**
 * L1 · tdengine 数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.7：
 * tdengine 后端有映射函数（dscache/sync.go:185-197），字段填在**顶层** http.* / auth.*，
 * 后端翻成 tdengine.addr / tdengine.basic.tdengine.user；密码走羚牛的 AES 那一对。
 * 待办 3.7 提到 dskit 里还有 tdengine.token / tdengine.skip_tls_verify 两个 key 后端没有映射路径，
 * 表单里也没有对应输入框（fe v9.1.0 原样如此，本轮不动，见拿不准-L1.md）。
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

/** 页面挂载时 items/Cluster 会先打一发 /api/n9e/server-clusters，
 *  所以不能直接取 mock.calls[0]，要按 url 把 upsert 那一发挑出来 */
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

/** antd 给嵌套 name 生成的 id 用下划线连接，且可能自带点（如 settings_mysql.shards_0_mysql.addr），
 *  所以用属性选择器而不是 #id，省得转义 */
function setInput(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`[id="${id}"]`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('L1：tdengine 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后打到 datasource/upsert，plugin_type=tdengine，地址在 http.url、密码在 auth 里且已加密', async () => {
    const { container } = renderForm('tdengine');

    expect(container.querySelector('#name')).toBeTruthy();
    expect(container.querySelector('#http_url')).toBeTruthy();

    setInput(container, 'name', 'td_test_ds');
    setInput(container, 'http_url', 'http://127.0.0.1:6041');
    setInput(container, 'auth_basic_auth_user', 'root');
    setInput(container, 'auth_basic_auth_password', 'taosdata');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][tdengine] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(options.method).toBe('Post');
    expect(body.plugin_type).toBe('tdengine');
    expect(body.name).toBe('td_test_ds');
    expect(body.http.url).toBe('http://127.0.0.1:6041');
    expect(body.http.timeout).toBe(10000);
    expect(body.auth.basic_auth_user).toBe('root');
    expect(typeof body.auth.basic_auth_password).toBe('string');
    expect(body.auth.basic_auth_password.startsWith('{{cipher}}')).toBe(true);
    expect(body.is_enable).toBe(true);
    expect(body.is_test).toBe(true);
  });

  it('URL 没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('tdengine');
    setInput(container, 'name', 'td_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
