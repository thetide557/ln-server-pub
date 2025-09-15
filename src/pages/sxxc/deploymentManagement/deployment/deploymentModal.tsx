import React, { useEffect, useState } from "react";
import {
  Cascader,
  Col,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Modal,
  Row,
  message,
} from "antd";
import city from "./city.js";
import _ from 'lodash';
import {
  addDeployment,
  putDeployment,
} from "@/services/sxxc/deploymentManagement";
import moment from "moment";
import { MinusSquareOutlined, PlusSquareOutlined } from "@ant-design/icons";
const dateFormat = "YYYY-MM-DD";
const formItemLayout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 18,
  },
};
const tailLayout = {
  labelCol: {
    span: 3,
  },
  wrapperCol: { span: 21 },
};
interface Application {
  applicationName1: string;
}
const AccordionModal = (props: any) => {
  const [form] = Form.useForm();
  const { title, open, closeOpen, itemForm } = props;

  const [applicationList, setApplicationList] = useState<Application[]>([]);
  useEffect(() => {
    if (!open) return;
    setApplicationList([...applicationList, { applicationName1: '' }]);
    if (itemForm && itemForm.id) {
      const regionValue = Array.isArray(itemForm.region)
        ? itemForm.region
        : typeof itemForm.region === "string" && itemForm.region
          ? itemForm.region.split(",")
          : [];
      form.setFieldsValue({
        ...itemForm,
        deployment_date: itemForm.deployment_date ? moment(itemForm.deployment_date) : null,
        region: regionValue,
      });
    } else {
      form.resetFields();
    }
  }, [open, itemForm, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((data) => {
        console.log(data);

        const regionArr = Array.isArray(data.region) ? data.region : [];
        let params = {
          ...data,
          deployment_date: data.deployment_date ? data.deployment_date.format(dateFormat) : undefined,
          province: regionArr[0],
          city: regionArr[1],
          county: regionArr[2],
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
  const addIcon = () => {
    const indexs = applicationList.length
    const updatedList = [
      ...applicationList,
      { [`applicationName${indexs}`]: '' } // 键名按实际需求调整
    ];
    console.log(updatedList);
    setApplicationList(updatedList);
  };






















  const removeIcon = (index: number) => {
    console.log(applicationList);
    const newArr = applicationList.filter((x, ind) => ind != index)
    console.log(newArr);
    setApplicationList(newArr);
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
          <Col span={12}>
            <Form.Item
              name="region"
              label="所属区域"
              rules={[{ required: true }]}
            >
              <Cascader
                options={city}
                fieldNames={{
                  label: "name",
                  value: "name",
                  children: "children",
                }}
                placeholder="请选择所属区域"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="industry" label="所属行业" rules={[{ required: true }]}>
              <Input placeholder="请输入所属行业" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_version" label="部署版本">
              <Input placeholder="请输入部署版本" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_date" label="部署日期">
              {/* @ts-ignore */}
              <DatePicker
                style={{ width: "100%" }}
                format={dateFormat}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_version" label="部署环境">
              <Input placeholder="请输入部署环境" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_version" label="URL地址">
              <Input placeholder="请输入URL地址" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_version" label="VPN名称">
              <Input placeholder="请输入VPN名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="asset_count" label="资产总数" rules={[{ required: true }]}>
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                placeholder="请输入资产总数"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="contact_person" label="联系人">
              <Input placeholder="请输入联系人" />
            </Form.Item>
          </Col>
          {_.map(applicationList, (item, index) => {
            return (
              <Col span={24} key={index}>
                <Form.Item
                  labelCol={{ span: 3 }}
                  wrapperCol={{ span: 21 }}
                  name={`applicationName${index + 1}`}
                  label={`纳管应用${index + 1}`}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Input placeholder="请输入纳管应用名称" style={{ width: "91%" }} />
                  <PlusSquareOutlined onClick={addIcon} style={{ fontSize: "20px", margin: ".5rem", color: '#1677FF' }} />
                  <MinusSquareOutlined onClick={() => removeIcon(index)} style={{ fontSize: "20px", color: index === 0 ? '#cccccc' : '#ff1645' }} />
                </Form.Item>
              </Col>
            );
          })};
        </Row>
      </Form>
    </Modal>
  );
};
export default AccordionModal;
