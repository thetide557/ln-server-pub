import React from 'react';
import { Form } from 'antd';
import _ from 'lodash';

import { DatasourceCateEnum } from '@/utils/constant';
import * as CKMeta from '@/plugins/clickHouse/components/Meta';

// @ts-ignore
import DatasourceSelectExtra from 'plus:/components/DatasourceSelectExtra';

// ---- 第六步 第4段 W2（阶段 2）：本文件从 fe v9.1.0 原样搬来，只删掉了三段 pub 没有对应模块的分支。
// fe 原文（git -C fe show v9.1.0:src/pages/alertRules/Form/components/DatasourceSelectExtra/index.tsx）
// 里还有三条分支和两条 import：
//   import * as Meta from '@/components/Meta';                       —— pub 没有这个目录（ls src/components/Meta 不存在）
//   import * as MySQLMeta from '@/plugins/mysql/components/Meta';    —— pub 的 src/plugins/mysql 下只有 constants.ts / Datasource / locale
//   fe:18-19  ck    -> CKMeta.MetaModal      （保留，pub 有 src/plugins/clickHouse/components/Meta）
//   fe:21-23  mysql -> MySQLMeta.MetaModal   （删，模块缺）
//   fe:24-26  pgsql -> Meta.MetaModal        （删，模块缺）
//   fe:27-29  doris -> Meta.MetaModal        （删，模块缺）
// 影响面为零：本组件只有 DatasourceValueSelect/V2.tsx 在 showExtra 为真时才渲染（V2.tsx:301），
// 而羚牛的告警规则表单挂 V2 时不传 showExtra（Form/Rule/Rule/Metric/index.tsx 的新 8 种分支）。
// 「元数据浏览」这个便利功能要不要补，登记在 拿不准-W2.md 第 1 条。
export default function index(props: { size?: 'small' | 'middle' | 'large' }) {
  const { size } = props;
  const datasourceCate = Form.useWatch('cate');
  const datasourceValue = Form.useWatch('datasource_value');

  if (datasourceCate === DatasourceCateEnum.ck && datasourceValue !== undefined) {
    return <CKMeta.MetaModal datasourceValue={datasourceValue} size={size} />;
  }
  return <DatasourceSelectExtra datasourceCate={datasourceCate} datasourceValue={datasourceValue} size={size} />;
}
