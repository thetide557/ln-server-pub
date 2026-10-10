/**
 * 新增/编辑回收规则弹窗
 * 对应原型：新增回收规则弹框
 * 动态逻辑：触发条件切换阈值标签与说明文案、回收动作切换说明文案、
 * 适用范围切换指定地址段多选、预计覆盖提示
 */
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select, TimePicker } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import {
  IpGroup,
  IpSegment,
  RecycleRule,
  RuleAction,
  ruleActionMap,
  RuleFreqType,
  ruleFreqMap,
  RuleTriggerType,
  ruleTriggerMap,
} from '../types';

interface RuleFormModalProps {
  visible: boolean;
  /** 编辑时传入规则，新增时为空 */
  rule?: RecycleRule;
  /** 归属分组 */
  group: IpGroup;
  /** 该分组下全部地址段（用于指定地址段选择与覆盖估算） */
  segments: IpSegment[];
  onClose: () => void;
  onOk: (values: {
    name: string;
    scopeType: 'all' | 'custom';
    customSegments: string[];
    triggerType: RuleTriggerType;
    thresholdDays?: number;
    action: RuleAction;
    freqType: RuleFreqType;
    freqValue: string;
    execTime: string;
    whitelist: string[];
    enabled: boolean;
  }) => Promise<void>;
}

