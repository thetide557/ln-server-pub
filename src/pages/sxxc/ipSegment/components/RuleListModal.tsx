/**
 * 回收规则列表弹窗 + 规则查看弹窗
 * 对应原型：回收规则列表弹框（从组织树"回收规则"入口打开）
 */
import React, { useEffect, useState } from 'react';
import { Button, Dropdown, Form, Input, Menu, message, Modal, notification, Switch, Table } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';
import DatePicker, { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import usePagination from '@/components/usePagination';
import {
  addRecycleRule,
  deleteRecycleRule,
  editRecycleRule,
  executeRecycleRule,
  getRecycleRuleDetail,
  getRecycleRules,
  toggleRecycleRule,
} from '@/services/sxxc/ipam';
import {
  IpGroup,
  IpSegment,
  RecycleRule,
  ruleActionMap,
  RuleFreqType,
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
  const text = meta?.text || '-';
  // 每周：freqValue 存星期（一~日），拼接为「每周三」，其余为「每月 1」「每年 3月1日」
  if (rule.freqType === RuleFreqType.Weekly) {
    return `${text}${rule.freqValue || ''} ${rule.execTime}`;
  }
  const valuePart = rule.freqValue ? `${rule.freqValue} ` : '';
  return `${text} ${valuePart}${rule.execTime}`;
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
  /**
   * 刷新列表数据
   * 注意：列 render: (_, record) 的首参会遮蔽 lodash 的 _，render 内不能直接用 _.uniqueId，
   * 统一通过本函数刷新（定义在组件体内，_ 指向 lodash）
   */
  const handleRefresh = () => setRefreshFlag(_.uniqueId('refresh_'));
  /**
   * 打开规则弹窗：查看/编辑前先按 id 拉取详情（GET /ipam/recycle-rules/{id}，列表行字段可能不全）
   * 注意：列 render 内不能直接用本函数体内以外的 lodash 调用，此处定义在组件体内不受首参 _ 遮蔽影响
   */
  const openRuleForm = (rule: RecycleRule, mode: 'view' | 'edit') => {
    getRecycleRuleDetail(rule.id)
      .then((detail) => {
        if (mode === 'edit') {
          setEditingRule(detail);
          setFormModalVisible(true);
        } else {
          setViewRule(detail);
        }
      })
      .catch(() => {});
  };
  const pagination = usePagination({ PAGESIZE_KEY: 'ip_recycle_rules' });
  const [total, setTotal] = useState(0);
  // antd 日期范围（非受控，与 log/operlog 页同款写法规避 @types/react 多版本冲突；传参格式 YYYY-MM-DD）
  const [timeRange, setTimeRange] = useState<[moment.Moment, moment.Moment]>();
  // 重置时通过 key 重挂载清空日期输入框
  const [pickerKey, setPickerKey] = useState(0);
  /**
   * 已提交的查询条件（合并 state：翻页/查询/重置都只改它，fetch effect 单次触发避免重复请求）
   * 点击「查询」才生效；page 为服务端分页页码
   */
  const [query, setQuery] = useState<{ page: number; name?: string; startTime?: string; endTime?: string }>({ page: 1 });

  const onTimeRangeChange = (value: DatePickerProps['value'] | RangePickerProps['value']) => {
    const dates = value as [moment.Moment, moment.Moment];
    setTimeRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : undefined);
  };

  /** 拉取规则列表（服务端分页 + 服务端查询） */
  const fetchList = () => {
    if (!group && !segment) return;
    setLoading(true);
    getRecycleRules({
      ...(group ? { groupId: group.id } : {}),
      ...(segment ? { segmentId: segment.id } : {}),
      name: query.name,
      startTime: query.startTime,
      endTime: query.endTime,
      page: query.page,
      limit: pagination.pageSize,
    })
      .then((res) => {
        setList(res.list);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (props.visible && (group || segment)) {
      fetchList();
    }
  }, [props.visible, group, segment, query, refreshFlag, pagination.pageSize]);

  // 弹窗打开 / 切换目标分组(地址段)时：重置全部查询条件并回到第一页
  // （query 引用保稳：已是初始条件时不换引用，避免 visible 变化 + query 变化双重触发 fetch）
  useEffect(() => {
    if (props.visible && (group || segment)) {
      form.resetFields();
      setTimeRange(undefined);
      setPickerKey((key) => key + 1);
      setSelectedKeys([]);
      setQuery((prev) => (_.isEqual(prev, { page: 1 }) ? prev : { page: 1 }));
    }
  }, [props.visible, group, segment]);

  const columns: ColumnsType<RecycleRule> = [
    { title: '规则名称', dataIndex: 'name', width: 130, ellipsis: true },
    { title: '归属', dataIndex: 'groupName', width: 100, ellipsis: true },
    {
      title: '适用范围',
      dataIndex: 'scopeType',
      width: 130,
      render: (val, record) => {
        if (val === 'all') return '当前分组全部地址段';
        // customSegments 为段 ID，展示时转换为段名
        const segNames = (record.customSegments || []).map((id) => segments?.find((s) => s.id === id)?.fullSegment || String(id));
        return `指定地址段（${segNames.join('、')}）`;
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
              handleRefresh();
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
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <>
          {/* 行内执行/扫描：按规则适用范围执行（mark 命中入可回收清单 / auto 直接回收） */}
          <Button
            type='link'
            size='small'
            style={{ padding: 0 }}
            onClick={() => {
              executeRecycleRule(record.id).then((res) => {
                notification.open({
                  message: '扫描完成',
                  description: res.message,
                  placement: 'bottomRight',
                  duration: 3,
                });
                handleRefresh();
              });
            }}
          >
            执行
          </Button>
          {/* 查看：以详情接口为准（列表行字段可能不全），先查详情再打开弹窗 */}
          <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={() => openRuleForm(record, 'view')}>
            查看
          </Button>
          <Button
            type='link'
            size='small'
            style={{ padding: 0, marginLeft: 8 }}
            onClick={() => openRuleForm(record, 'edit')}
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
                    handleRefresh();
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
            <Button
              type='primary'
              onClick={() => {
                const values = form.getFieldsValue();
                setQuery({
                  page: 1,
                  name: values.name,
                  startTime: timeRange?.[0]?.format('YYYY-MM-DD'),
                  endTime: timeRange?.[1]?.format('YYYY-MM-DD'),
                });
              }}
            >
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              onClick={() => {
                form.resetFields();
                setTimeRange(undefined);
                setPickerKey((key) => key + 1);
                setQuery({ page: 1 });
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
                          handleRefresh();
                        });
                      },
                      onCancel() {},
                    });
                    return;
                  }
                  Promise.all(_.map(selectedKeys, (id) => toggleRecycleRule(id, key === 'enable'))).then(() => {
                    message.success(key === 'enable' ? '批量启用成功' : '批量停用成功');
                    handleRefresh();
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
        pagination={{
          ...pagination,
          current: query.page,
          total,
          onChange: (page) => {
            setQuery((prev) => ({ ...prev, page }));
          },
        }}
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
            const execTime = moment.isMoment(values.execTime) ? values.execTime.format('HH:mm:ss') : values.execTime || '02:00:00';
            const payload = {
              ...values,
              execTime,
              customSegments: values.customSegments || [],
              whitelist: values.whitelist || [],
            };
            if (editingRule) {
              // PUT 需全量字段，归属分组沿用编辑对象
              await editRecycleRule(editingRule.id, { ...payload, groupId: editingRule.groupId });
            } else {
              await addRecycleRule({ ...payload, groupId: targetGroup.id });
            }
            message.success(editingRule ? '编辑成功' : '新增成功');
            setFormModalVisible(false);
            handleRefresh();
          }}
        />
      )}
      {/* 查看回收规则：复用编辑表单（查看模式，全部禁用、无提交按钮） */}
      {targetGroup && (
        <RuleFormModal
          visible={!!viewRule}
          rule={viewRule}
          group={targetGroup}
          segments={segments}
          disabled
          onClose={() => setViewRule(undefined)}
          onOk={async () => undefined}
        />
      )}
    </Modal>
  );
}
