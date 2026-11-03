/**
 * N36 批 E · prometheus 即时查询页接停靠栏的接线，以及局部开关 `ENABLE_AI_QUERY_DOCK`
 * （`src/utils/constant.ts:96`）两种状态下页面长什么样。
 *
 * 要验的就是 N26 定下的那条口径：
 *   - 开关**开**：查询框里出现停靠栏入口（`queryExtra`）、框下面挂上停靠栏面板（`noticeBanner`），
 *     右上角那个 AI 浮窗按钮**收起来**（`extra` 为 undefined）——不然两个 AI 入口会同时在页面上；
 *   - 开关**关**：`queryExtra` / `noticeBanner` 都是 undefined，浮窗按钮照旧在。
 * 开关是在 `aiDock.tsx`（`chatButton` 那个三元）和 `useAiQueryDock.tsx:96-97` 两处读的，
 * 所以这两条用例一起把它们都盖住。
 *
 * 替身：`PromGraphCpt` 换成一个只把 props 记下来的壳（真组件的行为由同目录
 * `promGraphDockControl.test.tsx` 验）；停靠栏面板本体、它背后那套 AI 动作、浮窗按钮
 * 也都换成壳——这一条只管「谁被传给了谁」。
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../../helpers/appMock'));

// 开关用 getter：两条用例各自选开 / 关，不用重载模块（这一招抄自
// `src/components/AiQueryDock/useAiQueryDock.test.tsx:20-26`）。其余常量原样透传。
const mockMode = { dockEnabled: true };
jest.mock('@/utils/constant', () => {
  const actual = jest.requireActual('@/utils/constant');
  return {
    ...actual,
    get ENABLE_AI_QUERY_DOCK() {
      return mockMode.dockEnabled;
    },
  };
});

// `@/components/TimeRangePicker` 里面 `import momentGenerateConfig from 'rc-picker/es/generate/moment'`
// 是只发 ESM 的包，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 直接 require 会报 "Cannot use import statement outside a module"。这一条用不到日历控件，
// 只用到页面和 useAiQueryDock 里的那三个函数，换个最小替身。
jest.mock('@/components/TimeRangePicker', () => ({
  __esModule: true,
  default: () => null,
  timeRangeUnix: () => ({ start: 1700000000, end: 1700003600 }),
  isMathString: (value: unknown) => typeof value === 'string' && /^now/.test(value),
  parseRange: (range: unknown) => range,
}));

// 只记 props 的壳，用来看页面到底把什么传给了 PromGraph
let promGraphProps: any;
jest.mock('@/components/PromGraphCpt', () => ({
  __esModule: true,
  default: (props: any) => {
    promGraphProps = props;
    return (
      <div data-testid='prom-graph-stub'>
        {props.queryExtra}
        {props.noticeBanner}
        {props.extra}
      </div>
    );
  },
}));
jest.mock('@/components/AiQueryDock/index', () => ({ __esModule: true, default: () => <div data-testid='ai-dock' /> }));
jest.mock('@/components/AiQueryDock/Trigger', () => ({
  __esModule: true,
  AiQueryDockTrigger: (props: any) => <button data-testid='ai-trigger' aria-pressed={String(props.open)} onClick={props.onClick} />,
}));
// 这一条不验 AI 动作怎么注册，换掉它顺带免掉 @flashcatcloud/ai-kit 那一整条依赖
jest.mock('@/components/AiQueryDock/useQueryDockActions', () => ({
  useQueryDockActions: () => ({
    progress: { phase: 'idle' },
    canUndo: false,
    prepareTurn: jest.fn(),
    undo: jest.fn(),
    cancel: jest.fn(),
    invalidateUndo: jest.fn(),
    reset: jest.fn(),
  }),
}));
jest.mock('@/components/AiChatNG/FlashAiButton', () => ({
  __esModule: true,
  AiButton: (props: any) => <button data-testid='ai-float-button' onClick={() => props.onExecuteQueryForQueryContent?.('up_from_float')} />,
}));
jest.mock('@/components/AiChatNG/recommend', () => ({
  buildPageFrom: (options: any) => ({ url: '/page', param: options?.param }),
  getExplorerPrompts: () => ['prompt_a'],
}));

import '@/i18n';
import { Form } from 'antd';
import Prometheus from '@/pages/explorer/Prometheus';

function Host() {
  const [form] = Form.useForm();
  return (
    <MemoryRouter initialEntries={['/metric/explorer']}>
      <Prometheus headerExtra={null} datasourceValue={7} form={form} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  promGraphProps = undefined;
});

describe('N36-E · 即时查询页接停靠栏', () => {
  it('开关开着：入口按钮和面板都传下去，浮窗按钮收起来', () => {
    mockMode.dockEnabled = true;
    const { getByTestId, queryByTestId, unmount } = render(<Host />);

    expect(promGraphProps.controlRef).toBeTruthy();
    expect(typeof promGraphProps.onUserContextChange).toBe('function');
    expect(promGraphProps.queryExtra).toBeTruthy();
    expect(promGraphProps.noticeBanner).toBeTruthy();
    // 关键：开关开着时浮窗按钮不渲染，页面上只有停靠栏这一个 AI 入口
    expect(promGraphProps.extra).toBeUndefined();

    expect(getByTestId('ai-trigger')).toBeTruthy();
    expect(getByTestId('ai-dock')).toBeTruthy();
    expect(queryByTestId('ai-float-button')).toBeNull();
    unmount();
  });

  it('开关关着：queryExtra / noticeBanner 都是 undefined，浮窗按钮照旧在', () => {
    mockMode.dockEnabled = false;
    const { getByTestId, queryByTestId, unmount } = render(<Host />);

    expect(promGraphProps.queryExtra).toBeUndefined();
    expect(promGraphProps.noticeBanner).toBeUndefined();
    expect(promGraphProps.extra).toBeTruthy();

    expect(queryByTestId('ai-trigger')).toBeNull();
    expect(queryByTestId('ai-dock')).toBeNull();
    expect(getByTestId('ai-float-button')).toBeTruthy();
    unmount();
  });

  it('开关关着时，浮窗生成的 PromQL 还是走原来的 fillPromQL（seq 递增）那条路', () => {
    mockMode.dockEnabled = false;
    const { getByTestId, unmount } = render(<Host />);
    expect(promGraphProps.fillPromQL).toBeUndefined();

    getByTestId('ai-float-button').click();
    expect(promGraphProps.fillPromQL).toEqual({ value: 'up_from_float', seq: 1 });

    getByTestId('ai-float-button').click();
    expect(promGraphProps.fillPromQL).toEqual({ value: 'up_from_float', seq: 2 });
    unmount();
  });
});
