import React from 'react';
import { Form, Radio, Space } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import Severity from '@/pages/alertRules/Form/components/Severity';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';

import Builder from './Builder';
import Code from './Code';
import RecoverConfig from './RecoverConfig';
import Joins from './Joins';

interface IProps {
  prefixField?: any;
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名
  queries: any[];
  disabled?: boolean;
  onClose?: () => void;
  // 第六步 第4段 W0：原来本文件自己 watch 了一次写死路径的 rule_config.exp_trigger_disable；
  // 父组件 Triggers.tsx 已经 watch 过同一个值，改成传下来，省一次订阅也去掉写死的路径。
  expTriggerDisable?: boolean;
}

export default function Trigger(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { prefixField = {}, fullPrefixName = [], prefixName = [], queries, disabled, onClose, expTriggerDisable } = props;
  // 第六步 第4段 W0：fe 原文这里自己 watch 了一次「顶层 rule_config 下的 exp_trigger_disable」——
  // 那是写死的顶层绝对路径，在羚牛的多策略表单里取到 undefined，会让下面 :28 的 validateDisabled 恒为 true、
  // 把 Severity / Builder / Code 的必填校验全部静默关掉。改成由 Triggers.tsx 把它 watch 到的值传下来。
  const exp_trigger_disable = expTriggerDisable;
  const validateDisabled = disabled || exp_trigger_disable !== false;
  const [expanded, setExpanded] = React.useState(false);

  return (
    <CardContainer className='bg-fc-150' onClose={onClose}>
      <CardContainerHeader>
        <Form.Item {...prefixField} name={[...prefixName, 'mode']}>
          <Radio.Group buttonStyle='solid' size='small' disabled={disabled}>
            <Radio.Button value={0}>{t('datasource:es.alert.trigger.builder')}</Radio.Button>
            <Radio.Button value={1}>{t('datasource:es.alert.trigger.code')}</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </CardContainerHeader>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const mode = getFieldValue([...fullPrefixName, 'mode']);
          if (mode == 0) {
            return <Builder prefixField={prefixField} prefixName={prefixName} queries={queries} disabled={disabled} validateDisabled={validateDisabled} />;
          }
          if (mode === 1) {
            return <Code prefixField={prefixField} prefixName={prefixName} disabled={disabled} validateDisabled={validateDisabled} />;
          }
        }}
      </Form.Item>
      <div className='mb-4'>
        <Severity field={prefixField} disabled={disabled} validateDisabled={validateDisabled} />
      </div>
      <div>
        <div className='mb-2'>
          <Space
            className='cursor-pointer'
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            {t('trigger.advanced_settings.label')}
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </Space>
        </div>
        <div
          style={{
            display: expanded ? 'block' : 'none',
          }}
        >
          <RecoverConfig {...props} />
          <Joins {...props} />
        </div>
      </div>
    </CardContainer>
  );
}
