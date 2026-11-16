// ---- 第六步 N33 批 B（B-2 九种详情抽屉空白）：照 fe v9.1.0 src/pages/datasource/Datasources/Detail.tsx
// 把 12 个分支补齐。原来羚牛这份只有 prometheus / elasticsearch / jaeger 三个分支（19 行），
// 另外九种新类型全落最后那行 `plus:` 占位——而 `plus:` 在版本 A 里解析成 PlusPlaceholder（返回 null，
// plugins/plusResolve.ts:16-18、plugins/PlusPlaceholder.tsx:3-5），所以列表里点开这九种的详情抽屉时，
// 「HTTP」「认证」「Headers」那几块整块不显示。依据：n29/结论正本.md B-2、n29/拿不准-W4.md U-W4-2。
// 这九个被 import 的 Detail 组件都是纯只读展示（不发任何请求、口令一律显示成 ******），
// 在上游 v9.1.0..ee48e701 之间零改动，本批原样搬过来。
// jaeger 这一支照上游用字面量 'jaeger'（羚牛 DatasourceCateEnum 里没有 jaeger 这个值）。
import React from 'react';

import { DatasourceCateEnum } from '@/utils/constant';
import Clickhouse from '@/plugins/clickHouse/Datasource/Detail';
import Opensearch from '@/plugins/opensearch/Datasource/Detail';
import MySQL from '@/plugins/mysql/Datasource/Detail';
import PgSQL from '@/plugins/pgsql/Datasource/Detail';
import Doris from '@/plugins/doris/Datasource/Detail';
import Victorialogs from '@/plugins/victorialogs/Datasource/Detail';

import Prometheus from './Prometheus/Detail';
import ElasticSearch from './ElasticSearch/Detail';
import Jaeger from './Jaeger/Detail';
import IotDB from './iotdb/Detail';
import TDengine from './TDengine/Detail';
import Loki from './Loki/Detail';

// @ts-ignore
import Plus from 'plus:/parcels/Datasource/Detail';

export default function Form(props) {
  if (props.data.plugin_type === DatasourceCateEnum.prometheus) {
    return <Prometheus {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.elasticsearch) {
    return <ElasticSearch {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.opensearch) {
    return <Opensearch {...props} />;
  }
  if (props.data.plugin_type === 'jaeger') {
    return <Jaeger {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.iotdb) {
    return <IotDB {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.tdengine) {
    return <TDengine {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.loki) {
    return <Loki {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.ck) {
    return <Clickhouse {...props} type='ck' />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.mysql) {
    return <MySQL {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.pgsql) {
    return <PgSQL {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.doris) {
    return <Doris {...props} />;
  }
  if (props.data.plugin_type === DatasourceCateEnum.victorialogs) {
    return <Victorialogs {...props} />;
  }
  return <Plus type={props.data.plugin_type} {...props} />;
}
