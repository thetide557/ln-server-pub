/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
// @ts-ignore
import { AdvancedDatasourceCateEnum } from 'plus:/types';
// ---- 第六步 L3（多数据源）：照 fe v9.1.0 src/utils/constant.ts:82,83,103 只加三个 pub 没有的导出。
// IS_PLUS / N9E_PATHNAME 被 fe 的 iotdb / TDengine Dashboard/datasource.tsx 与 AddQueryButtons 用到；
// alphabet 被 fe 的 iotdb Dashboard/QueryBuilder.tsx 与 components/QueryName/utils.ts 用到。
export const IS_PLUS = import.meta.env.VITE_IS_ENT === 'true' || import.meta.env.VITE_IS_PRO === 'true';
export const N9E_PATHNAME = IS_PLUS ? 'n9e-plus' : 'n9e';
export const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const PAGE_SIZE = 15;
export const PAGE_SIZE_MAX = 100000;
export const PAGE_SIZE_OPTION = 20;
export const PAGE_SIZE_OPTION_LARGE = 150;

export const randomColor = ['pink', 'red', 'yellow', 'orange', 'cyan', 'green', 'blue', 'purple', 'geekblue', 'magenta', 'volcano', 'gold', 'lime'];

export const priorityColor = ['red', 'orange', 'yellow'];
// 主题色
export const chartColor = ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3'];
export const METRICS = {
  TOTAL: 'total',
  ERROR: 'error',
  LATENCY: 'latency',
};

export const chartDefaultOptions = {
  color: chartColor,
  xAxis: { data: [] },
  yAxis: {},
  series: [],
  tooltip: {
    show: true,
    trigger: 'axis',
    textStyle: {
      fontSize: 12,
      lineHeight: 12,
    },
  },
  grid: {
    left: '2%',
    right: '1%',
    top: '20',
    bottom: '20',
  },
  legend: {
    lineStyle: {
      width: 1,
    },
  },
  animation: false,
};

enum BaseDatasourceCateEnum {
  prometheus = 'prometheus',
  elasticsearch = 'elasticsearch',
  // ---- 第六步 L1（多数据源）：照 fe v9.1.0 src/utils/constant.ts:66-78 的写法补九种类型。
  // 值必须与后端 models/alert_rule.go:29-41 的常量一字不差（postgresql 叫 pgsql、clickhouse 叫 ck）。
  opensearch = 'opensearch',
  iotdb = 'iotdb',
  tdengine = 'tdengine',
  loki = 'loki',
  ck = 'ck',
  mysql = 'mysql',
  pgsql = 'pgsql',
  doris = 'doris',
  victorialogs = 'victorialogs',
}

export const DatasourceCateEnum = { ...BaseDatasourceCateEnum, ...AdvancedDatasourceCateEnum };
export type DatasourceCateEnum = BaseDatasourceCateEnum | AdvancedDatasourceCateEnum;

export const WebSocketURL =`ws://${location.host}/alert/ws/`;

// ---- 第六步：夜莺 AI 浮窗（AiChatNG）需要的两个常量。羚牛不是 FlashCat 企业版，IS_ENT 恒为 false；
// pub 的 token 存在名为 access_token 的 Cookie 里（src/utils/request.ts:70），这里只是给闭包一个同名常量。
export const IS_ENT = false;
export const AccessTokenKey = 'access_token';

// ---- 第六步 L1：fe v9.1.0 src/utils/constant.ts:87 的 SIZE（间距基数，单位 px），
// victorialogs 数据源表单的 Row gutter 用它。
export const SIZE = 8;

// ---- 第六步 B1（多数据源补搬轮）：照抄 fe v9.1.0 src/utils/constant.ts:88-102 的 FONT_FAMILY 与 THEME。
// victorialogs 即时查询的直方图（src/components/UPlotChart/utils/axisBuilder.ts:6）用它们画坐标轴的字体与网格线颜色。
// doris 的 ExplorerNG/components/QueryBuilder/utils/getMaxLabelWidth.ts 经 @/utils/getTextWidth 也用 FONT_FAMILY。
// getFontFamily.ts 与 fontFamilyConstant.ts 也是本轮从 fe v9.1.0 原样复制进来的；羚牛不是 ENT 形态，
// FONT_FAMILY 取值就是 NORMAL_FONT_FAMILY。import 写在文件末尾是为了让 git diff 保持 0 行删除（import 会被提升）。
import getFontFamily from './getFontFamily';

export const FONT_FAMILY = getFontFamily();
export const THEME = {
  light: {
    text: {
      primary: '#333',
    },
    gridColor: 'rgba(0, 10, 23, 0.09)',
  },
  dark: {
    text: {
      primary: '#fff',
    },
    gridColor: 'rgba(240, 250, 255, 0.09)',
  },
};
