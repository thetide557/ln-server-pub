import React from 'react';
import { Form, Space, Switch, Radio, Checkbox, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  disabled?: boolean;
  prefixName?: (string | number)[]; // 列表字段名
  // 第六步 第4段 W0（阶段 0 · ck 试点）：给 useWatch 用的绝对路径，不传默认等于 prefixName（fe 原样）
  fullPrefixName?: (string | number)[];
  hideSwitch?: boolean; // 在卡片模式下隐藏开关，由父组件控制
}

export default function NodataTrigger(props: Props) {
  const { t } = useTranslation('alertRules');
  const { disabled, prefixName = [], fullPrefixName = prefixName, hideSwitch } = props;
  const names = [...prefixName, 'nodata_trigger'];
  const fullNames = [...fullPrefixName, 'nodata_trigger'];
  const enable = Form.useWatch([...fullNames, 'enable']);

  return (
    <div>
      {!hideSwitch && (
        <Space className='mb-4'>
          <Form.Item noStyle name={[...names, 'enable']} valuePropName='checked'>
            <Switch size='small' />
          </Form.Item>
          {t('nodata_trigger.enable')}
        </Space>
      )}
      <div style={{ display: enable !== true ? 'none' : 'block' }}>
        <div className='mb-4'>
          <Space align='baseline'>
            {t('severity_label')}
            <Form.Item name={[...names, 'severity']} rules={enable === true ? [{ required: true, message: 'Missing severity' }] : []} noStyle initialValue={2}>
              <Radio.Group disabled={disabled || enable !== true}>
                <Radio value={1}>{t('common:severity.1')}</Radio>
                <Radio value={2}>{t('common:severity.2')}</Radio>
                <Radio value={3}>{t('common:severity.3')}</Radio>
              </Radio.Group>
            </Form.Item>
          </Space>
        </div>
        <div className='mb-4'>
          <Space align='baseline'>
            <Form.Item noStyle name={[...names, 'resolve_after_enable']} valuePropName='checked'>
              <Checkbox />
            </Form.Item>
            {t('nodata_trigger.resolve_after')}
            <Form.Item noStyle name={[...names, 'resolve_after']} initialValue={1800}>
              <InputNumber min={0} />
            </Form.Item>
            {t('nodata_trigger.resolve_after_unit')}
          </Space>
        </div>
      </div>
    </div>
  );
}
