import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Cascader,
  Col,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Modal,
  Row,
  Select,
  message,
} from "antd";
import city from "./city.js";
import {
  addDeployment,
  putDeployment,
} from "@/services/sxxc/deploymentManagement";
import _ from "lodash";
import moment, { Moment } from "moment";
const dateFormat = "YYYY-MM-DD";
const formItemLayout = {
  labelCol: {
    span: 5,
  },
  wrapperCol: {
    span: 19,
  },
};
const tailLayout = {
  labelCol: {
    span: 3,
  },
  wrapperCol: { span: 21 },
};
const AccordionModal = (props: any) => {
  const [form] = Form.useForm();
  const { title, open, closeOpen, itemForm } = props;
  useEffect(() => {
    if (itemForm.id) {
      form.setFieldsValue({
        ...itemForm,
        deployment_date: moment(itemForm.deployment_date),
        region:itemForm?.region.split(',')
      });
    }
  }, []);

  const handleOk = () => {
    form
      .validateFields()
      .then((data) => {
        let params = {
          ...data,
          deployment_date: data.deployment_date.format(dateFormat),
          province: data.region[0],
          city: data.region[1],
        };
        if (itemForm.id) {
          putDeployment({ ...params, id: itemForm.id }).then((res) => {
            message.success("修改成功");
            closeOpen("sure");
          });
        } else {
          addDeployment(params).then((res) => {
            message.success("新增成功");
            closeOpen("sure");
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleCancel = () => {
    closeOpen("cancel");
  };

  return (
    <Modal
      visible={open}
      title={title}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
    >
      <Form form={form} {...formItemLayout}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="project_name"
              label="项目名称"
              rules={[{ required: true }]}
              {...tailLayout}
            >
              <Input placeholder="请输入项目名称" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="region"
              label="所属区域"
              rules={[{ required: true }]}
            >
              <Cascader
                options={city}
                fieldNames={{
                  label: "label",
                  value: "label",
                  children: "children",
                }}
                placeholder="请选择所属区域"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_date" label="部署日期">
              <DatePicker
                style={{ width: "100%" }}
                format={dateFormat}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="deployment_version" label="部署版本">
              <Input placeholder="请输入部署版本" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="asset_count" label="资产总数">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="请输入资产总数"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="contact_person" label="联系人">
              <Input placeholder="请输入联系人" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
export default AccordionModal;
