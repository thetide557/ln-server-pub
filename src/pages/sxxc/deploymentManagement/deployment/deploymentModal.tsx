import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Cascader,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  message,
} from "antd";
import city from "./city.js";
import { addDeployment } from "@/services/sxxc/deploymentManagement";
import _ from "lodash";
import moment, { Moment } from "moment";
import dayjs from 'dayjs';
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
  const [deptoymentDate, setDeptoymentDate] = useState<string>();
  const [provinceData, setProvinceData] = useState([] as any);
  useEffect(() => {
    console.log(itemForm);
    if (itemForm.id) {
      form.setFieldsValue({
        ...itemForm,
        deployment_date: moment(itemForm.deployment_date),
        province: itemForm.region.split(","),
      });
    }
  }, []);

  const handleOk = () => {
    form
      .validateFields()
      .then((data) => {
        let formParam = form.getFieldsValue();
        console.log(formParam);
      
      console.log(dayjs(formParam.deployment_date));
       
        let params = {
          ...data,
          deployment_date: moment(formParam.deployment_date),
          province: formParam.province[0],
          city: formParam.province[1],
        };
        if (itemForm.id) {
          // editXhAssetstypesNew({ ...params }, curGroup.id).then((res) => {
          //   message.success("修改成功");
          //   closeOpen("sure");
          // });
        } else {
          // addDeployment(params).then((res) => {
          //   message.success("新增成功");
          //   closeOpen("sure");
          // });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleCancel = () => {
    closeOpen("cancel");
  };

  const provinceChange = (value, selectedOptions) => {
    setProvinceData(selectedOptions.map((x) => x.label));
  };
  const dateChange = (value,dateString) => {
    console.log(value);
    form.setFieldsValue({ deployment_date: dateString });
    // setDeptoymentDate(value);
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
              name="province"
              label="所属区域"
              rules={[{ required: true }]}
            >
              <Cascader
                options={city}
                defaultValue={[]}
                onChange={provinceChange}
                placeholder="请选择所属区域"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_date" label="部署日期" getValueFromEvent={(...[, dateString]) => dateString} getValueProps={(value) => ({value: value ? dayjs(value, 'YYYY-MM-DD') : undefined})}>
              <DatePicker
                style={{ width: "100%" }}
                format = 'YYYY-MM-DD'
                onChange={dateChange}
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
