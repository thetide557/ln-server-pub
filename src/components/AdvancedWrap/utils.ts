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
  // alertRule 一律 false（拍板-14：L4 告警规则这一层本轮跳过，别让告警页的下拉出现没有表单的类型）。
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
  {
    value: 'iotdb',
    label: 'IoTDB',
    type: ['metric'],
    alertRule: false,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  {
    value: 'tdengine',
    label: 'TDengine',
    type: ['metric'],
    alertRule: false,
    dashboard: true,
    graphPro: false,
    alertPro: false,
  },
  // ---- 第六步 L2（多数据源）：只追加 loki 一条数组元素，照 fe v9.1.0 src/components/AdvancedWrap/utils.ts:67-78
  // 抄 value / label / type / graphPro / alertPro；dashboard 改成 false（fe 那边也是 false，loki 没有仪表盘查询编辑器），
  // alertRule 改成 false（拍板-14：L4 告警规则这一层本轮跳过，别让告警页的下拉出现没有表单的类型）。
  // fe 那边的 label_en / logo / dashboardVariable 三个字段 pub 的 Cate 接口没有，不抄。
  {
    value: 'loki',
    label: 'Loki',
    type: ['logging'],
    alertRule: false,
    dashboard: false,
    graphPro: false,
    alertPro: false,
  },
  {
    value: 'ck',
    label: 'ClickHouse',
    type: ['metric', 'logging'],
    alertRule: false,
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
