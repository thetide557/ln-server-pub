import React from 'react';
import { useParams } from 'react-router-dom';
import Prometheus from './Prometheus/Form';
import ElasticSearch from './ElasticSearch/Form';
import Jaeger from './Jaeger/Form';
// @ts-ignore
import Plus from 'plus:/parcels/Datasource/Form';
// ---- 第六步 L1（多数据源）：九种新类型的表单，照 fe v9.1.0 src/pages/datasource/Datasources/Form.tsx:4-17 搬。
// 只 import 到 `<t>/Datasource/Form` 这一层，不 import `@/plugins/<t>`（裸目录的 index.tsx 会把查询页、
// 告警规则页那一大堆闭包全带进来）。
import { DatasourceCateEnum } from '@/utils/constant';
import Clickhouse from '@/plugins/clickHouse/Datasource/Form';
import Opensearch from '@/plugins/opensearch/Datasource/Form';
import MySQL from '@/plugins/mysql/Datasource/Form';
import PgSQL from '@/plugins/pgsql/Datasource/Form';
import Doris from '@/plugins/doris/Datasource/Form';
import Victorialogs from '@/plugins/victorialogs/Datasource/Form';
import IotDB from './iotdb/Form';
import TDengine from './TDengine/Form';
import Loki from './Loki/Form';
// mysql 表单的连接信息组件用 n9e-mysql 这个命名空间的词条，pub 不自动收集 locale，得有人 import 一下
import '@/plugins/mysql/locale';

export default function Form(props) {
  const params = useParams<{ action: string; type: string }>();
  if (params.type === 'prometheus') {
    return <Prometheus {...props} />;
  }
  if (params.type === 'elasticsearch') {
    return <ElasticSearch {...props} />;
  }
  if (params.type === 'jaeger') {
    return <Jaeger {...props} />;
  }
  // ---- 第六步 L1（多数据源）：下面九个分支照 fe v9.1.0 同文件 :29-58 追加，只加不改。
  // 老的三个分支（prometheus / elasticsearch / jaeger）在上面，一个字没动。
  if (params.type === DatasourceCateEnum.opensearch) {
    return <Opensearch {...props} />;
  }
  if (params.type === DatasourceCateEnum.iotdb) {
    return <IotDB {...props} />;
  }
  if (params.type === DatasourceCateEnum.tdengine) {
    return <TDengine {...props} />;
  }
  if (params.type === DatasourceCateEnum.loki) {
    return <Loki {...props} />;
  }
  if (params.type === DatasourceCateEnum.ck) {
    return <Clickhouse {...props} type='ck' />;
  }
  if (params.type === DatasourceCateEnum.mysql) {
    return <MySQL {...props} />;
  }
  if (params.type === DatasourceCateEnum.pgsql) {
    return <PgSQL {...props} />;
  }
  if (params.type === DatasourceCateEnum.doris) {
    return <Doris {...props} />;
  }
  if (params.type === DatasourceCateEnum.victorialogs) {
    return <Victorialogs {...props} />;
  }
  return <Plus type={params.type} {...props} />;
}
