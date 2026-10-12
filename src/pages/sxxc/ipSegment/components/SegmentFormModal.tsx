/**
 * 新增/编辑地址段弹窗
 * 对应原型：新增地址段弹框 / 编辑地址段弹框
 * 编辑时可选地址段状态；选择"停用"时显示 *停用原因 输入与提示文案
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import _ from 'lodash';
import { IpSegment, SegmentStatus, segmentStatusMap } from '../types';

interface SegmentFormModalProps {
  visible: boolean;
  /** 编辑时传入地址段，新增时为空 */
  segment?: IpSegment;
  /** 新增时传入归属分组名 */
  groupName?: string;
  /** 查看模式：表单与编辑完全一致但全部禁用，无提交按钮 */
  disabled?: boolean;
  onClose: () => void;
  onOk: (values: {
    segment: string;
    mask: number;
    vlan?: string;
    owner: string;
    note?: string;
    status?: SegmentStatus;
    disableReason?: string;
  }) => Promise<void>;
}

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export default function SegmentFormModal(props: SegmentFormModalProps) {
  const { visible, segment } = props;
  const [form] = Form.useForm();
  const [status, setStatus] = useState<SegmentStatus>(SegmentStatus.InUse);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (segment) {
        setStatus(segment.status);
        form.setFieldsValue({
          segment: segment.segment,
          mask: segment.mask,
          vlan: segment.vlan,
          owner: segment.owner,
          note: segment.note,
          status: segment.status,
          disableReason: undefined,
        });
      } else {
        setStatus(SegmentStatus.InUse);
        form.setFieldsValue({ mask: 24, status: SegmentStatus.InUse });
      }
    }
  }, [visible, segment]);

  const isEdit = !!segment;
  const ownerName = isEdit ? segment!.groupName : props.groupName;

  return (
    <Modal
      title={props.disabled ? '查看地址段' : isEdit ? '编辑地址段' : '新增地址段'}
      visible={visible}
      onCancel={props.onClose}
      footer={props.disabled ? null : undefined}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }} disabled={props.disabled}>
        <Form.Item
          label='归属'
        >
          <div>{ownerName}</div>
        </Form.Item>
        <Form.Item
          label='地址段'
          required
          style={{ marginBottom: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Item
              name='segment'
              noStyle
              rules={[
                { required: true, message: '请输入地址段' },
                { pattern: ipv4Regex, message: '请输入正确的IPv4地址，如 10.20.5.0' },
              ]}
            >
              <Input placeholder='如 10.20.5.0' style={{ width: 200 }} />
            </Form.Item>
            <span style={{ margin: '0 8px' }}>/</span>
            <Form.Item name='mask' noStyle rules={[{ required: true, message: '请选择掩码' }]}>
              <Select style={{ width: 80 }}>
                {_.range(8, 33).map((mask) => (
                  <Select.Option key={mask} value={mask}>
                    {mask}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item label='VLAN' name='vlan' style={{ marginBottom: 12 }} rules={[{ max: 10, message: '最多10个字符' }]}>
          <Input placeholder='请输入VLAN' maxLength={10} />
        </Form.Item>
        <Form.Item label='责任人' name='owner' style={{ marginBottom: 12 }} rules={[{ required: true, message: '请输入责任人' }]}>
          <Input placeholder='请输入责任人' maxLength={20} />
        </Form.Item>
        <Form.Item label='备注' name='note' style={{ marginBottom: 12 }}>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        {isEdit && (
          <>
            <Form.Item label='地址段状态' name='status' style={{ marginBottom: 12 }}>
              <Select
                onChange={(value) => {
                  setStatus(value);
                  if (value !== SegmentStatus.Disabled) {
                    form.setFieldsValue({ disableReason: undefined });
                  }
                }}
              >
                {_.map(segmentStatusMap, (item, key) => (
                  <Select.Option key={key} value={Number(key)}>
                    {item.text}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {status === SegmentStatus.Disabled && (
              <>
                <Form.Item
                  label='停用原因'
                  name='disableReason'
                  style={{ marginBottom: 8 }}
                  rules={[{ required: true, message: '请输入停用原因' }]}
                >
                  <Input.TextArea placeholder='请输入停用原因' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
                </Form.Item>
                {/* <div
                  style={{
                    background: '#fdf2e2',
                    color: '#d97a08',
                    padding: '6px 10px',
                    borderRadius: 2,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  停用后将自动收回该地址段所有已分配/预留/已使用地址
                </div> */}
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
