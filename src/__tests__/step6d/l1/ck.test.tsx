/**
 * L1 · ck（ClickHouse）数据源表单：填最小必填项 → 提交 → 断言请求体。
 *
 * 类型名是 **ck** 不是 clickhouse（后端 models/alert_rule.go:40 `CLICKHOUSE = "ck"`，
 * 见 `来自后端侧的交接-多数据源前端待办-2026-09-07.md` 3.0(b) 坑二）。
 * 后端待办第三节只写了八种类型、没有 ck 的字段表（ck 属于「已有的」），所以这里的字段判据取 fe v9.1.0
 * `src/plugins/clickHouse/Datasource/Form.tsx`：字段全在 settings 里、key 带 `ck.` 前缀，
 * 节点是数组 `ck.nodes`，协议默认 native，密码在 `settings['ck.password']`、不走 AES（本轮明文）。
 * 另外 ck 在 pub 包装层的「没填集群名先弹个确认框」名单里（src/pages/datasource/Form.tsx:122），
 * 所以要先点掉那个确认框才会真的发请求。
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

describe('L1：ck（ClickHouse）数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('提交后 plugin_type=ck，节点在 settings["ck.nodes"] 数组里', async () => {
    const { container } = renderForm('ck');

    setInput(container, 'name', 'ck_test_ds');
    setInput(container, 'settings_ck.nodes_0', '127.0.0.1:9000');
    setInput(container, 'settings_ck.user', 'default');
    setInput(container, 'settings_ck.password', 'p@ssw0rd');

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    // 没填集群名 → 包装层先弹二次确认，点掉它
    await waitFor(() => {
      expect(document.querySelector('.ant-modal-confirm-btns')).toBeTruthy();
    });
    fireEvent.click(document.querySelector('.ant-modal-confirm-btns .ant-btn-primary') as HTMLButtonElement);

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][ck] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/takin/datasource/upsert');
    expect(body.plugin_type).toBe('ck');
    expect(body.name).toBe('ck_test_ds');
    expect(body.settings['ck.nodes']).toEqual(['127.0.0.1:9000']);
    expect(body.settings['ck.protocol']).toBe('native');
    expect(body.settings['ck.user']).toBe('default');
    // 明文，不带 {{cipher}} 前缀
    expect(body.settings['ck.password']).toBe('p@ssw0rd');
    expect(body.settings['ck.secure_connection']).toBe(false);
    expect(body.settings['ck.max_query_rows']).toBe(500);
    expect(body.settings['ck.timeout']).toBe(100000);
  });

  it('节点地址没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm('ck');
    setInput(container, 'name', 'ck_test_ds');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(upsertCalls().length).toBe(0);
  });
});
