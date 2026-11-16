import React from 'react';
import _ from 'lodash';
// @ts-ignore
import { advancedCates } from 'plus:/constants';

export interface Cate {
  value: string;
  label: string;
  // n20 块 0 加的可选字段：fe 的 DatasourceCategory 有 logo（数据源类型小图标的静态路径），羚牛这版原来没有。
  // N33 批 B（B-2）把下面 baseCates 里除 `api` 以外的 11 条都填上了 '/image/logos/<value>.png'，
  // 图片本体从 fe v9.1.0 的 public/image/logos/ 原样导出到羚牛的 public/image/logos/
  //（`pub/` 是构建产物、.gitignore:8 忽略，不能往里放）。`api` 是羚牛自己的类型、fe 没有对应的图，留空。
  // 两处在读它：DatasourceSelectV3/index.tsx:169（数据源下拉的 16px 小图标）、
  // src/pages/datasource/index.tsx（新建数据源的卡片，没被 sourceLogoMap 覆盖的 7 种走这里）。
  logo?: string;
  type: string[];
  alertRule: boolean; // 是否支持告警规则
  dashboard: boolean; // 是否支持仪表盘
  graphPro: boolean; // Pro版本
  alertPro: boolean; // Pro版本
}

export const baseCates: Cate[] = [
  {
    value: 'prometheus',
    label: 'Prometheus',
    type: ['metric', 'anomaly'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
    logo: '/image/logos/prometheus.png',
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
    type: ['logging'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: true,
    logo: '/image/logos/elasticsearch.png',
  },
  {
    value: 'api',
    label: '数据接口',
    type: ['api'],
    alertRule: false,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  // ---- 第六步 L3（多数据源）：只追加三条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:44-54（iotdb）、
  // :55-66（tdengine）、:91-102（ck）抄 value / label / type / graphPro / alertPro；
  // dashboard 一律 true（L3 已经把仪表盘查询编辑器接上了），
  // alertRule 一律 true —— 第六步 第4段 W3a（阶段 1 收尾）翻回：这三种的 v9 告警规则编辑器已经接到老表单的分发点上
  //（src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx），拍板-14 当初关掉的理由（告警页下拉里有类型却没有表单）不成立了。
  // fe 那边的 label_en / dashboardVariable 两个字段 pub 的 Cate 接口没有，不抄；logo 本来也没抄，N33 批 B 已补上。
  {
    value: 'iotdb',
    label: 'IoTDB',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
    logo: '/image/logos/iotdb.png',
  },
  {
    value: 'tdengine',
    label: 'TDengine',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
    logo: '/image/logos/tdengine.png',
  },
  // ---- 第六步 L2（多数据源）：只追加 loki 一条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:67-78
  // 抄 value / label / type / graphPro / alertPro；dashboard 改成 false（fe 那边也是 false，loki 没有仪表盘查询编辑器），
  // alertRule 改成 true —— 第六步 第4段 W3a（阶段 1 收尾）翻回：loki 的告警编辑器是老表单自带的
  //（src/pages/alertRules/Form/Rule/Rule/Log/Loki），已接到分发点上，拍板-14 当初关掉的理由不成立了。
  // fe 那边的 label_en / dashboardVariable 两个字段 pub 的 Cate 接口没有，不抄；logo 本来也没抄，N33 批 B 已补上。
  {
    value: 'loki',
    label: 'Loki',
    type: ['logging'],
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: false,
    logo: '/image/logos/loki.png',
  },
  {
    value: 'ck',
    label: 'ClickHouse',
    type: ['metric', 'logging'],
    // 第六步 第4段 W0（阶段 0 · ck 试点）：alertRule 从 false 翻回 true——
    // 本轮已把 fe v9.1.0 的 ck 告警规则编辑器（src/plugins/clickHouse/AlertRule/）接进 pub 老表单的分发点
    // （src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'ck' 分支），下拉里选得到、点进去有表单。
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
    logo: '/image/logos/ck.png',
  },
  // ---- 第六步 B1（多数据源补搬轮）：只追加 victorialogs 一条数组元素，照 fe v9.1.0
  // src/components/AdvancedWrap/utils.ts:151-162 抄 value / label / type / dashboard / graphPro / alertPro；
  // alertRule 改成 true —— 第六步 第4段 W3a（阶段 1 收尾）翻回：victorialogs 的 v9 告警编辑器已接到分发点上，
  // 拍板-14 当初关掉的理由不成立了。
  // fe 那边的 label_en / dashboardVariable 两个字段 pub 的 Cate 接口没有，不抄；logo 本来也没抄，N33 批 B 已补上。
  {
    value: 'victorialogs',
    label: 'VictoriaLogs',
    type: ['logging'],
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: false,
    logo: '/image/logos/victorialogs.png',
  },
  // ---- 第六步 B1（多数据源补搬轮）：只追加 doris 一条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:115-126
  // 抄 value / label / type / graphPro / alertPro；alertRule 第六步 第4段 W3a（阶段 1 收尾）翻回 true（编辑器已接到分发点上），
  // dashboard 保持 true（本轮接了 doris 的仪表盘查询编辑器）。
  // fe 那边的 label_en / dashboardVariable 两个字段 pub 的 Cate 接口没有，不抄；logo 本来也没抄，N33 批 B 已补上。
  // 注：即时查询页 Explorer.tsx 不加 doris 分支（开源 fe v9.1.0 自己就没有，拍板-13「基线没接线的不自造」），
  // 所以 type: ['logging'] 会让 Doris 出现在日志页签的类型下拉里、点进去落到 PlusExplorer 占位——与开源 fe 行为一致。
  {
    value: 'doris',
    label: 'Doris',
    type: ['logging'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
    logo: '/image/logos/doris.png',
  },
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）：补上 fe 有而 pub 缺的三条数据源类型，
  // 照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:103-114（opensearch）、:127-138（mysql）、:139-150（pgsql）
  // 抄 value / label / type / dashboard / graphPro / alertPro；
  // fe 那边的 label_en / dashboardVariable 两个字段 pub 的 Cate 接口（本文件 :6-21）没有，不抄；logo 本来也没抄，N33 批 B 已补上。
  // 这三条的 alertRule 阶段 0 先写 false，第六步 第4段 W3a（阶段 1 收尾）已翻回 true——编辑器都接到分发点上了
  //（opensearch 复用 elasticsearch 的编辑器，fe v9.1.0 Form/Rule/Rule/index.tsx:45 就是这么干的）。
  {
    value: 'mysql',
    label: 'MySQL',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
    logo: '/image/logos/mysql.png',
  },
  {
    value: 'pgsql',
    label: 'PostgreSQL',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
    logo: '/image/logos/pgsql.png',
  },
  {
    value: 'opensearch',
    label: 'OpenSearch',
    type: ['logging'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
    logo: '/image/logos/opensearch.png',
  },
];

export const allCates = [...baseCates, ...advancedCates];

export const getAuthorizedDatasourceCates = (feats, isPlus, filter?: (cate: any) => boolean) => {
  let cates = baseCates;
  if (feats && isPlus) {
    cates = _.filter(feats.plugins, (plugin) => {
      return _.find(allCates, { value: plugin.value });
    });
  }
  if (filter) {
    cates = _.filter(cates, filter);
  }
  return cates;
};

// ---- n20 块 0（新日志浏览）在这里加的，只加不改 ----
// 谁要它：src/pages/logExplorer/Explorer.tsx:11 要 getGraphProByCate / getPrimaryTypeByCate；
//         src/components/DatasourceSelect/DatasourceSelectV3/index.tsx:10 要 getCateDisplayLabel。
// fe 出处：fe ee48e701 把本文件重构成了一个 11 行的壳，三个函数的实现搬去了
//         src/utils/datasourceRegistry.ts:164-170（DisplayLabel）、:194-197（GraphPro）、
//         :199-208（PrimaryType），再在 AdvancedWrap/utils.ts:7-9 改名再导出。
//         羚牛这份还是 171 行的原版（自己定义 Cate / baseCates，step6g 改过），不覆盖，
//         所以把那三个实现照抄到末尾，名字用 fe 对外的名字。
// 和 fe 的差：fe 的 getDatasourceCategoryByValue 对 iotdb 特判成只在 baseDatasourceCategories 里找；
//         羚牛 allCates = baseCates + advancedCates，而版本 A 的 advancedCates 是空数组
//         （plugins/PlusPlaceholder.tsx:37），两者等价，这里把特判原样留着。

const getCateByValueForNG = (cate: string): Cate | undefined => {
  if (cate === 'iotdb') {
    return _.find(baseCates, { value: 'iotdb' });
  }
  return _.find(allCates, { value: cate });
};

/** 该数据源类型是不是商业版专属的图（fe datasourceRegistry.ts:194-197） */
export const getGraphProByCate = (cate: string) => {
  const currentCate = getCateByValueForNG(cate);
  return currentCate?.graphPro;
};

/** 该数据源类型的主用途：指标还是日志（fe datasourceRegistry.ts:199-208） */
export const getPrimaryTypeByCate = (cate: string): 'metric' | 'logging' | undefined => {
  const currentCate = _.find(allCates, { value: cate });
  if (currentCate) {
    const primaryType = currentCate.type[0];
    if (primaryType === 'metric' || primaryType === 'logging') {
      return primaryType;
    }
  }
  return undefined;
};

/**
 * 数据源类型在界面上显示的名字（fe datasourceRegistry.ts:164-170）。
 * 羚牛的 Cate 接口（本文件 :6-21）没有 label_en 字段，所以参数类型写成「有 label、label_en 可选」，
 * 逻辑与 fe 一字不差：非中文时先取 label_en，取不到回落 label。
 */
export const getCateDisplayLabel = (cate: (Pick<Cate, 'label'> & { label_en?: string }) | undefined, lang?: string) => {
  if (!cate) return '';
  if (lang && lang !== 'zh_CN') {
    return cate.label_en || cate.label;
  }
  return cate.label;
};
