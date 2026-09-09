import React, { useContext } from 'react';
import { Form, Switch, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import CardContainer from '@/pages/alertRules/FormNG/components/CardContainer';

import Trigger from './Trigger';
import NodataTrigger from './NodataTrigger';
import AnomalyTrigger from './AnomalyTrigger';

interface IProps {
  prefixField?: any;
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名
  queries: any[];
  disabled?: boolean;
  initialValue?: any;
  // 第六步 第4段 W0：cate 在 fe 里是顶层字段，羚牛在每条策略上，所以改成可以由上层传进来
  cate?: string;
}

export default function index(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { feats } = useContext(CommonStateContext);
  const { prefixField = {}, fullPrefixName = [], prefixName = [], queries, disabled, initialValue, cate: cateProp } = props;
  // 第六步 第4段 W0（规矩 A，出处 第4段/顾问问答-大顾问.md Q1 第二、三节）：
  // Form.Item / Form.List 的 name= 用相对路径 prefixName；useWatch / getFieldValue 用绝对路径 absPrefix。
  // 不传 fullPrefixName 时 absPrefix === prefixName，fe 原有调用方行为一字不变。
  const absPrefix = [...fullPrefixName, ...prefixName];

  // hook 不能条件调用，所以先照 fe 原样 watch 顶层 cate，再优先用上层传进来的 cate
  const watchedCate = Form.useWatch(['cate']);
  const cate = cateProp ?? watchedCate;
  const exp_trigger_disable = Form.useWatch([...absPrefix, 'exp_trigger_disable']);
  const nodata_trigger_enable = Form.useWatch([...absPrefix, 'nodata_trigger', 'enable']);
  const anomaly_trigger_enable = Form.useWatch([...absPrefix, 'anomaly_trigger', 'enable']);

  const showAnomalyTrigger = cate === 'prometheus' && feats?.fcBrain === true;

  return (
    <div>
      <FormItemLabel>{t('form_ng.triggers')}</FormItemLabel>

      {/* 阈值判断 */}
      <CardContainer className='mb-2'>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <span className='font-bold'>{t('trigger.title')}</span>
            <Form.Item
              noStyle
              name={[...prefixName, 'exp_trigger_disable']}
              valuePropName='checked'
              getValueFromEvent={(checked) => !checked}
              getValueProps={(value) => ({ checked: !value })}
            >
              <Switch size='small' />
            </Form.Item>
          </div>
          <div className='text-soft'>{t('form_ng.triggers_threshold_desc')}</div>
        </div>
        {exp_trigger_disable === false && (
          <div className='mt-4'>
            <div className='mb-4'>
              <Inhibit triggersKey='triggers' prefixName={absPrefix} />
            </div>
            <Form.List {...prefixField} name={[...prefixName, 'triggers']} initialValue={initialValue}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => {
                    return (
                      <div key={field.key} className='relative'>
                        <Trigger
                          prefixField={_.omit(field, 'key')}
                          fullPrefixName={[...absPrefix, 'triggers', field.name]}
                          expTriggerDisable={exp_trigger_disable}
                          prefixName={[field.name]}
                          queries={queries}
                          disabled={disabled}
                          onClose={fields.length > 1 ? () => remove(field.name) : undefined}
                        />
                      </div>
                    );
                  })}
                  <Button
                    className='w-full'
                    type='dashed'
                    icon={<PlusOutlined />}
                    onClick={() => {
                      add({
                        mode: 0,
                        expressions: [
                          {
                            ref: queries?.[0]?.ref || 'A',
                            comparisonOperator: '==',
                            logicalOperator: '&&',
                          },
                        ],
                        severity: 2,
                      });
                    }}
                  >
                    {t('form_ng.threshold_judgment')}
                  </Button>
                </>
              )}
            </Form.List>
          </div>
        )}
      </CardContainer>

      {/* 数据缺失 */}
      <CardContainer className='mb-2'>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-2'>
            <span className='font-bold'>{t('nodata_trigger.title')}</span>
            <Form.Item noStyle name={[...prefixName, 'nodata_trigger', 'enable']} valuePropName='checked'>
              <Switch size='small' />
            </Form.Item>
          </div>
          <div className='text-soft'>{t('form_ng.triggers_nodata_desc')}</div>
        </div>
        {nodata_trigger_enable === true && (
          <div className='mt-4'>
            <NodataTrigger prefixName={prefixName} fullPrefixName={fullPrefixName} disabled={disabled} hideSwitch />
          </div>
        )}
      </CardContainer>

      {/* 智能告警 */}
      {showAnomalyTrigger && (
        <CardContainer className='mb-2'>
          <div className='flex flex-col gap-0.5'>
            <div className='flex items-center gap-2'>
              <span className='font-bold'>{t('anomaly_trigger.title')}</span>
              <Form.Item noStyle name={[...prefixName, 'anomaly_trigger', 'enable']} valuePropName='checked'>
                <Switch size='small' />
              </Form.Item>
            </div>
            <div className='text-soft'>{t('form_ng.triggers_anomaly_desc')}</div>
          </div>
          {anomaly_trigger_enable === true && (
            <div className='mt-4'>
              <AnomalyTrigger prefixName={prefixName} active hideSwitch />
            </div>
          )}
        </CardContainer>
      )}
    </div>
  );
}