export default function RuleFormModal(props: RuleFormModalProps) {
  const { visible, rule, group, segments } = props;
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (rule) {
        form.setFieldsValue({
          name: rule.name,
          scopeType: rule.scopeType,
          customSegments: rule.customSegments,
          triggerType: rule.triggerType,
          thresholdDays: rule.thresholdDays,
          action: rule.action,
          freqType: rule.freqType,
          freqValue: rule.freqValue,
          execTime: rule.execTime ? moment(rule.execTime, 'HH:mm') : undefined,
          whitelist: rule.whitelist,
          enabled: rule.enabled,
        });
      } else {
        form.setFieldsValue({
          scopeType: 'all',
          triggerType: RuleTriggerType.LongOffline,
          thresholdDays: 30,
          action: RuleAction.Mark,
          freqType: RuleFreqType.Daily,
          execTime: moment('02:00', 'HH:mm'),
          enabled: true,
        });
      }
    }
  }, [visible, rule]);

  const watchScopeType = Form.useWatch('scopeType', form);
  const watchCustomSegments = Form.useWatch('customSegments', form);
  const watchTriggerType: RuleTriggerType = Form.useWatch('triggerType', form);
  const watchAction: RuleAction = Form.useWatch('action', form);
  const watchFreqType: RuleFreqType = Form.useWatch('freqType', form);

  const triggerMeta = ruleTriggerMap[watchTriggerType] || ruleTriggerMap[RuleTriggerType.LongOffline];
  const actionMeta = ruleActionMap[watchAction] || ruleActionMap[RuleAction.Mark];
  const freqMeta = ruleFreqMap[watchFreqType] || ruleFreqMap[RuleFreqType.Daily];

  // 预计覆盖估算
  const scopeSegments =
    watchScopeType === 'custom'
      ? _.filter(segments, (item) => _.includes(watchCustomSegments, item.fullSegment))
      : segments;
  const coverCount = scopeSegments.length;
  const coverIpCount = _.sumBy(scopeSegments, (item) => item.allocatedCount + item.reservedIpCount);

  return (
    <Modal
      title={rule ? '编辑回收规则' : '新增回收规则'}
      visible={visible}
      width={640}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }} className='rule-form-modal'>
        <Form.Item
          label='规则名称'
          name='name'
          rules={[
            { required: true, message: '请输入规则名称' },
            { max: 30, message: '最多30个字符' },
          ]}
        >
          <Input placeholder='请输入规则名称' maxLength={30} />
        </Form.Item>
        <div style={{ marginBottom: 12, paddingLeft: 90 }}>归属：{group?.name}</div>
        <Form.Item label='适用范围' name='scopeType' style={{ marginBottom: 8 }} rules={[{ required: true, message: '请选择适用范围' }]}>
          <Select
            style={{ width: 260 }}
            onChange={() => {
              form.setFieldsValue({ customSegments: [] });
            }}
          >
            <Select.Option value='all'>当前分组全部地址段</Select.Option>
            <Select.Option value='custom'>指定地址段</Select.Option>
          </Select>
        </Form.Item>
        {watchScopeType === 'custom' && (
          <Form.Item
            label='指定地址段'
            name='customSegments'
            style={{ marginBottom: 8 }}
            rules={[{ required: true, message: '请选择地址段' }]}
          >
            <Select mode='multiple' style={{ width: '100%' }} placeholder='请选择'>
              {_.map(segments, (item) => (
                <Select.Option key={item.id} value={item.fullSegment}>
                  {item.fullSegment}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <div
          className='rule-scope-tip'
          style={{ marginLeft: 90, marginBottom: 12 }}
        >{`预计覆盖${coverCount}个地址段，约${coverIpCount}个已分配和预留地址参与扫描`}</div>
        <Form.Item label='触发条件' name='triggerType' style={{ marginBottom: 8 }} rules={[{ required: true, message: '请选择触发条件' }]}>
          <Select
            style={{ width: 320 }}
            onChange={() => {
              form.setFieldsValue({ thresholdDays: 30 });
            }}
          >
            {_.map(ruleTriggerMap, (item, key) => (
              <Select.Option key={key} value={key}>
                {item.text}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {triggerMeta.thresholdLabel && (
          <Form.Item
            label={triggerMeta.thresholdLabel}
            name='thresholdDays'
            style={{ marginBottom: 4 }}
            rules={[{ required: true, message: `请输入${triggerMeta.thresholdLabel}` }]}
          >
            <InputNumber min={1} max={3650} style={{ width: 120 }} placeholder='24' addonAfter='天' />
          </Form.Item>
        )}
        <div className='rule-field-tip' style={{ marginLeft: 90, marginBottom: 12 }}>
          ={triggerMeta.text}时，显示“{triggerMeta.tip}”；
        </div>
        <Form.Item label='回收动作' name='action' style={{ marginBottom: 4 }} rules={[{ required: true, message: '请选择回收动作' }]}>
          <Select style={{ width: 200 }}>
            {_.map(ruleActionMap, (item, key) => (
              <Select.Option key={key} value={key}>
                {item.text}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <div className='rule-field-tip' style={{ marginLeft: 90, marginBottom: 12 }}>
          ={actionMeta.text}时，显示“{actionMeta.tip}”；
        </div>
        <Form.Item label='执行频率' required style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', columnGap: 8 }}>
            <Form.Item name='freqType' noStyle rules={[{ required: true, message: '请选择执行频率' }]}>
              <Select style={{ width: 110 }}>
                {_.map(ruleFreqMap, (item, key) => (
                  <Select.Option key={key} value={key}>
                    {item.text}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {freqMeta.valueLabel && (
              <Form.Item
                name='freqValue'
                noStyle
                rules={[{ required: true, message: `请输入${freqMeta.valueLabel}` }]}
              >
                <Input placeholder={freqMeta.valueLabel} style={{ width: 90 }} />
              </Form.Item>
            )}
            <Form.Item name='execTime' noStyle rules={[{ required: true, message: '请选择执行时间' }]}>
              <TimePicker format='HH:mm' style={{ width: 100 }} />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item label='回收白名单' name='whitelist' style={{ marginBottom: 12 }}>
          <Select mode='tags' style={{ width: '100%' }} placeholder='请选择不参与回收的IP段/IP' open={false} suffixIcon={null} />
        </Form.Item>
        <Form.Item label='启用状态' name='enabled' rules={[{ required: true }]} initialValue={true}>
          <Select style={{ width: 120 }}>
            <Select.Option value={true}>启用</Select.Option>
            <Select.Option value={false}>停用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
