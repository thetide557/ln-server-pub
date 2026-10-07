import React from 'react';
import { Input, Form, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * N33 批 A-4（B-5）加了两个可选开关，默认都不开——不传就和改之前一字不差。
 * 这个组件被 6 张表单共用（prometheus / elasticsearch / jaeger / loki / tdengine / iotdb），
 * 所以不能一刀切地加必填，只能由各自的表单按后端的实际要求打开。
 *
 * - `required`：账号和口令都必填。给 tdengine / iotdb 用——两家的 REST 接口不带认证就回 401，
 *   后端材料里写的是「实际必填」（后端 `多数据源通电/调研-tdengine.md` §8 必填表那一行、`调研-iotdb.md` §8 同）。
 * - `pairRequired`：填了一个另一个就必填（两个都空仍然放过）。给 loki 用——后端
 *   `datasource/loki/loki.go:107-110` 只给一个就报 `both username and password must be provided`。
 *
 * 上游 fe（v9.1.0 与 ee48e701）这个组件两个 Form.Item 都没有 rules → 羚牛自修。
 */
interface IProps {
  /** 账号与口令都必填 */
  required?: boolean;
  /** 填了一个，另一个就必填 */
  pairRequired?: boolean;
}

export default function BasicAuth(props: IProps = {}) {
  const { t } = useTranslation('datasourceManage');
  const { required, pairRequired } = props;
  const form = Form.useFormInstance();

  /** 成对校验：读另一个框的值，对方有值而自己空着就拦住 */
  const pairRule = (otherName: string[]) => ({
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

  return (
    <>
      <div className='page-title'>{t('form.auth')}</div>
      <Row gutter={16}>
        <Col flex={'1'}>
          <Form.Item
            label={t('form.username')}
            name={['auth', 'basic_auth_user']}
            dependencies={pairRequired ? [['auth', 'basic_auth_password']] : undefined}
            rules={[{ required: !!required }, pairRule(['auth', 'basic_auth_password'])]}
          >
            <Input autoComplete='off' />
          </Form.Item>
        </Col>
        <Col flex={'1'}>
          <Form.Item
            label={t('form.password')}
            name={['auth', 'basic_auth_password']}
            dependencies={pairRequired ? [['auth', 'basic_auth_user']] : undefined}
            rules={[{ required: !!required }, pairRule(['auth', 'basic_auth_user'])]}
          >
            <Input.Password autoComplete='new-password' />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
