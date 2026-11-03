/**
 * 薄适配层（第六步 ES 升级轮 step6f，按 L 的拍板-31 第 3 条「不改 QueryEditor/index.tsx」）。
 *
 * 为什么要它：pub 的 `src/pages/dashboard/Editor/QueryEditor/index.tsx:61` 传给 <Elasticsearch> 的是
 * `{ chartForm, variableConfig, dashboardId }`（羚牛这边一直是这个签名），
 * 而 fe v9.1.0 的 ES 查询编辑器只收 `{ datasourceValue }`（fe 同目录 index.tsx:9）。
 * 两边对不上，直接覆盖会让编辑器拿不到数据源 id，索引下拉框就查不出东西。
 *
 * 做法：把 fe 那个入口文件原样放在同目录的 `QueryList.tsx`（内容与 fe v9.1.0 的 index.tsx 逐字相同，只改了文件名），
 * 这里再包一层，从表单里把 datasourceValue 取出来交给它——写法照 pub 同一个 index.tsx 里
 * iotdb / tdengine / ck / doris 四个分支的做法（`QueryEditor/index.tsx:70-96`）。
 * 这样 `import Elasticsearch from './Elasticsearch'` 那一行接线一个字没动。
 */
import React from 'react';
import { Form } from 'antd';

import ElasticsearchQueryList from './QueryList';

export default function Elasticsearch(_props: any) {
  return (
    <Form.Item shouldUpdate noStyle>
      {({ getFieldValue }) => <ElasticsearchQueryList datasourceValue={getFieldValue('datasourceValue')} />}
    </Form.Item>
  );
}
