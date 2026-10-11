import React, { useRef } from 'react';
import { Form, Card, Input, InputNumber, Space, Switch, Row, Col } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { DatasourceCateEnum, SIZE } from '@/utils/constant';
import { scrollToFirstError } from '@/utils';
import Name from '@/pages/datasource/components/items/Name';
import Description from '@/pages/datasource/components/items/Description';
import Footer from '@/pages/datasource/components/items/Footer';
import BasicAuth from '@/pages/datasource/components/itemsNG/BasicAuth';
import Headers from '@/pages/datasource/components/itemsNG/Headers';
import Cluster from '@/pages/datasource/components/itemsNG/Cluster';

export default function FormCpt({ action, data, onFinish, submitLoading }: any) {
  const { t } = useTranslation('datasourceManage');
  const [form] = Form.useForm();
  const clusterRef = useRef<any>();
  const cate = DatasourceCateEnum.victorialogs;

  return (
    <Form
      form={form}
      layout='vertical'
      onFinish={(values) => {
        onFinish(values, clusterRef.current);
      }}
      onFinishFailed={() => {
        scrollToFirstError();
      }}
      initialValues={data}
      className='settings-source-form'
    >
      <Card title={t(`${action}_title`)}>
        <Name />
        {/* N33 批 A-4（B-5）：地址加必填。后端 datasource/victorialogs/victorialogs.go:96-97
            对空地址报 `victorialogs.addr is required`。
            上游 fe（v9.1.0 与 ee48e701 的同文件 :36）没有 rules → 羚牛自修。 */}
        {/* ---- N36 批 H1 第 7 条（后端第九份第二节 6）：VictoriaLogs 的地址**不带任何路径、也不带尾斜杠**
            （后端实测；loki 那边反过来，必须以 `/loki` 结尾）。上游 fe `ee48e701` 同文件 :37 的 placeholder
            写的是 `http://localhost:9428/`，带尾斜杠——照抄会被用户当样板跟着填，所以这里**故意偏离上游**
            去掉尾斜杠，并在下面加一句说明。lead 预拍 D-N36-19。 */}
        <Form.Item
          label='HTTP'
          name={['settings', `${cate}.addr`]}
          rules={[{ required: true }]}
          extra={<span className='second-color'>{t('form.vl_addr_tip')}</span>}
        >
          <Input autoComplete='off' placeholder='http://localhost:9428' />
        </Form.Item>
        <Row gutter={SIZE * 2}>
          <Col span={12}>
            <Form.Item label={t('form.timeout')} name={['settings', `${cate}.timeout`]} initialValue={10000}>
              <InputNumber controls={false} min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t('form.logs_max_query_rows')} name={['settings', `${cate}.max_query_rows`]} initialValue={500}>
              <InputNumber controls={false} min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {/* N33 批 A-4（B-5）：vl 的账号 / 口令后端要求成对（datasource/victorialogs/victorialogs.go:107-110） */}
        <BasicAuth cate={cate} pairRequired />
        <Space className='mb-2'>
          <span>{t('form.skip_tls_verify')}</span>
          <Form.Item name={['settings', `${cate}.tls`, `${cate}.tls.skip_tls_verify`]} valuePropName='checked' noStyle>
            <Switch size='small' />
          </Form.Item>
        </Space>
        <Headers cate={cate} />
        <div className='page-title' style={{ marginTop: 0 }}>
          {t('form.other')}
        </div>
        <Cluster cate={cate} clusterRef={clusterRef} />
        <Description />
      </Card>
      <Footer id={data?.id} submitLoading={submitLoading} />
    </Form>
  );
}
