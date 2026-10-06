import React from 'react';
import _ from 'lodash';
import useFetchDatasourceList from './useFetchDatasourceList';
import DatasourceCateSelect, { ProSvg } from './DatasourceCateSelect';
import ProdSelect from './ProdSelect';
import DatasourceSelect from './DatasourceSelect';

import './locale';
export { useFetchDatasourceList, DatasourceCateSelect, ProSvg, ProdSelect, DatasourceSelect };

// ---- n20 块 0（新日志浏览）在这里加的，只加不改 ----
// 谁要它：src/pages/logExplorer/Explorer.tsx:13 `import { DatasourceSelectV3 } from '@/components/DatasourceSelect'`。
// fe 出处：fe ee48e701 同路径 :8-9（两个 import）、:12-13（两条 export）。
// 写法上的差：fe 是把 DatasourceSelectV3 并进 :12 那一条 `export { … }`；羚牛这份的 :9
// 已有一条 `export { … }` 且是羚牛自己的内容（多了 useFetchDatasourceList），改它会在 diff 里
// 产生 `-` 行、破掉「B 类只加不改」的门禁，所以这里改成在末尾单独补两条导出语句，效果一样。
// DatasourceItem 本轮没人从这个入口取（logExplorer/utils/datasourceAvailability.ts:7 自己定义了一个同名的），
// 但 fe 这个入口导出它，照 fe 一并补上。
import DatasourceSelectV3 from './DatasourceSelectV3';
import type { DatasourceItem } from './DatasourceSelectV3';

export { DatasourceSelectV3 };
export type { DatasourceItem };
