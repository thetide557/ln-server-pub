import React, { useState } from "react";
import { Modal, Form, Button, DatePicker, Space, message, Radio } from "antd";
import {
  PlusSquareFilled,
  MinusSquareFilled,
} from "@ant-design/icons";
import moment, { Moment } from "moment";
import type { RangePickerProps } from "antd/es/date-picker";

const { RangePicker } = DatePicker;

// 修改接口定义，使用 Moment
export interface TimeRange {
  start: Moment;
  end: Moment;
}

interface AutoScheduleModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (timeRanges: TimeRange[]) => void;
}

const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // 处理确认
  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      try {
        await onConfirm(values);
        form.resetFields();
        onCancel();
      } catch (error: any) {
        message.error(error.message || "排班失败");
      } finally {
        setConfirmLoading(false);
      }
    } catch (error) {
      console.log("表单验证失败:", error);
    }
  };

  // 禁用今天之前的日期
  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    return current && current < moment().startOf("day");
  };

  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="自动排班"
      visible={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={confirmLoading}
          onClick={handleConfirm}
        >
          确定
        </Button>,
      ]}
      width={400}
      destroyOnClose
    >
      <Form
        form={form}
        autoComplete="off"
      >
        <Form.Item label="排班类型" name="mode" rules={[{ required: true, message: "请选择排班类型" }]}>
          <Radio.Group>
            <Radio value="current_month"> 当月 </Radio>
            <Radio value="range"> 指定时间范围 </Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, curValues) => prevValues.mode !== curValues.mode}
        >
          {({ getFieldValue }) =>
            getFieldValue('mode') === 'range' ? (
              <Form.Item name="dateRange" label="时间范围" rules={[{ required: true, message: "请选择时间范围" }]}>
                {/* @ts-ignore */}
                <RangePicker
                  format="YYYY-MM-DD"
                  disabledDate={disabledDate}
                  placeholder={["年/月/日", "年/月/日"]}
                  style={{ width: "100%" }}
                  separator="至"
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AutoScheduleModal;
