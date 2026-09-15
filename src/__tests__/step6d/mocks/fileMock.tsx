// 图片 / svg 之类的静态资源在 jest 里没有 loader，统一顶成一个空组件 + 一个假路径。
// vite 侧 .svg 由 plugins/svg.js 变成 React 组件（defaultExport: 'component'），
// 所以这里的默认导出也做成组件，保证 `import Logo from 'x.svg'; <Logo />` 不炸。
import React from 'react';

export const ReactComponent = (props: any) => React.createElement('svg', props);

export default function FileMock(props: any) {
  return React.createElement('svg', props);
}

export const src = 'test-file-stub';
