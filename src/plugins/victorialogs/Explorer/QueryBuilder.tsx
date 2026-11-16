import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Form, Space, Row, Col, InputNumber } from 'antd';

import { SIZE } from '@/utils/constant';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';

import { NAME_SPACE } from '../constants';
import QueryInput from './components/QueryInput';

interface Props {
  executeQuery: () => void;
}

export default function QueryBuilder(props: Props) {
  // step6d(B1)：TS 4.3 在这个文件里把 i18next 的 t 推到 TS2589「类型实例化过深」（NAME_SPACE 是枚举值不是字面量，
  // 且本文件还叠了 antd Form + InputGroupWithFormItem 的泛型）。fe 用 TS 4.9 不报。只在这一处 as any。
  const { t } = useTranslation(NAME_SPACE as string);
  const { executeQuery } = props;

  return (
    <div>
      <Row gutter={SIZE}>
        <Col flex='auto'>
          <InputGroupWithFormItem label={<Space>{t('explorer.query')}</Space>}>
            <Form.Item
              name={['query', 'query']}
              rules={[
                {
                  required: true,
                  message: t('explorer.query_required'),
                },
              ]}
              initialValue='*'
            >
              <QueryInput onChange={executeQuery} />
            </Form.Item>
          </InputGroupWithFormItem>
        </Col>
        <Col flex='none'>
          <InputGroupWithFormItem label={<Space>{t('explorer.limit')}</Space>}>
            <Form.Item name={['query', 'limit']} initialValue={500}>
              <InputNumber min={0} controls={false} />
            </Form.Item>
          </InputGroupWithFormItem>
        </Col>
      </Row>
    </div>
  );
}
