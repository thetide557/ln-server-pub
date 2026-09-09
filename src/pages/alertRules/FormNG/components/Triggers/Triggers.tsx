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
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）新增的一个可选参数 ----
  // cate（数据源类型）在 fe 的告警表单里是顶层字段，在羚牛的多策略表单里在 ['strategies', n, 'cate']。
  // 不传时默认 ['cate']，与 fe 原样。
  catePath?: (string | number)[];
}

export default function index(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { feats } = useContext(CommonStateContext);
  const { prefixField = {}, prefixName = [], queries, disabled, initialValue, catePath = ['cate'] } = props;
  // 第六步 第4段 W0（阶段 0 · ck 试点）：fullPrefixName 不传时默认等于 prefixName——
  // fe 的告警表单是平铺的，两者本来就一样，所以这个默认值保证 fe 原有调用方行为一字不变。
  // 羚牛的表单外面套了一层 Form.List name='strategies'，两者就分开了：
  //   prefixName     = [n, 'rule_config']              —— 相对路径，给 Form.Item / Form.List 用（antd 会自动补上 'strategies'）
  //   fullPrefixName = ['strategies', n, 'rule_config'] —— 绝对路径，给 Form.useWatch / getFieldValue 用
  // 为什么必须分开：antd 的 useWatch 是拿 namePath 直接去表单根上取值的
  //（见 node_modules/rc-field-form/lib/useWatch.js 里 getValue(store, namePathRef.current)），
  // **不吃 Form.List 的相对前缀**；只传相对路径会取到 undefined，下面三块 UI 会静默不显示。
  const { fullPrefixName = prefixName } = props;

  const cate = Form.useWatch(catePath);
  const exp_trigger_disable = Form.useWatch([...fullPrefixName, 'exp_trigger_disable']);
  const nodata_trigger_enable = Form.useWatch([...fullPrefixName, 'nodata_trigger', 'enable']);
  const anomaly_trigger_enable = Form.useWatch([...fullPrefixName, 'anomaly_trigger', 'enable']);

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
              <Inhibit triggersKey='triggers' />
            </div>
            <Form.List {...prefixField} name={[...prefixName, 'triggers']} initialValue={initialValue}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => {
                    return (
                      <div key={field.key} className='relative'>
                        <Trigger
                          prefixField={_.omit(field, 'key')}
                          fullPrefixName={[...fullPrefixName, 'triggers', field.name]}
                          rootFullPrefixName={fullPrefixName}
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
            <NodataTrigger prefixName={prefixName} fullPrefixName={fullPrefixName} hideSwitch />
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
              <AnomalyTrigger prefixName={prefixName} fullPrefixName={fullPrefixName} active hideSwitch />
            </div>
          )}
        </CardContainer>
      )}
    </div>
  );
}
