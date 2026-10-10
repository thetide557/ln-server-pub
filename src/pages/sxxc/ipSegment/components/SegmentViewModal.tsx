/**
 * 地址段查看弹窗
 * 原型中"查看"为静态按钮，无弹窗内容定义；此处按地址段字段做只读详情展示
 */
import React from 'react';
import { Descriptions, Modal, Progress, Tag } from 'antd';
import { IpSegment, segmentStatusMap } from '../types';

interface SegmentViewModalProps {
  visible: boolean;
  segment?: IpSegment;
  onClose: () => void;
}

export default function SegmentViewModal(props: SegmentViewModalProps) {
  const { visible, segment } = props;
  if (!segment) return null;
  const status = segmentStatusMap[segment.status];
  return (
    <Modal title='查看地址段' visible={visible} footer={null} onCancel={props.onClose} width={640}>
      <div className='ip-view-descriptions'>
        <Descriptions bordered size='small' column={2}>
          <Descriptions.Item label='地址段'>{segment.fullSegment}</Descriptions.Item>
          <Descriptions.Item label='归属'>{segment.groupName}</Descriptions.Item>
          <Descriptions.Item label='地址段状态'>
            <Tag color={status?.color}>{status?.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label='VLAN'>{segment.vlan || '-'}</Descriptions.Item>
          <Descriptions.Item label='负责人'>{segment.owner}</Descriptions.Item>
          <Descriptions.Item label='操作人'>{segment.operator}</Descriptions.Item>
          <Descriptions.Item label='IP使用情况（已使用/未使用）'>
            {`${segment.usedCount}/${segment.unusedCount}`}
          </Descriptions.Item>
          <Descriptions.Item label='IP分配情况（已分配/预留/未分配）'>
            {`${segment.allocatedCount}/${segment.reservedIpCount}/${segment.unallocatedCount}`}
          </Descriptions.Item>
          <Descriptions.Item label='资产在线情况（在线/离线）'>
            {`${segment.onlineCount}/${segment.offlineCount}`}
          </Descriptions.Item>
          <Descriptions.Item label='可回收'>
            <span className='recyclable-num'>{segment.recyclableCount}</span>
          </Descriptions.Item>
          <Descriptions.Item label='IP使用率'>{segment.usageRate}%</Descriptions.Item>
          <Descriptions.Item label='更新时间'>{segment.updateTime}</Descriptions.Item>
          <Descriptions.Item label='备注' span={2}>
            {segment.note || '-'}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 12, maxWidth: 260 }}>
          <span style={{ color: '#767676', fontSize: 12, marginRight: 8 }}>IP使用率：</span>
          <Progress percent={segment.usageRate} size='small' style={{ display: 'inline-block', width: 160 }} />
        </div>
      </div>
    </Modal>
  );
}
