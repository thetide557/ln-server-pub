/**
 * L1 · pgsql（PostgreSQL）数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 判据来自 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.2：
 * 类型名是 **pgsql** 不是 postgresql（后端 models/alert_rule.go:36 `POSTGRESQL = "pgsql"`）；
 * 走 `else` 分支，字段写在 settings 里、key 带 `pgsql.` 前缀；插件层是 `Shards []*postgres.PostgreSQL`，
 * 所以 `settings['pgsql.shards']` 是**数组**。密码在 settings 里，**不走 AES**（待办 3.0(c)，本轮明文）。
 * 表单用的是共享的 src/components/DBSettings/{Conn,Shard}（fe v9.1.0 原样），和 mysql 那套长得几乎一样。
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

/** 分片字段的 id 里自带点（settings_pgsql.shards_0_pgsql.addr），用属性选择器省得转义 */
function setInput(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`[id="${id}"]`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('L1：pgsql 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后 plugin_type=pgsql，连接信息在 settings["pgsql.shards"] 数组第一项里', async () => {
    const { container } = renderForm('pgsql');

    // 顺带证明 n9e-mysql 这个命名空间的词条挂上了（src/plugins/mysql/locale/index.ts 改成了 pub 的注册写法）：
    // 分片那几个输入框的 label 是 t('n9e-mysql:datasource.shards.addr') 之类
    expect(container.textContent).toContain('数据库地址');

    setInput(container, 'name', 'pgsql_test_ds');
    setInput(container, 'settings_pgsql.shards_0_pgsql.addr', '127.0.0.1:5432');
    setInput(container, 'settings_pgsql.shards_0_pgsql.user', 'root');
    setInput(container, 'settings_pgsql.shards_0_pgsql.password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][pgsql] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(body.plugin_type).toBe('pgsql');
    expect(body.name).toBe('pgsql_test_ds');

    const shards = body.settings['pgsql.shards'];
    expect(Array.isArray(shards)).toBe(true);
    expect(shards.length).toBe(1);
    expect(shards[0]['pgsql.addr']).toBe('127.0.0.1:5432');
    expect(shards[0]['pgsql.user']).toBe('root');
    // 明文，不带 {{cipher}} 前缀
    expect(shards[0]['pgsql.password']).toBe('p@ssw0rd');
    expect(shards[0]['pgsql.max_query_rows']).toBe(500);
    expect(shards[0]['pgsql.timeout']).toBe(60);
    // 顶层的 http / auth 里不该有连接信息
    expect(body.auth).toBeUndefined();
  });

  it('地址没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('pgsql');
    setInput(container, 'name', 'pgsql_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
