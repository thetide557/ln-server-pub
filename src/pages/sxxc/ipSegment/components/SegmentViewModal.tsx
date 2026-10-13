/**
 * 地址段查看弹窗
 * 复用编辑地址段的 SegmentFormModal（查看模式：表单与编辑一模一样，但全部禁用、无提交按钮）
 */
import React from 'react';
import SegmentFormModal from './SegmentFormModal';
import { IpSegment } from '../types';

interface SegmentViewModalProps {
  visible: boolean;
  segment?: IpSegment;
  onClose: () => void;
}

export default function SegmentViewModal(props: SegmentViewModalProps) {
  const { visible, segment } = props;
  return (
    <SegmentFormModal
      visible={visible}
      segment={segment}
      disabled
      onClose={props.onClose}
      onOk={async () => undefined}
    />
  );
}
