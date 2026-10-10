/**
 * 回收规则列表弹窗 + 规则查看弹窗
 * 对应原型：回收规则列表弹框（从组织树"回收规则"入口打开）
 */
import React, { useEffect, useState } from 'react';
import { Button, Descriptions, Dropdown, Form, Input, Menu, message, Modal, Switch, Table } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';
import DatePicker, { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import usePagination from '@/components/usePagination';
import {
  addRecycleRule,
  deleteRecycleRule,
  editRecycleRule,
  getRecycleRules,
  toggleRecycleRule,
} from '../mock';
import {
  IpGroup,
  IpSegment,
  RecycleRule,
  ruleActionMap,
  ruleFreqMap,
  RuleTriggerType,
  ruleTriggerMap,
} from '../types';
import RuleFormModal from './RuleFormModal';

// antd RangePicker 组件类型与项目 @types/react 多版本冲突（TS2786，log/* 页面案发点均整文件 @ts-nocheck），
// 此处仅对该组件 any 化绕过 JSX 组件类型检查，文件其余类型检查保留
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RangePickerFC = DatePicker.RangePicker as any;

interface RuleListModalProps {
  visible: boolean;
  /** 分组视角：归属分组 */
  group?: IpGroup;
  /** 地址段视角：从树上 IP 段节点打开时传入，查询适用该段的规则 */
  segment?: IpSegment;
  /** 可选地址段范围（分组视角传该组全部段；地址段视角只传该段） */
  segments: IpSegment[];
  onClose: () => void;
}

function triggerText(rule: RecycleRule) {
  const meta = ruleTriggerMap[rule.triggerType];
  const base = meta?.text || '-';
  return rule.triggerType === RuleTriggerType.AssetOffline ? base : `${base} 阈值${rule.thresholdDays || '-'}天`;
}

function freqText(rule: RecycleRule) {
  const meta = ruleFreqMap[rule.freqType];
  const valuePart = rule.freqValue ? `${rule.freqValue} ` : '';
  return `${meta?.text || '-'} ${valuePart}${rule.execTime}`;
}

export default function RuleListModal(props: RuleListModalProps) {
  const { visible, group, segment, segments } = props;
  const [form] = Form.useForm();
  const [list, setList] = useState<RecycleRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<RecycleRule>();
  const [viewRule, setViewRule] = useState<RecycleRule>();
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const pagination = usePagination({ PAGESIZE_KEY: 'ip_recycle_rules' });
  // antd 日期范围（非受控，与 log/operlog 页同款写法规避 @types/react 多版本冲突；传参格式 YYYY-MM-DD）
  const [timeRange, setTimeRange] = useState<[moment.Moment, moment.Moment]>();
  // 重置时通过 key 重挂载清空日期输入框
  const [pickerKey, setPickerKey] = useState(0);

  const onTimeRangeChange = (value: DatePickerProps['value'] | RangePickerProps['value']) => {
    const dates = value as [moment.Moment, moment.Moment];
    setTimeRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : undefined);
  };

  const fetchList = (override?: { startTime?: string; endTime?: string }) => {
    if (!group && !segment) return;
    setLoading(true);
    const values = form.getFieldsValue();
    getRecycleRules({
      ...(group ? { groupId: group.id } : {}),
      ...(segment ? { segment: segment.fullSegment } : {}),
      name: values.name,
      // 重置时 override 传空对象强制清空时间，其余读取当前选取
      startTime: override ? override.startTime : timeRange?.[0]?.format('YYYY-MM-DD'),
      endTime: override ? override.endTime : timeRange?.[1]?.format('YYYY-MM-DD'),
    })
      .then((res) => {
        setList(res.list);
      })
      .finally(() => setLoading(false));
  };

  // 弹窗打开 / 切换目标分组(地址段)时：重置全部查询条件（fetchList({}) 强制清空时间，规避读取旧 state 闭包）
  useEffect(() => {
    if (props.visible && (group || segment)) {
      form.resetFields();
      setTimeRange(undefined);
      setPickerKey((key) => key + 1);
      setSelectedKeys([]);
      fetchList({});
    }
  }, [props.visible, group, segment]);

  // 新增/编辑/删除/启停后刷新列表：保留当前查询条件
  useEffect(() => {
    if (props.visible && (group || segment)) {
      fetchList();
    }
  }, [refreshFlag]);

  const columns: ColumnsType<RecycleRule> = [
    { title: '规则名称', dataIndex: 'name', width: 130, ellipsis: true },
    { title: '归属', dataIndex: 'groupName', width: 100, ellipsis: true },
    {
      title: '适用范围',
      dataIndex: 'scopeType',
      width: 130,
      render: (val, record) => {
        if (val === 'all') return '当前分组全部地址段';
        return `指定地址段（${(record.customSegments || []).join('、')}）`;
      },
    },
    { title: '触发条件', width: 180, ellipsis: true, render: (_, record) => triggerText(record) },
    {
      title: '回收动作',
      dataIndex: 'action',
      width: 90,
      render: (val) => ruleActionMap[val as keyof typeof ruleActionMap]?.text,
    },
    { title: '执行频率', width: 120, render: (_, record) => freqText(record) },
    { title: '累计命中次数', dataIndex: 'hitCount', width: 100, align: 'center' },
    { title: '最近执行时间', dataIndex: 'lastExecTime', width: 140 },
    {
      title: '启用状态',
      dataIndex: 'enabled',
      width: 80,
      render: (val, record) => (
        <Switch
          size='small'
          checked={val}
          onChange={(checked) => {
            toggleRecycleRule(record.id, checked).then(() => {
              message.success(checked ? '已启用' : '已停用');
              setRefreshFlag(_.uniqueId('refresh_'));
            });
          }}
        />
      ),
    },
    { title: '更新人', dataIndex: 'updater', width: 80 },
    { title: '更新时间', dataIndex: 'updateTime', width: 140 },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button type='link' size='small' style={{ padding: 0 }} onClick={() => setViewRule(record)}>
            查看
          </Button>
          <Button
            type='link'
            size='small'
            style={{ padding: 0, marginLeft: 8 }}
            onClick={() => {
              setEditingRule(record);
              setFormModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type='link'
            size='small'
            danger
            style={{ padding: 0, marginLeft: 8 }}
            onClick={() => {
              Modal.confirm({
                title: '是否确认删除该回收规则？',
                onOk: () => {
                  deleteRecycleRule(record.id).then(() => {
                    message.success('删除成功');
                    setRefreshFlag(_.uniqueId('refresh_'));
                  });
                },
                onCancel() {},
              });
            }}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  /** 新增/编辑规则的归属分组：分组视角用 group；地址段视角按该段所属分组构造 */
  const targetGroup: IpGroup | undefined = group || (segment ? { id: segment.groupId, name: segment.groupName, owner: '-' } : undefined);

  return (
    <Modal
      title={`回收规则${group ? ` - ${group.name}` : segment ? ` - ${segment.fullSegment}` : ''}`}
      visible={visible}
      width={1200}
      footer={null}
      onCancel={props.onClose}
      destroyOnClose
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', rowGap: 8 }}>
        <Form form={form} layout='inline' style={{ rowGap: 8 }}>
          <Form.Item name='name'>
            <Input placeholder='请输入规则名称' style={{ width: 180 }} allowClear />
          </Form.Item>
          <Form.Item>
            <RangePickerFC key={pickerKey} onChange={onTimeRangeChange} />
          </Form.Item>
          <Form.Item>
            <Button type='primary' onClick={() => fetchList()}>
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              onClick={() => {
                form.resetFields();
                setTimeRange(undefined);
                setPickerKey((key) => key + 1);
                fetchList({});
              }}
            >
              重置
            </Button>
          </Form.Item>
        </Form>
        <div style={{ display: 'flex', columnGap: 12 }}>
          <Button
            type='primary'
            onClick={() => {
              setEditingRule(undefined);
              setFormModalVisible(true);
            }}
          >
            新增规则
          </Button>
          <Dropdown
            overlay={
              <Menu
                onClick={({ key }) => {
                  if (selectedKeys.length === 0) {
                    message.warning('请先勾选规则');
                    return;
                  }
                  if (key === 'delete') {
                    Modal.confirm({
                      title: `是否确认删除选中的${selectedKeys.length}条回收规则？`,
                      onOk: () => {
                        Promise.all(_.map(selectedKeys, (id) => deleteRecycleRule(id))).then(() => {
                          message.success('删除成功');
                          setSelectedKeys([]);
                          setRefreshFlag(_.uniqueId('refresh_'));
                        });
                      },
                      onCancel() {},
                    });
                    return;
                  }
                  Promise.all(_.map(selectedKeys, (id) => toggleRecycleRule(id, key === 'enable'))).then(() => {
                    message.success(key === 'enable' ? '批量启用成功' : '批量停用成功');
                    setRefreshFlag(_.uniqueId('refresh_'));
                  });
                }}
                items={[
                  { key: 'enable', label: '启用' },
                  { key: 'disable', label: '停用' },
                  { key: 'delete', label: '删除' },
                ]}
              />
            }
          >
            <Button>批量操作</Button>
          </Dropdown>
        </div>
      </div>
      <Table
        size='small'
        rowKey='id'
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{ ...pagination, total: list.length }}
        scroll={{ x: 1400, y: 360 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys as number[]),
        }}
      />
      {targetGroup && (
        <RuleFormModal
          visible={formModalVisible}
          rule={editingRule}
          group={targetGroup}
          segments={segments}
          onClose={() => setFormModalVisible(false)}
          onOk={async (values) => {
            const execTime = moment.isMoment(values.execTime) ? values.execTime.format('HH:mm') : values.execTime || '02:00';
            const payload = {
              ...values,
              execTime,
              customSegments: values.customSegments || [],
              whitelist: values.whitelist || [],
            };
            if (editingRule) {
              await editRecycleRule(editingRule.id, payload);
            } else {
              await addRecycleRule({ ...payload, groupId: targetGroup.id });
            }
            message.success(editingRule ? '编辑成功' : '新增成功');
            setFormModalVisible(false);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
      )}
      <Modal title='查看回收规则' visible={!!viewRule} footer={null} onCancel={() => setViewRule(undefined)} width={620}>
        {viewRule && (
          <Descriptions bordered size='small' column={1}>
            <Descriptions.Item label='规则名称'>{viewRule.name}</Descriptions.Item>
            <Descriptions.Item label='归属'>{viewRule.groupName}</Descriptions.Item>
            <Descriptions.Item label='适用范围'>
              {viewRule.scopeType === 'all' ? '当前分组全部地址段' : `指定地址段（${(viewRule.customSegments || []).join('、')}）`}
            </Descriptions.Item>
            <Descriptions.Item label='触发条件'>{triggerText(viewRule)}</Descriptions.Item>
            <Descriptions.Item label='回收动作'>{ruleActionMap[viewRule.action]?.text}</Descriptions.Item>
            <Descriptions.Item label='执行频率'>{freqText(viewRule)}</Descriptions.Item>
            <Descriptions.Item label='回收白名单'>{(viewRule.whitelist || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label='累计命中次数'>{viewRule.hitCount}</Descriptions.Item>
            <Descriptions.Item label='最近执行时间'>{viewRule.lastExecTime}</Descriptions.Item>
            <Descriptions.Item label='启用状态'>{viewRule.enabled ? '启用' : '停用'}</Descriptions.Item>
            <Descriptions.Item label='更新人 / 更新时间'>{`${viewRule.updater} / ${viewRule.updateTime}`}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Modal>
  );
}
