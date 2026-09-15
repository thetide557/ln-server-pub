import React from 'react';
import _ from 'lodash';
// @ts-ignore
import { advancedCates } from 'plus:/constants';

export interface Cate {
  value: string;
  label: string;
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
  },
  {
    value: 'elasticsearch',
    label: 'Elasticsearch',
    type: ['logging'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: true,
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
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
  {
    value: 'iotdb',
    label: 'IoTDB',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  {
    value: 'tdengine',
    label: 'TDengine',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  // ---- 第六步 L2（多数据源）：只追加 loki 一条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:67-78
  // 抄 value / label / type / graphPro / alertPro；dashboard 改成 false（fe 那边也是 false，loki 没有仪表盘查询编辑器），
  // alertRule 改成 true —— 第六步 第4段 W3a（阶段 1 收尾）翻回：loki 的告警编辑器是老表单自带的
  //（src/pages/alertRules/Form/Rule/Rule/Log/Loki），已接到分发点上，拍板-14 当初关掉的理由不成立了。
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
  {
    value: 'loki',
    label: 'Loki',
    type: ['logging'],
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: false,
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
  },
  // ---- 第六步 B1（多数据源补搬轮）：只追加 victorialogs 一条数组元素，照 fe v9.1.0
  // src/components/AdvancedWrap/utils.ts:151-162 抄 value / label / type / dashboard / graphPro / alertPro；
  // alertRule 改成 true —— 第六步 第4段 W3a（阶段 1 收尾）翻回：victorialogs 的 v9 告警编辑器已接到分发点上，
  // 拍板-14 当初关掉的理由不成立了。
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
  {
    value: 'victorialogs',
    label: 'VictoriaLogs',
    type: ['logging'],
    alertRule: true,
    dashboard: false,
    graphPro: false,
    alertPro: false,
  },
  // ---- 第六步 B1（多数据源补搬轮）：只追加 doris 一条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:115-126
  // 抄 value / label / type / graphPro / alertPro；alertRule 第六步 第4段 W3a（阶段 1 收尾）翻回 true（编辑器已接到分发点上），
  // dashboard 保持 true（本轮接了 doris 的仪表盘查询编辑器）。
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
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
  },
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）：补上 fe 有而 pub 缺的三条数据源类型，
  // 照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:103-114（opensearch）、:127-138（mysql）、:139-150（pgsql）
  // 抄 value / label / type / dashboard / graphPro / alertPro；
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口（本文件 :6-14）没有，不抄。
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
  },
  {
    value: 'pgsql',
    label: 'PostgreSQL',
    type: ['metric'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
  },
  {
    value: 'opensearch',
    label: 'OpenSearch',
    type: ['logging'],
    alertRule: true,
    dashboard: true,
    graphPro: true,
    alertPro: false,
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
