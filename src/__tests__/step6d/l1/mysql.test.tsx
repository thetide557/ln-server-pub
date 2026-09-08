/**
 * L1 · mysql 数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.1：
 * mysql 在后端走 `else` 分支（dscache/sync.go:168-173 原样拷 SettingsJson），所以字段全写在 settings 里、
 * key 带 `mysql.` 前缀；而且插件层是 `Shards []Shard`，所以 `settings['mysql.shards']` 是**数组**，至少一项。
 * 密码在 `settings['mysql.shards'][0]['mysql.password']` 里，**不走 AES**——羚牛的 AES 那一对只覆盖
 * `auth.basic_auth_password`（待办 3.0(c)），所以这里断言的是明文（本轮默认值①，要不要加密由用户拍板）。
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

/** 分片字段的 id 里自带点（settings_mysql.shards_0_mysql.addr），用属性选择器省得转义 */
function setInput(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`[id="${id}"]`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('L1：mysql 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后 plugin_type=mysql，连接信息在 settings["mysql.shards"] 数组第一项里', async () => {
    const { container } = renderForm('mysql');

    // 顺带证明 n9e-mysql 这个命名空间的词条挂上了（src/plugins/mysql/locale/index.ts 改成了 pub 的注册写法）：
    // 分片那几个输入框的 label 是 t('n9e-mysql:datasource.shards.addr') 之类
    expect(container.textContent).toContain('数据库地址');

    setInput(container, 'name', 'mysql_test_ds');
    setInput(container, 'settings_mysql.shards_0_mysql.addr', '127.0.0.1:3306');
    setInput(container, 'settings_mysql.shards_0_mysql.user', 'root');
    setInput(container, 'settings_mysql.shards_0_mysql.password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][mysql] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(body.plugin_type).toBe('mysql');
    expect(body.name).toBe('mysql_test_ds');

    const shards = body.settings['mysql.shards'];
    expect(Array.isArray(shards)).toBe(true);
    expect(shards.length).toBe(1);
    expect(shards[0]['mysql.addr']).toBe('127.0.0.1:3306');
    expect(shards[0]['mysql.user']).toBe('root');
    // 明文，不带 {{cipher}} 前缀
    expect(shards[0]['mysql.password']).toBe('p@ssw0rd');
    expect(shards[0]['mysql.max_query_rows']).toBe(500);
    expect(shards[0]['mysql.timeout']).toBe(60);
    // 顶层的 http / auth 里不该有连接信息
    expect(body.auth).toBeUndefined();
  });

  it('地址没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('mysql');
    setInput(container, 'name', 'mysql_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
