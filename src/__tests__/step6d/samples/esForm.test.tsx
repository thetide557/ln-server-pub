/**
 * 样板测试 A —— 数据源表单「填字段 → 提交 → 断言请求体」。
 *
 * 后面每搬一张数据源表单（ClickHouse / InfluxDB / OpenSearch …）都照这个抄：
 *   1. 顶部三个 jest.mock（@/App、@/utils/request、可选的 plus 模块）；
 *   2. 用 MemoryRouter + Route 把 URL 参数（action / type）喂给 useParams；
 *   3. 按 antd 自动生成的 input id 填字段（嵌套字段名用下划线连，如 ['http','url'] → #http_url）；
 *   4. 点 submit，必要时点掉「没填集群」的二次确认弹窗；
 *   5. 从 mock 的 request 里把请求体捞出来断言。
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';

// —— 这三行是每个表单测试都要抄的 ——
// @/App 会 import 整个路由树，太重，换成只有 CommonStateContext 的假模块
jest.mock('@/App', () => require('../helpers/appMock'));
// @/utils/request 是 umi-request 封装（src/utils/request.ts:2 起），整个换成 jest.fn
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import request from '@/utils/request';
import '@/i18n'; // 初始化 i18next（否则 useTranslation 拿不到实例）
import '@/pages/datasource/locale'; // 挂上 datasourceManage 这个命名空间的词条
import DatasourceFormPage from '@/pages/datasource/Form';

const requestMock = request as unknown as jest.Mock;

function renderForm(action = 'add', type = 'elasticsearch', id?: string) {
  const path = id ? `/help/source/${action}/${type}/${id}` : `/help/source/${action}/${type}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Route path='/help/source/:action/:type/:id?'>
        <DatasourceFormPage />
      </Route>
    </MemoryRouter>,
  );
}

/** antd Form.Item 的 name 是数组时，生成的 input id 用下划线连接 */
function setInput(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`#${id}`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('样板 A：ElasticSearch 数据源表单提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('填完必填项点「测试并保存」，会带着 plugin_type=elasticsearch 打到 datasource/upsert', async () => {
    const { container } = renderForm();

    // 表单确实渲染出来了（ES 表单独有的「版本」下拉，name=['settings','version']）
    expect(container.querySelector('#name')).toBeTruthy();
    expect(container.querySelector('#http_url')).toBeTruthy();
    expect(container.querySelector('#settings_version')).toBeTruthy();

    setInput(container, 'name', 'es_test_ds');
    setInput(container, 'http_url', 'http://127.0.0.1:9200');
    setInput(container, 'auth_basic_auth_user', 'elastic');
    setInput(container, 'auth_basic_auth_password', 'p@ssw0rd');

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn);

    // 没填 cluster_name 时 src/pages/datasource/Form.tsx 会先弹二次确认，点掉它
    await waitFor(() => {
      expect(document.querySelector('.ant-modal-confirm-btns')).toBeTruthy();
    });
    const okBtn = document.querySelector('.ant-modal-confirm-btns .ant-btn-primary') as HTMLButtonElement;
    expect(okBtn).toBeTruthy();
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalled();
    });

    const [url, options] = requestMock.mock.calls[0];
    const body = options.data;

    // 把请求体打出来——后面照着写新表单测试的人直接看这段输出
    // eslint-disable-next-line no-console
    console.log('[step6d][样板A] upsert url =', JSON.stringify(url));
    // eslint-disable-next-line no-console
    console.log('[step6d][样板A] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toContain('datasource/upsert');
    expect(url).toBe('/api/n9e/datasource/upsert');
    // RequestMethod.Post 的字面量是 'Post'（首字母大写），见 src/store/common.ts
    expect(options.method).toBe('Post');

    expect(body.plugin_type).toBe('elasticsearch');
    expect(body.name).toBe('es_test_ds');
    expect(body.http.url).toBe('http://127.0.0.1:9200');
    expect(body.http.timeout).toBe(10000);
    expect(body.http.headers).toEqual({});
    expect(body.auth.basic_auth_user).toBe('elastic');
    // 密码由 src/pages/datasource/services.ts 的 aesEncrypt 加密后再发
    expect(typeof body.auth.basic_auth_password).toBe('string');
    expect(body.auth.basic_auth_password.startsWith('{{cipher}}')).toBe(true);
    expect(body.settings).toEqual({ version: '7.0+', max_shard: 5, min_interval: 10 });
    expect(body.is_test).toBe(true);
    expect(body.is_enable).toBe(true);
  });

  it('必填项没填时不发请求（表单校验拦住）', async () => {
    const { container } = renderForm();
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-explain-error')).toBeTruthy();
    });
    expect(requestMock).not.toHaveBeenCalled();
  });
});
