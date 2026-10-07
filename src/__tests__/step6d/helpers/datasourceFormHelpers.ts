/**
 * 数据源表单测试共用的两个小工具（N36 批 C 加）。只服务测试，不碰组件与业务代码。
 *
 * 为什么要它们——N28 登记的「既有 8 红」（`n26/N28-小批-进度.md` U-N28-3）其实是同一个病，两层：
 *
 * 第一层 · 假数据不对。`src/pages/datasource/components/items/Cluster.tsx`
 * （与上游 fe `v9.1.0` 逐字相同，`git -C ../fe show v9.1.0:src/pages/datasource/components/items/Cluster.tsx` 可核）
 * 一挂载就去拉告警引擎集群列表 `GET /api/n9e/server-clusters`，然后：
 *   - `:17-19` 新增时把列表第一项自动填进 `cluster_name`；
 *   - `:31-37` 的校验规则要求 `cluster_name` 必须在列表里、或者正好等于 `no_assigned_engine`，否则整张表单校验不过。
 * 原来各测试的假实现对所有 URL 一律返回 `{ dat: {}, data: {} }`，集群列表就成了空对象 `{}`：
 * 自动填充填不进东西（`{}?.[0]` 是 `undefined`），校验规则又判它无效，于是**十张用了 `<Cluster>` 的
 * 数据源表单在测试里永远提交不出去**。`l1/opensearch`、`l1/victorialogs` 两张表单没有 `<Cluster>`，
 * 所以它们一直是绿的——这也反过来印证了根因。
 *
 * 第二层 · 时序。就算假实现返回了真列表，`getServerClusters().then(...)` 是个微任务；
 * 测试函数体里从 `render()` 到 `fireEvent.click()` 全是同步语句、中间没有 `await`，
 * 微任务排不上队，点提交那一刻 `cluster_name` 还是空的，照样被校验拦住。
 * 所以点提交之前必须先 `await waitClusterAutoFilled(container)`。
 */
import { waitFor } from '@testing-library/react';

/** 假的告警引擎集群列表。`Cluster.tsx:18` 会把第一项自动填进 `cluster_name`。 */
export const SERVER_CLUSTERS = ['default'];

/** 自动填充之后 `cluster_name` 的值（= 上面列表的第一项）；各表单测试断言请求体时用它。 */
export const AUTO_FILLED_CLUSTER = SERVER_CLUSTERS[0];

/**
 * 按 URL 分流的 `@/utils/request` 假实现：
 *   - `/api/n9e/server-clusters` → `{ dat: ['default'] }`（让 `<Cluster>` 能自动填、校验能过）
 *   - 其它（含 `datasource/upsert`） → `{ dat: {}, data: {} }`（与各测试原来的写法一致）
 */
export const datasourceRequestImpl = (url?: any) =>
  String(url).includes('/api/n9e/server-clusters') ? Promise.resolve({ dat: [...SERVER_CLUSTERS], data: {} }) : Promise.resolve({ dat: {}, data: {} });

/**
 * 等「告警引擎集群」这一项被自动填好，再去点提交按钮。
 * 按 `#cluster_name`（antd Select 给 `name='cluster_name'` 生成的 input id）往上找到它所在的
 * `.ant-form-item`，只看这一项里的 `.ant-select-selection-item`，不会误抓表单里别的下拉。
 */
export async function waitClusterAutoFilled(container: HTMLElement) {
  await waitFor(() => {
    const item = container.querySelector('#cluster_name')?.closest('.ant-form-item');
    expect(item?.querySelector('.ant-select-selection-item')?.textContent).toBe(AUTO_FILLED_CLUSTER);
  });
}
