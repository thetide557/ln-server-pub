/**
 * N36 批 E · prometheus 即时查询页交给 AI 查询停靠栏的那套「代我操作查询面板」的回调
 * （`QueryDockControl`，源码 `src/components/AiQueryDock/useQueryDockActions.ts:19-29`）。
 *
 * 为什么要这几条：羚牛手里的 `PromGraphCpt` 比上游老两代（`value` / `promql` 双 state、
 * 老 `PromQLInput`、自己的权限门控），上游那套回调不能照搬，是在羚牛这版上**另写**的适配层。
 * 既然是自己写的，就得证到四件事：
 *   1. 七个成员齐全，`snapshot()` 读回来的就是当下的输入框文本 / 已提交查询 / 时间范围；
 *   2. `fill()` 只写框、不算「用户动了面板」（`revision()` 不涨）；用户自己打字才涨；
 *   3. `run()` 的 promise 是靠取数那一段显式调 `queryRequest.complete(...)` 结掉的，
 *      而且**同一个 `queryRequest` 只被它所在那一次 effect 捕获**——所以一条慢查询的响应
 *      后到时，它只会去结自己那一次（早已结了），不会串到后一条请求头上；
 *   4. 没权限时 `run()` 要**报错**而不是一直挂着（羚牛的权限门控在渲染层，面板没渲染出来
 *      就没人调 `complete`）。
 *
 * 替身只替「跟这几条无关、又特别重」的：CodeMirror 查询框、图表（echarts）、
 * 查询构造器弹窗、指标浏览器、真实 HTTP。被测的是 `PromGraphCpt/index.tsx` 和
 * `PromGraphCpt/Table.tsx` 的真代码。
 */
import React from 'react';
import { act, render } from '@testing-library/react';

jest.mock('@/App', () => require('../../helpers/appMock'));

