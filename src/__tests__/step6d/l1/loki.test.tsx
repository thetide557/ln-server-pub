/**
 * L1 · loki 数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.5：
 * loki 在后端有专门的映射函数（dscache/sync.go:214-234），所以字段填在**顶层** http.* / auth.*，
 * 由后端翻译成 loki.addr / loki.basic.loki.user 之类，前端不用自己拼 settings。
 * 密码走羚牛的 AES 那一对（src/pages/datasource/services.ts:45-48 加密，后端 DealWithDecrypt 解）。
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

/** 页面挂载时 items/Cluster 会先打一发 /api/takin/server-clusters，
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

describe('L1：loki 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后打到 datasource/upsert，plugin_type=loki，地址在 http.url、密码在 auth 里且已加密', async () => {
    const { container } = renderForm('loki');

    expect(container.querySelector('#name')).toBeTruthy();
    expect(container.querySelector('#http_url')).toBeTruthy();

    setInput(container, 'name', 'loki_test_ds');
    setInput(container, 'http_url', 'http://127.0.0.1:3100');
    setInput(container, 'auth_basic_auth_user', 'lokiuser');
    setInput(container, 'auth_basic_auth_password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][loki] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/takin/datasource/upsert');
    expect(options.method).toBe('Post');
    expect(body.plugin_type).toBe('loki');
    expect(body.name).toBe('loki_test_ds');
    expect(body.http.url).toBe('http://127.0.0.1:3100');
    expect(body.http.timeout).toBe(10000);
    expect(body.auth.basic_auth_user).toBe('lokiuser');
    expect(typeof body.auth.basic_auth_password).toBe('string');
    expect(body.auth.basic_auth_password.startsWith('{{cipher}}')).toBe(true);
    expect(body.is_enable).toBe(true);
    expect(body.is_test).toBe(true);
  });

  it('URL 没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('loki');
    setInput(container, 'name', 'loki_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
