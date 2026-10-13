import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { reserveU, segmentCheck } from '@/services/assets/dc-overview';
import type { CabinetUSlot } from '@/services/assets/dc-overview';
import { FORM_LAYOUT, type USlotModalBaseProps } from './types';
import { validateContiguousIdle } from './helper';

/** 预留 U 位弹窗 */
const ReserveModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetCode, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [form] = Form.useForm();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stats = React.useMemo(() => {
    const s = { used: 0, idle: 0, reserved: 0, fault: 0, disabled: 0 };
    allSlots.forEach((x) => { s[x.status]++; });
    return s;
  }, [allSlots]);

  useEffect(() => {
    if (!visible || !slot) return;
    setResult(null);
    requestAnimationFrame(() => {
      form.resetFields();
      form.setFieldsValue({ startUp: `${slot.u_position}U`, endUp: '-' });
    });
  }, [visible, slot]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (!result?.ok) { message.error('请先选择有效的连续 U 位段'); return; }
      setSubmitting(true);
      // 6.9 预留 U 位
      const res = await reserveU({
        cabinet_id: Number(cabinetId),
        start_u: slot!.u_position,
        u_height: values.height,
        reason: values.reason,
        owner_name: values.dutyPerson,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      const endPos = slot!.u_position + values.height - 1;
      const positions = Array.from({ length: values.height }, (_, i) => slot!.u_position + i);
      onSuccess(positions, {
        status: 'reserved',
        reserved_reason: values.reason,
        duty_person: values.dutyPerson,
        update_by: '当前用户',
      });
      message.success(`预留成功：U${slot!.u_position} - U${endPos}`);
      reload();
      onClose();
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="预留U位" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={560}>
      {slot && (
        <>
          <div style={{
            background: '#F2F7FF', border: '1px solid #BFDBFE', borderRadius: 4,
            padding: '10px 14px', marginBottom: 4, fontSize: 13, color: '#1C76FD',
          }}>
            当前机柜：{cabinetCode} · 已用 {allSlots.length - stats.idle}U · 空闲 {stats.idle}U
          </div>
          <div style={{ fontSize: 12, color: '#86909C', marginBottom: 16, paddingLeft: 4 }}>
            预留 U 位不可再分配给资产，需先「取消预留」。
          </div>
          <Form form={form} {...FORM_LAYOUT} preserve={false}
            onValuesChange={(changed) => {
              if ('height' in changed && slot) {
                const h = changed.height as number | null;
                if (!h) { setResult(null); form.setFieldsValue({ endUp: '-' }); return; }
                form.setFieldsValue({ endUp: `${slot.u_position + h - 1}U` });
                // 6.14 后端区段可用性校验（红绿提示），本地校验兜底
                segmentCheck({ cabinet_id: Number(cabinetId), start_u: slot.u_position, u_height: h })
                  .then((res: any) => {
                    if (res?.err) {
                      const local = validateContiguousIdle(slot.u_position, h, allSlots);
                      setResult({ ok: local.ok, msg: local.msg });
                      return;
                    }
                    setResult({ ok: !!res?.dat?.available, msg: res?.dat?.reason || '' });
                  })
                  .catch(() => {
                    const local = validateContiguousIdle(slot.u_position, h, allSlots);
                    setResult({ ok: local.ok, msg: local.msg });
                  });
              }
            }}
          >
            <Form.Item label="起始U位">
              <Input value={`${slot.u_position}U`} disabled />
            </Form.Item>
            <Form.Item label="占用高度" name="height" required className="occupy-height-item"
              help={result ? (
                <span style={{ color: result.ok ? '#52c41a' : '#FF4D4F' }}>
                  {result.ok ? '可用' : '不可用'}
                </span>
              ) : undefined}
            >
              <InputNumber min={1} max={allSlots.length} placeholder="请输入" style={{ width: '100%' }} addonAfter="U" />
            </Form.Item>
            <Form.Item label="结束U位" name="endUp">
              <Input disabled />
            </Form.Item>
            <Form.Item label="预留说明" name="reason"
              rules={[{ required: true, message: '请输入预留说明' }, { max: 100, message: '最多 100 字' }]}>
              <Input.TextArea rows={3} placeholder="请输入预留说明" maxLength={100} showCount />
            </Form.Item>
            <Form.Item label="责任人" name="dutyPerson" rules={[{ required: true, message: '请输入责任人' }]}>
              <Input placeholder="请输入" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default ReserveModal;