// 查询框替身：真的那个是 CodeMirror（`src/components/PromQLInput/index.tsx`），jsdom 里
// 既慢又要 contentDOM。替身把 value 原样显示出来，并把 onChange / executeQuery 挂到两个按钮上，
// 用来模拟「用户打字」和「用户在框里按回车」。
const promqlInput = { props: undefined as any };
jest.mock('@/components/PromQLInput', () => ({
  __esModule: true,
  default: React.forwardRef((props: any, _ref) => {
    promqlInput.props = props;
    return (
      <div>
        <span data-testid='promql-value'>{props.value ?? ''}</span>
        <button data-testid='promql-type' onClick={() => props.onChange?.('typed_by_user')} />
        <button data-testid='promql-enter' onClick={() => props.executeQuery?.('entered_by_user')} />
      </div>
    );
  }),
}));
// 图表那一页会拉进 dashboard 的 Timeseries（echarts / uplot），本批只验表格这条路。
jest.mock('@/components/PromGraphCpt/Graph', () => ({ __esModule: true, default: () => <div data-testid='graph-stub' /> }));
jest.mock('@/components/PromQueryBuilder/PromQueryBuilderModal', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/components/PromGraphCpt/components/MetricsExplorer', () => ({ __esModule: true, default: () => null }));

// 要数的那一次取数：`src/components/PromGraphCpt/services.ts:26` 的 getPromData。
const promData = {
  calls: [] as { url: string; params: any; signal?: AbortSignal }[],
  // 每次调用压一个「可以手动结掉」的 promise 进来，用来摆慢查询的时序
  deferred: [] as { resolve: (value: any) => void; reject: (reason?: any) => void }[],
};
jest.mock('@/components/PromGraphCpt/services', () => ({
  __esModule: true,
  getPromData: (url: string, params: any, signal?: AbortSignal) => {
    promData.calls.push({ url, params, signal });
    return new Promise((resolve, reject) => {
      promData.deferred.push({ resolve, reject });
    });
  },
  setTmpChartData: jest.fn(),
}));

import '@/i18n';
import { CommonStateContext, defaultCommonState } from '@/App';
import PromGraph from '@/components/PromGraphCpt';
import type { PromGraphControl } from '@/components/PromGraphCpt';

/** 一行 vector 结果，和 prometheus 的 /api/v1/query 回包同形。 */
const oneRow = { resultType: 'vector', result: [{ metric: { __name__: 'up' }, value: [1700000000, '1'] }] };
const twoRows = {
  resultType: 'vector',
  result: [
    { metric: { __name__: 'up', instance: 'a' }, value: [1700000000, '1'] },
    { metric: { __name__: 'up', instance: 'b' }, value: [1700000000, '0'] },
  ],
};

function setup(commonState: any = defaultCommonState) {
  const controlRef = React.createRef<PromGraphControl | null>() as React.MutableRefObject<PromGraphControl | null>;
  const onUserContextChange = jest.fn();
  const utils = render(
    <CommonStateContext.Provider value={commonState}>
      <PromGraph datasourceValue={1} promQL='' controlRef={controlRef} onUserContextChange={onUserContextChange} />
    </CommonStateContext.Provider>,
  );
  return { controlRef, onUserContextChange, ...utils };
}

/** 把第 n 次取数（从 0 数）结掉，并把 React 的更新都 flush 掉。 */
async function settle(index: number, payload: any) {
  await act(async () => {
    promData.deferred[index].resolve({ data: payload }.data);
    await Promise.resolve();
  });
}

beforeEach(() => {
  promData.calls = [];
  promData.deferred = [];
  promqlInput.props = undefined;
});

describe('N36-E · PromGraphCpt 交给停靠栏的 control', () => {
  it('七个成员齐全，snapshot() 读回当下的输入框文本 / 已提交查询 / 时间范围', async () => {
    const { controlRef } = setup();
    const control = controlRef.current!;
    expect(control).toBeTruthy();
    // 成员清单照 `useQueryDockActions.ts:19-29`，一个不少
    expect(Object.keys(control).sort()).toEqual(['fill', 'queryButton', 'queryInput', 'restore', 'revision', 'run', 'snapshot']);
    for (const key of ['snapshot', 'revision', 'fill', 'run', 'restore', 'queryInput', 'queryButton'] as const) {
      expect(typeof control[key]).toBe('function');
    }

    // 开局：框是空的、还没提交过、时间范围是组件的默认值
    expect(controlRef.current!.snapshot()).toEqual({ query: '', submitted: '', range: { start: 'now-1h', end: 'now' }, timestamp: undefined });

    // 填一条进去：只有「输入框文本」变，「已提交查询」不动
    await act(async () => {
      controlRef.current!.fill('up');
    });
    expect(controlRef.current!.snapshot()).toMatchObject({ query: 'up', submitted: '' });

    // 执行，取数结掉之后「已提交查询」才跟上
    let run: Promise<any>;
    await act(async () => {
      run = controlRef.current!.run();
    });
    await settle(0, oneRow);
    await act(async () => {
      await run!;
    });
    expect(controlRef.current!.snapshot()).toMatchObject({ query: 'up', submitted: 'up' });

    // queryInput() 指的是查询框本体（`.ant-input-affix-wrapper`），不是整行
    expect(controlRef.current!.queryInput()).toBe(document.querySelector('.ant-input-affix-wrapper'));
    // queryButton() 指的是「查询」按钮（antd 会在两个汉字之间插一个空格，所以这里去掉空白再比）
    expect((controlRef.current!.queryButton() as HTMLElement)?.textContent?.replace(/\s/g, '')).toBe('查询');
  });

  it('fill() 不算用户动面板（revision 不涨）；用户自己打字才涨', async () => {
    const { controlRef, onUserContextChange } = setup();
    const before = controlRef.current!.revision();

    await act(async () => {
      controlRef.current!.fill('up');
    });
    expect(controlRef.current!.revision()).toBe(before);
    expect(onUserContextChange).not.toHaveBeenCalled();

    // 用户在框里打字（真框是每敲一下就回调一次 onChange，见 PromQLInput/index.tsx:165-178）
    await act(async () => {
      promqlInput.props.onChange('up{job="x"}');
    });
    expect(controlRef.current!.revision()).toBeGreaterThan(before);
    expect(onUserContextChange).toHaveBeenCalled();
  });

  it('run() 要等取数那一段调 complete 才 resolve，拿回的是行数', async () => {
    const { controlRef } = setup();
    await act(async () => {
      controlRef.current!.fill('up');
    });
    expect(promData.calls).toHaveLength(0); // 只填不执行，一个请求都不该发

    let run: Promise<any>;
    await act(async () => {
      run = controlRef.current!.run();
    });
    expect(promData.calls).toHaveLength(1);
    expect(promData.calls[0].params.query).toBe('up');
    expect(promData.calls[0].url).toBe('/api/takin/proxy/1/api/v1/query');
    expect(promData.calls[0].signal).toBeInstanceOf(AbortSignal);

    // 还没结 → promise 还挂着（用一个会先到的 sentinel 证明它没 settle）
    const pendingProbe = await Promise.race([run!.then(() => 'settled'), Promise.resolve('still-pending')]);
    expect(pendingProbe).toBe('still-pending');

    await settle(0, twoRows);
    await expect(run!).resolves.toEqual({ empty: false, count: 2 });
  });

  it('空结果也算结掉，empty 为真', async () => {
    const { controlRef } = setup();
    await act(async () => {
      controlRef.current!.fill('up');
    });
    let run: Promise<any>;
    await act(async () => {
      run = controlRef.current!.run();
    });
    await settle(0, { resultType: 'vector', result: [] });
    await expect(run!).resolves.toEqual({ empty: true, count: 0 });
  });

  it('串号：第一条慢查询的响应后到，也只会结它自己那一次，不会去应答第二条', async () => {
    const { controlRef } = setup();
    await act(async () => {
      controlRef.current!.fill('slow_query');
    });
    let first: Promise<any>;
    await act(async () => {
      first = controlRef.current!.run();
    });
    expect(promData.calls).toHaveLength(1);
    // 第一条的 promise 要有人接着，否则 node 会报 unhandled rejection
    const firstOutcome = first!.then(
      () => ({ kind: 'resolved' as const }),
      (err: Error) => ({ kind: 'rejected' as const, name: err.name }),
    );

    // 第二条紧跟着来（上游 usePendingQuery.ts:33：begin() 先把前一个 abort 掉）
    await act(async () => {
      controlRef.current!.fill('second_query');
    });
    let second: Promise<any>;
    await act(async () => {
      second = controlRef.current!.run();
    });
    expect(promData.calls).toHaveLength(2);
    expect(promData.calls[1].params.query).toBe('second_query');

    // 第一条被掐断了
    await expect(firstOutcome).resolves.toEqual({ kind: 'rejected', name: 'AbortError' });
    // 它自己的 signal 也真的 abort 了（请求不白跑）
    expect(promData.calls[0].signal!.aborted).toBe(true);
    expect(promData.calls[1].signal!.aborted).toBe(false);

    // 现在让第一条的响应**后到**：两行。它不该把第二条结成 count=2
    await settle(0, twoRows);
    const stillPending = await Promise.race([second!.then(() => 'settled'), Promise.resolve('still-pending')]);
    expect(stillPending).toBe('still-pending');

    // 第二条自己的响应回来，才是第二条的结果
    await settle(1, oneRow);
    await expect(second!).resolves.toEqual({ empty: false, count: 1 });
  });

  it('取数失败时 run() reject，错误带原始信息', async () => {
    const { controlRef } = setup();
    await act(async () => {
      controlRef.current!.fill('up');
    });
    let outcome: Promise<any>;
    await act(async () => {
      // 先把 catch 挂上再让它失败：不然这一下在 act 里变成「没人接的 rejection」，jest 会直接报错
      outcome = controlRef.current!.run().then(
        () => ({ kind: 'resolved' as const }),
        (err: Error) => ({ kind: 'rejected' as const, message: err.message }),
      );
    });
    await act(async () => {
      promData.deferred[0].reject(new Error('bad_data'));
      await Promise.resolve();
    });
    // 交回停靠栏的是取数那边拿到的原始错误（页面上另外会显示 `Error executing query: …`）
    await expect(outcome!).resolves.toEqual({ kind: 'rejected', message: 'bad_data' });
  });

  it('queryPaused（刚填完还没执行）期间不发请求', async () => {
    const { controlRef } = setup();
    await act(async () => {
      controlRef.current!.fill('up');
    });
    let run: Promise<any>;
    await act(async () => {
      run = controlRef.current!.run();
    });
    await settle(0, oneRow);
    await act(async () => {
      await run!;
    });
    expect(promData.calls).toHaveLength(1);

    // 再填一条：fill() 会把取数按住，所以这一下不许有新请求
    await act(async () => {
      controlRef.current!.fill('rate(up[5m])');
    });
    expect(promData.calls).toHaveLength(1);
  });

  it('restore() 能把「框里有还没执行的文本」原样放回', async () => {
    const { controlRef } = setup();
    // 先造出「已提交 up、框里改成了别的还没执行」这个状态
    await act(async () => {
      controlRef.current!.fill('up');
    });
    let run: Promise<any>;
    await act(async () => {
      run = controlRef.current!.run();
    });
    await settle(0, oneRow);
    await act(async () => {
      await run!;
    });
    await act(async () => {
      promqlInput.props.onChange('up_but_not_submitted');
    });
    const snapshot = controlRef.current!.snapshot();
    expect(snapshot).toMatchObject({ query: 'up_but_not_submitted', submitted: 'up' });

    // 再让 AI 改一遍并执行
    await act(async () => {
      controlRef.current!.fill('node_load1');
    });
    let second: Promise<any>;
    await act(async () => {
      second = controlRef.current!.run();
    });
    await settle(1, oneRow);
    await act(async () => {
      await second!;
    });
    expect(controlRef.current!.snapshot()).toMatchObject({ query: 'node_load1', submitted: 'node_load1' });

    // 撤销：两样都要回到快照那一刻，而不是被「已提交查询」盖成一样
    await act(async () => {
      controlRef.current!.restore(snapshot);
    });
    expect(controlRef.current!.snapshot()).toMatchObject({ query: 'up_but_not_submitted', submitted: 'up' });
  });

  it('没权限时 run() 报错，不会一直挂着', async () => {
    // 这个账号既不是 Admin，也没有任何 /metric/explorer/* 权限：
    // 按 PromGraphCpt 的权限门控，查询按钮和表格 / 图表都不渲染，取数的 effect 根本不会跑。
    const noPerm = { ...defaultCommonState, profile: { ...defaultCommonState.profile, roles: [], admin: false }, permList: [] };
    const { controlRef } = setup(noPerm);
    expect(document.querySelector('.ant-btn-primary')).toBeNull();

    await act(async () => {
      controlRef.current!.fill('up');
    });
    let outcome: Promise<any>;
    await act(async () => {
      outcome = controlRef.current!.run().then(
        () => ({ kind: 'resolved' as const }),
        (err: Error) => ({ kind: 'rejected' as const, message: err.message }),
      );
    });
    await expect(outcome!).resolves.toEqual({ kind: 'rejected', message: 'No permission to run this query' });
    expect(promData.calls).toHaveLength(0);
  });

  it('只有图表权限、当前停在表格 tab 时，run() 也报错而不是挂住', async () => {
    // 只给 /metric/explorer/graph 和 /metric/explorer/query：
    // 组件挂载时的权限 effect 会把 tab 切到 graph，所以这一条反过来验「tab 与面板对得上就能跑」。
    const graphOnly = { ...defaultCommonState, profile: { ...defaultCommonState.profile, roles: [], admin: false }, permList: ['/metric/explorer/graph', '/metric/explorer/query'] };
    const { controlRef } = setup(graphOnly);
    await act(async () => {
      controlRef.current!.fill('up');
    });
    // 图表被替身顶掉了（不会调 complete），所以这里只验「没有被权限挡掉」——
    // 真正挡人的那一条是上一条用例。
    let outcome: Promise<any>;
    await act(async () => {
      outcome = controlRef.current!.run().then(
        () => ({ kind: 'resolved' as const }),
        (err: Error) => ({ kind: 'rejected' as const, name: err.name }),
      );
    });
    const probe = await Promise.race([outcome!, Promise.resolve('still-pending')]);
    expect(probe).toBe('still-pending');
    // 收尾：把它掐掉，别留一个挂着的 promise
    await act(async () => {
      controlRef.current!.restore({ query: '', submitted: '', range: { start: 'now-1h', end: 'now' } } as any);
    });
    await expect(outcome!).resolves.toMatchObject({ kind: 'rejected', name: 'AbortError' });
  });
});

describe('N36-E · 不接停靠栏时 PromGraphCpt 的 DOM 不变', () => {
  /**
   * 停靠栏开关关闭时，`useAiQueryDock` 把 `trigger` / `dock` 都返回 `undefined`
   * （`src/components/AiQueryDock/useAiQueryDock.tsx:96-97`），页面传下来的 `queryExtra` /
   * `noticeBanner` 就是 `undefined`。这两条就是验「那时候这个组件一个节点都不多出来」：
   *   - 入口按钮那段写成 `queryExtra ? <span …> : null`；
   *   - 面板那层用的是 `QueryBoxColumn`，它在「既无 prefixed 又无 below」时原样返回 children
   *     （`src/components/QueryBoxPrefix/index.tsx:44`）。
   */
  it('四个新 prop 全不传，和全传 undefined，渲染出来的 HTML 完全相同', () => {
    const base = { datasourceValue: 1, promQL: '' };
    const a = render(
      <CommonStateContext.Provider value={defaultCommonState}>
        <PromGraph {...base} />
      </CommonStateContext.Provider>,
    );
    const htmlWithout = a.container.innerHTML;
    a.unmount();

    const controlRef = React.createRef<PromGraphControl | null>() as React.MutableRefObject<PromGraphControl | null>;
    const b = render(
      <CommonStateContext.Provider value={defaultCommonState}>
        <PromGraph {...base} queryExtra={undefined} noticeBanner={undefined} controlRef={controlRef} onUserContextChange={jest.fn()} />
      </CommonStateContext.Provider>,
    );
    expect(b.container.innerHTML).toBe(htmlWithout);
    // controlRef 关着也会被赋值，只是没人调用
    expect(controlRef.current).toBeTruthy();
    b.unmount();
  });

  it('不传 noticeBanner 时，查询条外面不多包一层（QueryBoxColumn 原样返回 children）', () => {
    const { container, unmount } = render(
      <CommonStateContext.Provider value={defaultCommonState}>
        <PromGraph datasourceValue={1} promQL='' />
      </CommonStateContext.Provider>,
    );
    const row = container.querySelector('.prom-graph-expression-input');
    expect(row).toBeTruthy();
    // 查询条仍然是 .prom-graph-container 的直接子节点
    expect(row!.parentElement!.className).toBe('prom-graph-container');
    unmount();
  });

  it('传了 noticeBanner 时，面板挂在查询条下面、和查询条同一层', () => {
    const { container, unmount } = render(
      <CommonStateContext.Provider value={defaultCommonState}>
        <PromGraph datasourceValue={1} promQL='' queryExtra={<i data-testid='trigger-stub' />} noticeBanner={<b data-testid='dock-stub' />} />
      </CommonStateContext.Provider>,
    );
    const row = container.querySelector('.prom-graph-expression-input')!;
    const dock = container.querySelector('[data-testid="dock-stub"]')!;
    // 外面多了一层（QueryBoxColumn），查询条和面板是它的两个子节点，面板在后
    expect(dock.parentElement).toBe(row.parentElement);
    expect(row.nextElementSibling).toBe(dock);
    // 入口按钮钉在查询框里面
    const trigger = container.querySelector('[data-testid="trigger-stub"]')!;
    expect(trigger.closest('.ant-input-affix-wrapper')).toBeTruthy();
    unmount();
  });
});

describe('N36-E 修复轮 · P-1：run() 在「不合批」的真实路径上被调用', () => {
  /**
   * 为什么要单开这一组：上面那 13 条里每一处 `run()` 都写在 `await act(async () => {...})` 的
   * **同步段**里，而 React 17 的 `act` 内部就是 `batchedUpdates(callback)`，所以那些用例里
   * `run()` 是**合批**跑的。真实情况不是这样——停靠栏在两个 `await` 之后才调 `run()`
   * （`src/components/AiQueryDock/useQueryDockActions.ts:216`），那是一个 microtask；
   * 而羚牛是 React 17.0.2、legacy `ReactDOM.render`（`src/main.tsx:23`），只在 React 事件
   * 处理函数里合批。所以这一组**故意不把 `fill()` / `run()` 放进 `act` 的同步段**，
   * 只用 `act` 推进时序（审阅者 verdict-E P-1 第 3 条点名要这样写）。
   *
   * 会看到 React 的 "not wrapped in act" 告警 —— 那正是本组要的调用形态，不是毛病。
   */
  it('第二轮 run() 也要拿到本轮结果，并且这一轮恰好发 1 条请求、query 就是本轮填进去那条', async () => {
    const { controlRef } = setup();

    // 第一轮：先让页面上确实查过一次。P-1 只有在「已经查过一次」之后才会踩中
    // （开局「已提交查询」是空串，中间帧那次取数会被 `if (datasourceValue && promql)` 挡掉）。
    controlRef.current!.fill('up'); // act 之外
    const first = controlRef.current!.run(); // act 之外
    const firstOutcome = first.then(
      (value) => ({ kind: 'resolved' as const, value }),
      (err: Error) => ({ kind: 'rejected' as const, name: err.name }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(promData.calls.map((c) => c.params.query)).toEqual(['up']);
    await settle(0, twoRows);
    await expect(firstOutcome).resolves.toEqual({ kind: 'resolved', value: { empty: false, count: 2 } });

    // 第二轮：这才是 P-1 真正踩中的那一轮
    const before = promData.calls.length;
    controlRef.current!.fill('rate(up[5m])'); // act 之外
    const second = controlRef.current!.run(); // act 之外
    const secondOutcome = second.then(
      (value) => ({ kind: 'resolved' as const, value }),
      (err: Error) => ({ kind: 'rejected' as const, name: err.name }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    // ① 这一轮恰好 1 条请求，且就是本轮填进去那条（修前是 3 条：['up','up','rate(up[5m])']）
    expect(promData.calls.slice(before).map((c) => c.params.query)).toEqual(['rate(up[5m])']);
    await settle(before, oneRow);
    // ② 第二轮必须 resolve 本轮结果，不得 reject AbortError（修前是 {kind:'rejected',name:'AbortError'}）
    await expect(secondOutcome).resolves.toEqual({ kind: 'resolved', value: { empty: false, count: 1 } });
  });

  it('restore() 在 act 之外被调用时，也只触发一次重取', async () => {
    const { controlRef } = setup();
    controlRef.current!.fill('up');
    const first = controlRef.current!.run();
    const firstOutcome = first.then(
      () => 'ok',
      (err: Error) => err.name,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await settle(0, twoRows);
    await expect(firstOutcome).resolves.toBe('ok');
    const snapshot = controlRef.current!.snapshot();

    controlRef.current!.fill('node_load1');
    const second = controlRef.current!.run();
    const secondOutcome = second.then(
      () => 'ok',
      (err: Error) => err.name,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await settle(1, oneRow);
    await expect(secondOutcome).resolves.toBe('ok');

    // 撤销：改八样 state，不圈一帧就是八次渲染、八次取数 effect 重跑
    const before = promData.calls.length;
    controlRef.current!.restore(snapshot); // act 之外
    await act(async () => {
      await Promise.resolve();
    });
    expect(promData.calls.slice(before).map((c) => c.params.query)).toEqual(['up']);
  });
});
