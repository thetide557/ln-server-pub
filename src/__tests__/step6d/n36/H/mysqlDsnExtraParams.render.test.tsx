/**
 * N36 批 H1 第 1 条：mysql 数据源表单要带 `mysql.dsn_extra_params`，默认 `loc=Local`。
 *
 * 背景（后端第九份第二节 1，`A-MYSQL-DSN-LOC-01`）：界面建的 mysql 数据源，查出来的时间戳整体 +8 小时。
 * 原因是 go-sql-driver 不带 `loc` 参数时按 UTC 解析 DATETIME。后端收的键是**分片级**的
 * `settings['mysql.shards'][i]['mysql.dsn_extra_params']`（`ln-server/dskit/mysql/mysql.go:37`），
 * 原样拼进 DSN 的 query 片段（`dskit/mysql/dsn_params.go:18-52`）。上游 fe `ee48e701` 全仓
 * `git grep dsn_extra_params` 零命中 → 上游没有这一栏，按后端键名自加（lead 预拍 D-N36-18）。
 *
 * 写法照 `../../l1/mysql.test.tsx`（同一套渲染 + 等集群自动填好 + 断言 upsert 请求体）。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('@/App', () => require('../../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import request from '@/utils/request';
import '@/i18n';
import '@/pages/datasource/locale';
import DatasourceFormPage from '@/pages/datasource/Form';
import { datasourceRequestImpl, waitClusterAutoFilled } from '../../helpers/datasourceFormHelpers';

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

describe('N36 批 H1 第 1 条 · mysql 表单的 dsn_extra_params', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(datasourceRequestImpl);
  });

  it('一个字不填，提交体里 settings["mysql.shards"][0]["mysql.dsn_extra_params"] 就是 loc=Local', async () => {
    const { container } = renderForm('mysql');

    setInput(container, 'name', 'mysql_tz_ds');
    setInput(container, 'settings_mysql.shards_0_mysql.addr', '127.0.0.1:3306');
    setInput(container, 'settings_mysql.shards_0_mysql.user', 'root');
    setInput(container, 'settings_mysql.shards_0_mysql.password', 'p@ssw0rd');

    await waitClusterAutoFilled(container);
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const body = upsertCalls()[0][1].data;
    const shards = body.settings['mysql.shards'];
    expect(shards[0]['mysql.dsn_extra_params']).toBe('loc=Local');
  });

  it('手填别的值时按填的发（不会被默认值顶掉）', async () => {
    const { container } = renderForm('mysql');

    setInput(container, 'name', 'mysql_tz_ds2');
    setInput(container, 'settings_mysql.shards_0_mysql.addr', '127.0.0.1:3306');
    setInput(container, 'settings_mysql.shards_0_mysql.user', 'root');
    setInput(container, 'settings_mysql.shards_0_mysql.password', 'p@ssw0rd');
    setInput(container, 'settings_mysql.shards_0_mysql.dsn_extra_params', 'loc=Asia%2FShanghai&readTimeout=30s');

    await waitClusterAutoFilled(container);
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const body = upsertCalls()[0][1].data;
    expect(body.settings['mysql.shards'][0]['mysql.dsn_extra_params']).toBe('loc=Asia%2FShanghai&readTimeout=30s');
  });
});
