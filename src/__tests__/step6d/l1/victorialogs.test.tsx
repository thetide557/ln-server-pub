/**
 * L1 · victorialogs 数据源表单：填字段 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.6：
 * victorialogs 走 `else` 分支，字段写在 settings 里、key 带 `victorialogs.` 前缀；
 * 账号密码在 `victorialogs.basic` 这一层、**不走 AES**（待办 3.0(c)，本轮明文）；
 * 跳过证书校验在 `victorialogs.tls` 里。
 * 两个初值和后端兜底值不一样，这是待办 3.6 明说过的、不是 bug：
 *   timeout 表单初值 10000 = 后端兜底 10000；max_query_rows 表单初值 500、后端兜底 1000。
 * 这一类的 headers 是能被包装层转成对象的（cate 就等于类型名 victorialogs，见拍板-01）。
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

describe('L1：victorialogs 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后 plugin_type=victorialogs，地址与账号都在 settings 里、key 带 victorialogs. 前缀', async () => {
    const { container } = renderForm('victorialogs');

    setInput(container, 'name', 'vl_test_ds');
    setInput(container, 'settings_victorialogs.addr', 'http://127.0.0.1:9428/');
    setInput(container, 'settings_victorialogs.basic_victorialogs.user', 'vluser');
    setInput(container, 'settings_victorialogs.basic_victorialogs.password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][victorialogs] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(body.plugin_type).toBe('victorialogs');
    expect(body.name).toBe('vl_test_ds');
    expect(body.settings['victorialogs.addr']).toBe('http://127.0.0.1:9428/');
    expect(body.settings['victorialogs.basic']['victorialogs.user']).toBe('vluser');
    // 明文，不带 {{cipher}} 前缀
    expect(body.settings['victorialogs.basic']['victorialogs.password']).toBe('p@ssw0rd');
    expect(body.settings['victorialogs.basic']['victorialogs.is_encrypt']).toBe(false);
    expect(body.settings['victorialogs.timeout']).toBe(10000);
    expect(body.settings['victorialogs.max_query_rows']).toBe(500);
  });

  it('填了自定义 header，提交前被包装层转成对象（拍板-01 加的那个 if 块）', async () => {
    const { container } = renderForm('victorialogs');

    setInput(container, 'name', 'vl_test_ds');
    setInput(container, 'settings_victorialogs.addr', 'http://127.0.0.1:9428/');

    // 这张表单上只有 itemsNG/Headers 一个「加一行」的加号
    const plusIcons = container.querySelectorAll('.anticon-plus-circle');
    expect(plusIcons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(plusIcons[0]);

    await waitFor(() => {
      expect(container.querySelector('[id="settings_victorialogs.headers_0_key"]')).toBeTruthy();
    });
    setInput(container, 'settings_victorialogs.headers_0_key', 'X-Tenant');
    setInput(container, 'settings_victorialogs.headers_0_value', 'lingniu');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const body = upsertCalls()[0][1].data;
    // 表单里是 [{key,value}] 数组，发出去是对象——包装层新加的 if 块干的活
    expect(body.settings['victorialogs.headers']).toEqual({ 'X-Tenant': 'lingniu' });
  });
});
