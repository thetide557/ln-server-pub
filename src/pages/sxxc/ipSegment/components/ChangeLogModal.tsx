/**
 * IP 变更记录弹窗
 * 对应后端：GET /ipam/subnets/{subnet_id}/addresses/change-logs
 * 分配/预留/回收/释放/变更/删除/扫描/导入等写操作追加记录，服务端分页 + 查询
 */
import React, { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Table, Tooltip } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { ColumnsType } from 'antd/lib/table';
import DatePicker, { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import usePagination from '@/components/usePagination';
import { getChangeLogs } from '@/services/sxxc/ipam';
import { ChangeLogItem, changeLogActionMap } from '../types';

// antd RangePicker 组件类型与项目 @types/react 多版本冲突（TS2786，log/* 页面案发点均整文件 @ts-nocheck），
// 此处仅对该组件 any 化绕过 JSX 组件类型检查，文件其余类型检查保留
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RangePickerFC = DatePicker.RangePicker as any;

interface ChangeLogModalProps {
  visible: boolean;
  /** 目标地址段 */
  segmentId?: number;
  segmentName?: string;
  onClose: () => void;
}

/** 变更前/变更后 JSON 摘要展示（截断 + Tooltip 全量） */
function JsonCell({ text }: { text: string }) {
  if (!text) return <span>-</span>;
  return (
    <Tooltip title={text} overlayStyle={{ maxWidth: 480 }}>
      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </Tooltip>
  );
}

export default function ChangeLogModal(props: ChangeLogModalProps) {
  const { visible, segmentId, segmentName } = props;
  const [form] = Form.useForm();
  const [list, setList] = useState<ChangeLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const pagination = usePagination({ PAGESIZE_KEY: 'ip_change_logs' });
  // antd 日期范围（非受控，与 log/operlog 页同款写法规避 @types/react 多版本冲突；传参格式 YYYY-MM-DD）
  const [timeRange, setTimeRange] = useState<[moment.Moment, moment.Moment]>();
  const [pickerKey, setPickerKey] = useState(0);
  /**
   * 已提交的查询条件（合并 state：翻页/查询/重置只改它，fetch effect 单次触发避免重复请求）
   * 点击「查询」才生效
   */
  const [query, setQuery] = useState<{ page: number; ip?: string; action?: string; startTime?: string; endTime?: string }>({ page: 1 });

  const onTimeRangeChange = (value: DatePickerProps['value'] | RangePickerProps['value']) => {
    const dates = value as [moment.Moment, moment.Moment];
    setTimeRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : undefined);
  };

  useEffect(() => {
    if (props.visible && segmentId) {
      setLoading(true);
      getChangeLogs(segmentId, {
        ip: query.ip,
        action: query.action,
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
    }
  }, [props.visible, segmentId, query, pagination.pageSize]);

  // 弹窗打开 / 切换地址段时：重置全部查询条件并回到第一页（query 引用保稳避免重复请求）
  useEffect(() => {
    if (props.visible && segmentId) {
      form.resetFields();
      setTimeRange(undefined);
      setPickerKey((key) => key + 1);
      setQuery((prev) => (_.isEqual(prev, { page: 1 }) ? prev : { page: 1 }));
    }
  }, [props.visible, segmentId]);

  const columns: ColumnsType<ChangeLogItem> = [
    { title: 'IP地址', dataIndex: 'ip', width: 130 },
    {
      title: '动作',
      dataIndex: 'action',
      width: 80,
      render: (val) => changeLogActionMap[val] || val,
    },
    {
      title: '变更前',
      dataIndex: 'beforeData',
      width: 220,
      render: (text) => <JsonCell text={text} />,
    },
    {
      title: '变更后',
      dataIndex: 'afterData',
      width: 220,
      render: (text) => <JsonCell text={text} />,
    },
    { title: '原因', dataIndex: 'reason', width: 100, ellipsis: true, render: (val) => val || '-' },
    { title: '操作人', dataIndex: 'createdBy', width: 90, render: (val) => val || '-' },
    { title: '时间', dataIndex: 'createdAt', width: 160 },
  ];

  return (
    <Modal
      title={`变更记录${segmentName ? ` - ${segmentName}` : ''}`}
      visible={visible}
      width={1100}
      footer={null}
      onCancel={props.onClose}
      destroyOnClose
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', rowGap: 8 }}>
        <Form form={form} layout='inline' style={{ rowGap: 8 }}>
          <Form.Item name='ip'>
            <Input placeholder='请输入IP' style={{ width: 150 }} allowClear />
          </Form.Item>
          <Form.Item name='action'>
            <Select allowClear placeholder='动作' style={{ width: 110 }} options={_.map(changeLogActionMap, (text, value) => ({ value, label: text }))} />
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
                  ip: values.ip,
                  action: values.action,
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
          onChange: (page) => setQuery((prev) => ({ ...prev, page })),
        }}
        scroll={{ x: 1100, y: 420 }}
      />
    </Modal>
  );
}