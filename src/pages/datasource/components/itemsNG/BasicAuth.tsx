import React from 'react';
import { Input, Form, Row, Col, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  cate: string;
  showAuthEnable?: boolean;
  showTls?: boolean;
  /**
   * N33 批 A-4（B-5）：填了账号就必须填口令、反之亦然（两个都空仍然放过）。
   * 默认不开——不传就和改之前一字不差。给 victorialogs 用：后端
   * `datasource/victorialogs/victorialogs.go:107-110` 只给一个就报
   * `both username and password must be provided`。
   * opensearch 没传这个开关（它的 Validate 里没有这条成对校验）。
   * 上游 fe（v9.1.0 与 ee48e701）这个组件只有 `required: authEnable` 一条 → 羚牛自修。
   */
  pairRequired?: boolean;
}

export default function BasicAuth(props: Props) {
  const { t } = useTranslation('datasourceManage');
  const { cate, showAuthEnable, showTls, pairRequired } = props;
  const authEnable = Form.useWatch(['settings', `${cate}.basic`, `${cate}.auth.enable`]);
  const form = Form.useFormInstance();

  /** 成对校验：读另一个框的值，对方有值而自己空着就拦住 */
  const pairRule = (otherName: (string | number)[]) => ({
    validator: (_rule: any, value: any) => {
      if (!pairRequired) {
        return Promise.resolve();
      }
      const otherValue = form.getFieldValue(otherName);
      if (!value && otherValue) {
        return Promise.reject(new Error(t('form.basic_auth_pair_required')));
      }
      return Promise.resolve();
    },
  });
  const userName = ['settings', `${cate}.basic`, `${cate}.user`];
  const passName = ['settings', `${cate}.basic`, `${cate}.password`];

  return (
    <>
      <div className='page-title'>{t('form.auth')}</div>
      {showAuthEnable && (
        <div className='mb-2'>
          <span className='mr-2'>{t('auth_enable')}</span>
          <Form.Item name={['settings', `${cate}.basic`, `${cate}.auth.enable`]} initialValue={true} valuePropName='checked' noStyle>
            <Switch size='small' />
          </Form.Item>
        </div>
      )}
      <Form.Item name={['settings', `${cate}.basic`, `${cate}.is_encrypt`]} hidden initialValue={false}>
        <div />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={t('form.username')}
            name={userName}
            dependencies={pairRequired ? [passName] : undefined}
            rules={[{ required: authEnable }, pairRule(passName)]}
          >
            <Input autoComplete='off' />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={t('form.password')}
            name={passName}
            dependencies={pairRequired ? [userName] : undefined}
            rules={[{ required: authEnable }, pairRule(userName)]}
          >
            <Input.Password autoComplete='new-password' />
          </Form.Item>
        </Col>
      </Row>
      {showTls && (
        <div className='mb-4'>
          <span className='mr-2'>{t('skip_tls_verify')}</span>
          <Form.Item name={['settings', `${cate}.tls`, `${cate}.tls.skip_tls_verify`]} valuePropName='checked' noStyle>
            <Switch size='small' />
          </Form.Item>
        </div>
      )}
    </>
  );
}
