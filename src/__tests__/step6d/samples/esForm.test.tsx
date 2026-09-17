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

    // 表单确实渲染出来了（ES 表单独有的「版本」输入框，name=['settings','version']；待用户-04 起由下拉改成自由输入）
    expect(container.querySelector('#name')).toBeTruthy();
    // step6f（ES 升级轮）：表单按 fe v9.1.0 覆盖后，HTTP 组件改成 <HTTP multipleUrls />，
    // 地址栏由单个 name={['http','url']} 变成 Form.List name={['http','urls']}（items/HTTP.tsx:23），
    // antd 生成的 input id 因此从 #http_url 变成 #http_urls_0。
    // 后端认这个字段：`来自后端侧的交接-多数据源前端待办-2026-09-07.md:373`
    // 「http.urls（有多个时优先）/ http.url（只有一个时） → es.nodes（数组）」。
    expect(container.querySelector('#http_urls_0')).toBeTruthy();
    expect(container.querySelector('#settings_version')).toBeTruthy();
    // 覆盖后表单外面套了 <Card title={t(`${action}_title`)}>（action 由 src/pages/datasource/Form.tsx:144 传）
    expect(container.querySelector('.ant-card-head-title')).toBeTruthy();

    setInput(container, 'name', 'es_test_ds');
    setInput(container, 'http_urls_0', 'http://127.0.0.1:9200');
    setInput(container, 'auth_basic_auth_user', 'elastic');
    setInput(container, 'auth_basic_auth_password', 'p@ssw0rd');
    // 待用户-04：版本改成自由输入（没有默认值了），另加「允许写入」开关
    setInput(container, 'settings_version', '7.10.2');
    // 表单里不止一个 Switch（SkipTLSVerify 也有），按 Form.Item 生成的 id 精确取
    const enableWriteSwitch = container.querySelector('#settings_enable_write') as HTMLButtonElement;
    expect(enableWriteSwitch).toBeTruthy();
    fireEvent.click(enableWriteSwitch);

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
      expect(requestMock.mock.calls.some((c: any[]) => String(c[0]).includes('datasource/upsert'))).toBe(true);
    });

    // step6f：原来取的是 requestMock.mock.calls[0]。覆盖后 <Cluster> 不再被 AdvancedWrap 包住，
    // 一挂载就先打了一次 GET /api/n9e/server-clusters，upsert 不再是第 0 次调用，所以按 url 找。
    const [url, options] = requestMock.mock.calls.find((c: any[]) => String(c[0]).includes('datasource/upsert')) as any[];
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
    // step6f：multipleUrls 之后请求体里是数组 http.urls，不再有 http.url
    expect(body.http.urls).toEqual(['http://127.0.0.1:9200']);
    expect(body.http.url).toBeUndefined();
    expect(body.http.timeout).toBe(10000);
    expect(body.http.headers).toEqual({});
    expect(body.auth.basic_auth_user).toBe('elastic');
    // 密码由 src/pages/datasource/services.ts 的 aesEncrypt 加密后再发
    expect(typeof body.auth.basic_auth_password).toBe('string');
    expect(body.auth.basic_auth_password.startsWith('{{cipher}}')).toBe(true);
    expect(body.settings).toEqual({ version: '7.10.2', max_shard: 5, min_interval: 10, enable_write: true });
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
    // step6f：原来这里断的是 `expect(requestMock).not.toHaveBeenCalled()`。
    // 覆盖后 <Cluster> 不再被 <AdvancedWrap var='VITE_IS_PRO,VITE_IS_ENT'> 包住
    //（fork 点 c65a5fdf9 的 Form.tsx:73 有这层包装，fe v9.1.0 已去掉，属上游改动），
    // 于是它一挂载就会去拉告警引擎集群列表 GET /api/n9e/server-clusters，requestMock 必然被调用过一次。
    // 这条用例真正要守的是「校验没过就不发保存请求」，所以改成断言没有任何一次调用打到 datasource/upsert。
    expect(requestMock).toHaveBeenCalled();
    const calledUrls = requestMock.mock.calls.map((c: any[]) => c[0]);
    expect(calledUrls).toContain('/api/n9e/server-clusters');
    expect(calledUrls.some((u: string) => String(u).includes('datasource/upsert'))).toBe(false);
  });
});
