/**
 * 回收IP弹窗（可回收清单）
 * 对应原型：回收弹框 —— 勾选可回收IP列表后确定回收
 */
import React, { useEffect, useState } from 'react';
import { message, Modal, Table } from 'antd';
import _ from 'lodash';
import { ColumnsType } from 'antd/lib/table';
import { getRecyclableIps, recycleIps } from '../mock';
import { IpItem, ipAllocStatusMap, ipOnlineStatusMap, ipUseStatusMap } from '../types';

interface RecycleModalProps {
  visible: boolean;
  /** 目标地址段 */
  segmentId?: number;
  segmentName?: string;
  onClose: () => void;
  onOk: () => void;
}

export default function RecycleModal(props: RecycleModalProps) {
  const { visible, segmentId } = props;
  const [list, setList] = useState<IpItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (visible && segmentId) {
      setLoading(true);
      setSelectedIds([]);
      getRecyclableIps(segmentId)
        .then((res) => {
          setList(res);
          // 默认全选，与原型一致
          setSelectedIds(res.map((item) => item.id));
        })
        .finally(() => setLoading(false));
    } else {
      setList([]);
      setSelectedIds([]);
    }
  }, [visible, segmentId]);

  const columns: ColumnsType<IpItem> = [
    { title: 'IP地址', dataIndex: 'ip', width: 110 },
    {
      title: 'IP分配状态',
      dataIndex: 'allocStatus',
      width: 90,
      render: (val) => {
        const item = ipAllocStatusMap[val];
        return <span className={`ant-tag ant-tag-${item?.color}`}>{item?.text}</span>;
      },
    },
    {
      title: 'IP使用状态',
      dataIndex: 'useStatus',
      width: 90,
      render: (val) => {
        const item = ipUseStatusMap[val];
        return <span className={`ant-tag ant-tag-${item?.color}`}>{item?.text}</span>;
      },
    },
    {
      title: '资产在线状态',
      dataIndex: 'onlineStatus',
      width: 95,
      render: (val) => {
        const item = ipOnlineStatusMap[val];
        return <span className={`ant-tag ant-tag-${item?.color}`}>{item?.text}</span>;
      },
    },
    { title: '资产名称', dataIndex: 'assetName', width: 110, ellipsis: true, render: (val) => val || '-' },
    { title: 'MAC地址', dataIndex: 'mac', width: 130, ellipsis: true, render: (val) => val || '-' },
    { title: '接入端口', dataIndex: 'port', width: 80, render: (val) => val || '-' },
    { title: '临时IP', dataIndex: 'isTempIp', width: 70, render: (val) => (val === -1 ? '-' : val === 1 ? '是' : '否') },
    { title: '网关', dataIndex: 'isGateway', width: 60, render: (val) => (val === -1 ? '-' : val === 1 ? '是' : '否') },
    { title: '最后在线时间', dataIndex: 'lastOnlineTime', width: 140, render: (val) => val || '-' },
    { title: '闲置天数', dataIndex: 'idleDays', width: 80, render: (val) => (val === undefined ? '-' : val) },
  ];

  return (
    <Modal
      title='回收IP'
      visible={visible}
      width={1000}
      confirmLoading={confirmLoading}
      onCancel={props.onClose}
      onOk={async () => {
        if (selectedIds.length === 0) {
          message.warning('请选择需要回收的IP');
          return;
        }
        setConfirmLoading(true);
        try {
          await recycleIps(selectedIds);
          message.success('回收成功');
          props.onOk();
          props.onClose();
        } finally {
          setConfirmLoading(false);
        }
      }}
    >
      <div style={{ marginBottom: 8, color: '#767676' }}>可回收清单（{props.segmentName || '-'}）</div>
      <Table
        size='small'
        rowKey='id'
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 1100, y: 320 }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => {
            setSelectedIds(keys as number[]);
          },
        }}
      />
    </Modal>
  );
}
