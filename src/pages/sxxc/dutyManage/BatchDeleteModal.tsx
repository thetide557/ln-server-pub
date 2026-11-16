import React, { useState } from "react";
import { Modal, Form, Button, DatePicker, Space, message } from "antd";
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

interface BatchDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (timeRanges: TimeRange[]) => void;
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // 校验时间范围是否重叠
  const validateTimeRanges = (timeRanges: TimeRange[]): string | null => {
    if (!timeRanges || timeRanges.length === 0) return null;
    // 按开始时间排序
    const sortedRanges = [...timeRanges].sort(
      (a, b) => a.start.valueOf() - b.start.valueOf()
    );

    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const current = sortedRanges[i];
      const next = sortedRanges[i + 1];
      if (current.end.startOf('day').valueOf() >= next.start.startOf('day').valueOf()) {
        return `时间段之间存在交集，请调整时间范围`;
      }
    }
    return null;
  };

  // 处理确认删除
  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      const dateRanges = values.timeRanges;

      // 校验至少一个时间段
      if (!dateRanges || dateRanges.length === 0) {
        message.error("请至少选择一个时间段");
        return;
      }

      // 转换数据格式
      const timeRanges: TimeRange[] = dateRanges
        .filter((item: any) => item.dateRange && item.dateRange.length === 2)
        .map((item: any) => ({
          start: item.dateRange[0],
          end: item.dateRange[1],
        }));

      if (timeRanges.length === 0) {
        message.error("请至少选择一个有效的时间段");
        return;
      }

      // 校验时间段是否重叠
      const overlapError = validateTimeRanges(timeRanges);
      if (overlapError) {
        message.error(overlapError);
        return;
      }

      // 显示确认对话框
      Modal.confirm({
        title: "确认删除",
        content: "排班表将清除，确认删除？",
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          setConfirmLoading(true);
          try {
            await onConfirm(timeRanges);
            message.success("删除成功");
            form.resetFields();
            onCancel();
          } catch (error:any) {
            message.error(error.message || "删除失败"); 
          } finally {
            setConfirmLoading(false);
          }
        },
      });
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
      title="批量删除"
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
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#ff4d4f" }}>*</span> 请选择删除的时间范围：
      </div>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{ timeRanges: [{}] }}
      >
        <Form.List name="timeRanges">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: "flex", marginBottom: 8 }}
                  align="baseline"
                >
                  {/* 日期选择器 */}
                  <Form.Item
                    {...restField}
                    name={[name, "dateRange"]}
                    rules={[
                    //   { required: true, message: "请选择时间范围" },
                      // 结束时间不能早于开始时间
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || value.length < 2) {
                            return Promise.reject(
                              new Error("请选择完整的时间范围")
                            );
                          }
                          const [start, end] = value;
                          if (start && end && start.valueOf() > end.valueOf()) {
                            return Promise.reject(
                              new Error("结束时间不能早于开始时间")
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    {/* @ts-ignore */}
                    <RangePicker
                      format="YYYY-MM-DD"
                      disabledDate={disabledDate}
                      placeholder={["年/月/日", "年/月/日"]}
                      style={{ width: "100%" }}
                      separator="至"
                    />
                  </Form.Item>

                  <MinusSquareFilled
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fields.length > 1) {
                        remove(name);
                      }
                    }}
                    style={{ fontSize: 13, color: "#bbbbbb" }}
                    disabled={fields.length <= 1}
                    title="删除时间段"
                  />
                  <PlusSquareFilled
                    onClick={(e) => {
                      e.stopPropagation();
                      add();
                    }}
                    style={{ fontSize: 13, color: "#2888f7" }}
                    title="添加时间段"
                  />
                </Space>
              ))}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default BatchDeleteModal;
