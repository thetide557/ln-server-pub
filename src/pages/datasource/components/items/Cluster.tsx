import React, { useEffect, useState } from 'react';
import { Form, Select } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { getServerClusters } from '../../services';

export default function Cluster({ form, clusterRef }) {
  const { t } = useTranslation('datasourceManage');
  const [clusters, setClusters] = useState<string[]>([]);

  useEffect(() => {
    getServerClusters().then((res) => {
      setClusters(res);
      // 新增的时候，自动填充第一个集群
      const values = form.getFieldsValue();
      if (values?.cluster_name === undefined) {
        form.setFieldsValue({ cluster_name: res?.[0] });
      }
      form.validateFields(['cluster_name']);
    });
  }, []);

  return (
    // ---- N36 批 H1 第 8 条（后端第九份第二节 7）：这一项填错会「静默」——数据源存得下、面板也能出图，
    // 但该数据源下的告警规则一条都不会被求值，界面上没有任何提示。所以把原来藏在 tooltip 里的要点
    // 挪出来一行明写：默认 default；必须与告警引擎的名字一致。
    //（`settings.*.cluster_name` 会覆盖顶层的这个值，后端第九份第二节 7 原话。）
    // 文案是羚牛自写、上游 fe 无（上游这里只有 tooltip 一句）。
    <Form.Item
      label={t('form.cluster')}
      name='cluster_name'
      tooltip={t('form.cluster_tip')}
      extra={<span className='second-color'>{t('form.cluster_match_tip')}</span>}
      rules={[
        {
          validator: (_field, value) => {
            const invalidCluster = !_.find(clusters, (item) => item === value) && value !== 'no_assigned_engine';
            if (invalidCluster) {
              return Promise.reject(t('form.cluster_not_found'));
            }
            return Promise.resolve();
          },
        },
      ]}
    >
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
