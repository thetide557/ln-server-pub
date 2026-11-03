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
// N36 批 C：数据源表单测试共用的 request 假实现 + 「等集群项自动填好」的小工具，原由见该文件头注释
import { datasourceRequestImpl, waitClusterAutoFilled, AUTO_FILLED_CLUSTER } from '../helpers/datasourceFormHelpers';

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
    // N36 批 C：换成按 URL 分流的假实现，让 GET /api/n9e/server-clusters 返回一个真列表。
    // 原来一律返回 {}，items/Cluster.tsx 的集群项既填不进值、校验规则又判它无效，
    // 整张表单永远提交不出去——这是 N28 U-N28-3 那 8 红的第一层原因。
    requestMock.mockImplementation(datasourceRequestImpl);
  });

  it('提交后 plugin_type=ck，节点在 settings["ck.nodes"] 数组里', async () => {
    const { container } = renderForm('ck');

    setInput(container, 'name', 'ck_test_ds');
    setInput(container, 'settings_ck.nodes_0', '127.0.0.1:9000');
    setInput(container, 'settings_ck.user', 'default');
    setInput(container, 'settings_ck.password', 'p@ssw0rd');

    // N36 批 C：先等「告警引擎集群」这一项被 items/Cluster.tsx 自动填好，再点提交。
    // 不等的话点下去那一刻 cluster_name 还是空的（那个 .then 是微任务，排不进同步语句之间），
    // Cluster.tsx:31-37 的校验规则会把整张表单拦住、onFinish 根本不跑——8 红的第二层原因。
    await waitClusterAutoFilled(container);

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    // N36 批 C：这里原来要点掉「没填集群名」的二次确认弹窗，现在不会再弹了。
    // src/pages/datasource/Form.tsx:203-213 那个 Modal.confirm 的条件是 `type === 'ck' && !values.cluster_name`，
    // 而 items/Cluster.tsx 既会把第一个集群自动填进去（`:17-19`）、又用校验规则把空值硬拦住（`:31-37`），
    // 所以 cluster_name 到 onFinish 时不可能是空的，这条分支对 ck 走不到（prometheus / elasticsearch 同理；
    // influxdb / aliyun-sls 的表单没有 <Cluster>，那两种类型的弹窗还是活的）。改成直接等提交请求。

    await waitFor(() => {
      expect(upsertCalls().length).toBe(1);
    });

    const [url, options] = upsertCalls()[0];
    const body = options.data;
    // eslint-disable-next-line no-console
    console.log('[step6d][L1][ck] upsert body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/n9e/datasource/upsert');
    expect(body.plugin_type).toBe('ck');
    // N36 批 C：集群名由 items/Cluster.tsx 自动填，提交体里会带上它
    expect(body.cluster_name).toBe(AUTO_FILLED_CLUSTER);
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
