/**
 * jsdom 里跑 antd 4 需要的一堆垫片。每条都写清楚是为了谁。
 * 这个文件由 jest.config.ts 的 setupFilesAfterEnv 加载，
 * 在每个测试文件被 require 之前执行，所以下面造的全局变量测试里直接能用。
 */

// ① import.meta 的替身。
//    transformers/tsJestImportMeta.js 会把源码里的 `import.meta` 换成 `__VITE_IMPORT_META__`，
//    这里把它造出来。env 里的值就是 vite 的 import.meta.env。
//    注意 VITE_IS_PRO / VITE_IS_ENT 故意留空：
//    - src/components/AdvancedWrap/index.tsx 用它决定「专业版才显示」的块要不要渲染（留空 = 不渲染）；
//    - src/pages/datasource/services.ts:40 用它决定 upsert 的 URL 走 n9e 还是 n9e-plus（留空 = 走 /api/takin）。
//    某个测试想验专业版分支，在测试里改 (globalThis as any).__VITE_IMPORT_META__.env.VITE_IS_PRO = 'true' 即可。
(globalThis as any).__VITE_IMPORT_META__ = {
  url: 'file:///test',
  env: {
    MODE: 'test',
    DEV: false,
    PROD: true,
    SSR: false,
    BASE_URL: '/',
  },
};

// ② window.matchMedia —— antd 的 Grid（Row/Col 的响应式）、Table 的 responsive 列、
//    Modal / Drawer 的断点判断都会读它，jsdom 没有实现。
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // 老 API，antd 4 里还在用
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// ③ window.getComputedStyle —— 保留 jsdom 原实现，只补一个永远返回空串的 getPropertyValue。
//    rc-motion（antd 的动画层，Modal / Select 下拉都靠它）会去读 transition-duration 之类，
//    jsdom 对伪元素（第二个参数）会直接抛错，这里兜住。
const rawGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (elt: Element, pseudoElt?: string | null) => {
    let style: any;
    try {
      style = pseudoElt ? rawGetComputedStyle(elt) : rawGetComputedStyle(elt);
    } catch (e) {
      style = {};
    }
    if (typeof style.getPropertyValue !== 'function') {
      style.getPropertyValue = () => '';
    }
    return style;
  },
});

// ④ ResizeObserver —— antd 4 的 Table 固定列、Select 下拉宽度、rc-resize-observer 都要它。
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// ⑤ IntersectionObserver —— antd 的 Image 懒加载、部分列表虚拟滚动会用。
if (!(globalThis as any).IntersectionObserver) {
  (globalThis as any).IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// ⑥ TextEncoder / TextDecoder —— node 24 全局有，jsdom 环境里不一定挂上去；缺了就从 node:util 补。
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  const util = require('util');
  (globalThis as any).TextEncoder = util.TextEncoder;
  (globalThis as any).TextDecoder = util.TextDecoder;
}

// ⑦ HTMLCanvasElement.getContext —— antd 的 Input showCount 量文字宽度、
//    以及 echarts / html2canvas 被顺带 import 时会碰 canvas，jsdom 默认抛 "not implemented"。
if (typeof HTMLCanvasElement !== 'undefined' && !(HTMLCanvasElement.prototype as any).__step6dPatched) {
  (HTMLCanvasElement.prototype as any).__step6dPatched = true;
  HTMLCanvasElement.prototype.getContext = (() =>
    ({
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
    } as any)) as any;
}

// ⑧ window.scrollTo —— antd Form 校验失败时会 scrollToField，jsdom 没实现会打一堆 Not implemented。
if (!window.scrollTo) {
  (window as any).scrollTo = () => {};
}

// ⑨ jest-dom 的断言（toBeInTheDocument / toHaveValue 这些）
import '@testing-library/jest-dom';
