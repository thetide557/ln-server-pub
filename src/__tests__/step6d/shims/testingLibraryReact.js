/**
 * `@testing-library/react` 的垫片（N36 批 C 加）。被 `jest.config.ts` 的 `moduleNameMapper`
 * 接在 `^@testing-library/react$` 上，所以测试里照常写 `from '@testing-library/react'`。
 *
 * 为什么要它：羚牛 pub 是 **React 17 + `@testing-library/react` 12**（`package.json:131`），
 * 而上游夜莺 fe 已经是 **React 18 + RTL 16**
 * （`git -C ../../nightingale-AI-About/fe show ee48e701:package.json` 里 `react: ^18.3.1`、
 * `@testing-library/react: ^16.3.2`）。`renderHook`——直接测一个 React hook、不用自己写宿主组件的那个
 * 工具——是 RTL **13.1 才加的**，RTL 12 里没有这个导出；于是 N20 从上游逐字搬来的
 * `src/components/AiQueryDock/usePendingQuery.test.ts`、`useQueryDockActions.test.ts` 一跑就报
 * `TypeError: react_1.renderHook is not a function`。
 *
 * 升级 React / RTL 是全仓级的事（属版本 B 的范围），本批不碰 `package.json`。所以这里照 RTL 自己的
 * 实现把 `renderHook` 补出来、其余导出原样透传：宿主组件里调 callback，用 `useEffect` 把结果写进 ref，
 * 所以 `result.current` 拿到的是「已提交」的那一次的值，和 RTL v16 的行为一致。
 *
 * 这是**羚牛工具链接不上上游测试而加的桥**，已登记 `第六步-流水线/垫片清单-2026-10-07.md`。
 * 将来真把 React / RTL 升上去，把这个文件和 `jest.config.ts` 里那条 moduleNameMapper 一起删掉即可。
 *
 * 写成 .js 而不是 .tsx，是为了避开 ts-jest 的 ESM/CJS 互操作——这个文件要用 `module.exports` 整体替换
 * 导出对象，纯 CommonJS 最省事；JSX 改成 React.createElement，只有两处。
 */
const React = require('react');

// 注意：这里必须写包内的真实文件路径。写 '@testing-library/react' 会被 moduleNameMapper
// 重新指回本文件，变成自己 require 自己。dist/index.js 是该包 package.json 的 main。
const rtl = require('@testing-library/react/dist/index.js');

function renderHook(renderCallback, options) {
  const { initialProps, ...renderOptions } = options || {};
  const result = { current: undefined };

  function TestComponent({ renderCallbackProps }) {
    const pendingResult = renderCallback(renderCallbackProps);
    React.useEffect(() => {
      result.current = pendingResult;
    });
    return null;
  }

  const rendered = rtl.render(React.createElement(TestComponent, { renderCallbackProps: initialProps }), renderOptions);

  function rerender(rerenderCallbackProps) {
    return rendered.rerender(React.createElement(TestComponent, { renderCallbackProps: rerenderCallbackProps }));
  }

  return { result, rerender, unmount: rendered.unmount };
}

module.exports = {
  ...rtl,
  __esModule: true,
  // RTL 12 没有 renderHook，补上；万一哪天包里自己有了，优先用包里的。
  renderHook: rtl.renderHook || renderHook,
};
