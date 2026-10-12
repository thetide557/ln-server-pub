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
import { getWhitelistOptions } from '../mock';

/** 每周可选星期（存值与 mock 一致：一~日） */
const WEEK_OPTIONS = _.map(['一', '二', '三', '四', '五', '六', '日'], (w) => ({ value: w, label: `周${w}` }));
/** 每月可选日期 1日~31日（存值：1~31） */
const MONTH_DAY_OPTIONS = _.map(_.range(1, 32), (d) => ({ value: String(d), label: `${d}日` }));
/** 每年可选月份 1月~12月 */
const YEAR_MONTH_OPTIONS = _.map(_.range(1, 13), (m) => ({ value: m, label: `${m}月` }));
/** 根据月份返回有效天数：1/3/5/7/8/10/12月=31天，4/6/9/11月=30天，2月=28天（不考虑闰年） */
function daysInMonth(month?: number): number {
  if (!month || month < 1 || month > 12) return 31;
  if (month === 2) return 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

interface RuleFormModalProps {
  visible: boolean;
  /** 编辑时传入规则，新增时为空 */
  rule?: RecycleRule;
  /** 归属分组 */
  group: IpGroup;
  /** 该分组下全部地址段（用于指定地址段选择与覆盖估算） */
  segments: IpSegment[];
  /** 查看模式：表单与编辑完全一致但全部禁用，无提交按钮 */
  disabled?: boolean;
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
        // 每年类型 freqValue 存「M月D日」（如3月1日），回显时拆为月/日两个控件
        const yearMatch = rule.freqType === RuleFreqType.Yearly ? rule.freqValue?.match(/(\d+)月(\d+)日/) : null;
        form.setFieldsValue({
          name: rule.name,
          scopeType: rule.scopeType,
          customSegments: rule.customSegments,
          triggerType: rule.triggerType,
          thresholdDays: rule.thresholdDays,
          action: rule.action,
          freqType: rule.freqType,
          freqValue: rule.freqType === RuleFreqType.Yearly ? undefined : rule.freqValue,
          freqMonth: yearMatch ? Number(yearMatch[1]) : undefined,
          freqDay: yearMatch ? Number(yearMatch[2]) : undefined,
          execTime: rule.execTime ? moment(rule.execTime, 'HH:mm:ss') : undefined,
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
          execTime: moment('02:00:00', 'HH:mm:ss'),
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
  const watchFreqMonth: number | undefined = Form.useWatch('freqMonth', form);

  const triggerMeta = ruleTriggerMap[watchTriggerType] || ruleTriggerMap[RuleTriggerType.LongOffline];
  const actionMeta = ruleActionMap[watchAction] || ruleActionMap[RuleAction.Mark];
  // 每年：按已选月份过滤有效日选项（2月28天、4/6/9/11月30天、其余31天）
  const yearDayOptions = _.map(_.range(1, daysInMonth(watchFreqMonth) + 1), (d) => ({ value: d, label: `${d}日` }));
  // 回收白名单可选项：全部地址段 + 全部已有 IP（下拉多选）
  const whitelistOptions = getWhitelistOptions();

  // 预计覆盖估算
  const scopeSegments =
    watchScopeType === 'custom'
      ? _.filter(segments, (item) => _.includes(watchCustomSegments, item.fullSegment))
      : segments;
  const coverCount = scopeSegments.length;
  const coverIpCount = _.sumBy(scopeSegments, (item) => item.allocatedCount + item.reservedIpCount);

  return (
    <Modal
      title={props.disabled ? '查看回收规则' : rule ? '编辑回收规则' : '新增回收规则'}
      visible={visible}
      width={640}
      onCancel={props.onClose}
      footer={props.disabled ? null : undefined}
      onOk={async () => {
        const values = await form.validateFields();
        // 每年类型：把月/日两个控件合并为 freqValue（M月D日）后提交，外部接口保持单一字段
        const { freqMonth, freqDay, ...rest } = values;
        await props.onOk({
          ...rest,
          freqValue: values.freqType === RuleFreqType.Yearly ? `${freqMonth}月${freqDay}日` : values.freqValue,
        });
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }} className='rule-form-modal' disabled={props.disabled}>
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
        <Form.Item
          label='归属'
        >
          <div>{group?.name}</div>
        </Form.Item>
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
          {/* ={triggerMeta.text}时，显示“{triggerMeta.tip}”； */}
          {triggerMeta.tip}
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
          {/* ={actionMeta.text}时，显示“{actionMeta.tip}”； */}
          {actionMeta.tip}
        </div>
        <Form.Item label='执行频率' required style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', columnGap: 8, flexWrap: 'wrap', rowGap: 8 }}>
            <Form.Item name='freqType' noStyle rules={[{ required: true, message: '请选择执行频率' }]}>
              <Select
                style={{ width: 90 }}
                onChange={() => {
                  // 切换频率类型时清空联动字段，避免残留旧值
                  form.setFieldsValue({ freqValue: undefined, freqMonth: undefined, freqDay: undefined });
                }}
              >
                {_.map(ruleFreqMap, (item, key) => (
                  <Select.Option key={key} value={key}>
                    {item.text}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {/* 每年：选月 + 选日 + 时间；日选项按所选月份联动有效天数（如 2月无 29/30/31日） */}
            {watchFreqType === RuleFreqType.Yearly && (
              <>
                <Form.Item
                  name='freqMonth'
                  noStyle
                  rules={[{ required: true, message: '请选择月份' }]}
                >
                  <Select
                    options={YEAR_MONTH_OPTIONS}
                    placeholder='月'
                    style={{ width: 80 }}
                    onChange={() => {
                      // 切换月份后若已选日期超出该月天数，予以清空
                      form.setFieldsValue({ freqDay: undefined });
                    }}
                  />
                </Form.Item>
                <Form.Item
                  name='freqDay'
                  noStyle
                  rules={[{ required: true, message: '请选择日期' }]}
                >
                  <Select options={yearDayOptions} placeholder='日' style={{ width: 80 }} />
                </Form.Item>
              </>
            )}
            {/* 每月：选每月几号（1~31日） */}
            {watchFreqType === RuleFreqType.Monthly && (
              <Form.Item
                name='freqValue'
                noStyle
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <Select options={MONTH_DAY_OPTIONS} placeholder='日期' style={{ width: 90 }} />
              </Form.Item>
            )}
            {/* 每周：选星期几 */}
            {watchFreqType === RuleFreqType.Weekly && (
              <Form.Item
                name='freqValue'
                noStyle
                rules={[{ required: true, message: '请选择星期' }]}
              >
                <Select options={WEEK_OPTIONS} placeholder='日期/星期' style={{ width: 110 }} />
              </Form.Item>
            )}
            {/* 执行时间（每种频率都需选择） */}
            <Form.Item name='execTime' noStyle rules={[{ required: true, message: '请选择执行时间' }]}>
              <TimePicker format='HH:mm:ss' style={{ width: 120 }} placeholder='--:--:--' />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item label='回收白名单' name='whitelist' style={{ marginBottom: 12 }}>
          <Select
            mode='multiple'
            style={{ width: '100%' }}
            placeholder='请选择不参与回收的IP段/IP'
            options={whitelistOptions}
            optionFilterProp='label'
            allowClear
          />
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
