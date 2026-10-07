import React, { useEffect, useState } from 'react';
import { Form, Select } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { getServerClusters } from '../../services';

export default function Cluster({ cate, clusterRef }) {
  const { t } = useTranslation('datasourceManage');
  const [clusters, setClusters] = useState<any[]>([]);
  const form = Form.useFormInstance();

  useEffect(() => {
    getServerClusters().then((res) => {
      setClusters(res);
      // 新增的时候，自动填充第一个集群。
      // N33 批 A-4（B-4，lead 拍板 L-03）：原来读写的是**顶层** cluster_name，
      // 而下面渲染出来的 Form.Item 是 ['settings', `${cate}.cluster_name`]，两者不是同一个字段——
      // 结果下拉框还是空的（要用户手选），同时请求体里凭空多出一个顶层 cluster_name。
      // 上游 fe 的 v9.1.0 与 ee48e701 这里逐字相同、未修（见 N29 前端补充-opensearch.md N-os-04），
      // 所以是羚牛自修。用 setFields 按路径设，不用 setFieldsValue({ settings: {...} })——
      // 后者会整体覆盖 settings，把同一张表单里别的 settings.* 字段（节点、账号、header）清掉。
      // 老的 components/items/Cluster.tsx 不动：它的 Form.Item 本来就是顶层 cluster_name，两边是一致的。
      const namePath = ['settings', `${cate}.cluster_name`];
      if (form.getFieldValue(namePath) === undefined) {
        form.setFields([{ name: namePath, value: res?.[0] }]);
      }
    });
  }, []);
  return (
    <Form.Item label={t('form.cluster')} name={['settings', `${cate}.cluster_name`]} tooltip={t('form.cluster_tip')}>
      <Select ref={clusterRef} allowClear>
        {_.map(_.concat(clusters, 'no_assigned_engine'), (item) => {
          return (
            <Select.Option key={item} value={item}>
              {item}
            </Select.Option>
          );
        })}
      </Select>
    </Form.Item>
  );
}
