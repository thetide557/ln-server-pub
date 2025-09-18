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
  Checkbox,
  Select,
} from "antd";
import city from "./city.js";
import _ from "lodash";
import {
  addDeployment,
  putDeployment,
  getDeploymentsDetails
} from "@/services/sxxc/deploymentManagement";
import { getNotifiesList } from '@/services/manage';
import { getDictDataListByType } from '@/services/system/dict';
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
  name: string;
}

interface MaintenanceUser {
  name: string;
  phone: string;
}

interface DeploymentModalProps {
  title: string;
  open: boolean;
  closeOpen: (type: string) => void;
  itemForm: any;
}

const DeploymentModal = (props: DeploymentModalProps) => {
  const [form] = Form.useForm();
  const { title, open, closeOpen, itemForm } = props;
  const [industryOption, setIndustryOption] = useState([]);
  const [mediumOption, setMediumOption] = useState([]);
  const [applicationList, setApplicationList] = useState<Application[]>([
    { name: "" },
  ]);
  const [maintenanceUserList, setMaintenanceUserList] = useState<
    MaintenanceUser[]
  >([{ name: "", phone: "" }]);

  useEffect(() => {
    if (!open) return;

    if (applicationList.length === 0) {
      setApplicationList([{ name: "" }]);
    }
    getindustry()
    getNotifies()
    if (itemForm && itemForm.id) {
      getDeploymentsDetails(itemForm.id).then((res) => {
        const { deployment_date,province,city,county,applications,operators} = res.dat;
        form.setFieldsValue({
          ...res.dat,
          deployment_date: deployment_date
            ? moment(deployment_date)
            : null,
          region: [province,city,county ],
        });
        const applicationArr = (applications || []).map((item: any) => ({
          name: item || "",
        }));
        setApplicationList(applicationArr.length > 0 ? applicationArr : [{ name: "" }]);

        const normalizedOperators: MaintenanceUser[] = Array.isArray(operators) && operators.length > 0
          ? operators.map((item: any) => ({
              name: item?.name ?? "",
              phone: item?.phone ?? "",
            }))
          : [{ name: "", phone: "" }];
        setMaintenanceUserList(normalizedOperators);
        form.setFieldsValue({
          maintenanceUserList: normalizedOperators
        });

      })

    } else {
      form.resetFields();
    }
  }, [open, itemForm, form]);

  const getindustry = () => {
    getDictDataListByType('industry').then((res: any) => {
      if (res?.dat) {
        setIndustryOption(res.dat || []);
      }
    }).catch((error: any) => {
      console.error('获取行业数据失败:', error);
    });
  }
  const getNotifies = () => {
    getNotifiesList().then((res: any) => {
      if (res) {
        const newArr = res.map(x=>{
          return {
            label:x.label,
            value:x.key
          }
        })
        setMediumOption(newArr || []);
      }
    }).catch((error: any) => {
      console.error('获取行业数据失败:', error);
    });
  }
  const handleOk = async () => {
    try {
      const formData = await form.validateFields();
      const regionArray = Array.isArray(formData.region) ? formData.region : [];
      const [province, city, county] = regionArray;
      const deploymentDate = formData.deployment_date
        ? formData.deployment_date.format(dateFormat)
        : undefined;
      const params = {
        ...formData,
        deployment_date: deploymentDate,
        province,
        city,
        county,
        id: itemForm?.id || undefined,
        applications:applicationList.length?applicationList.map(x=>x.name):[],
        operators:maintenanceUserList
      };
      console.log(params);
      
      const apiFunction = itemForm?.id ? putDeployment : addDeployment;
      await apiFunction(params);
      message.success( itemForm?.id ? '编辑成功' : '新增成功');
      closeOpen("sure");
    } catch (error) {
      console.error('保存部署信息时发生错误:', error);
    }
  };

  const handleCancel = () => {
    closeOpen("cancel");
  };

  const addIcon = () => {
    const updatedList = [...applicationList, { name: "" }];
    setApplicationList(updatedList);
  };

  const removeIcon = (index: number) => {
    if (applicationList.length <= 1) {
      message.warning("至少保留一个应用");
      return;
    }
    const newArr = applicationList.filter((_, ind) => ind !== index);
    setApplicationList(newArr);
  };
  const addMaintenanceUser = () => {
    const updatedList = [...maintenanceUserList, { name: "", phone: "" }];
    setMaintenanceUserList(updatedList);
  };

  const removeMaintenanceUser = (index: number) => {
    if (maintenanceUserList.length <= 1) {
      message.warning("至少保留一个运维人员");
      return;
    }
    const newArr = maintenanceUserList.filter((_, ind) => ind !== index);
    setMaintenanceUserList(newArr);
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
              rules={[{ required: true, message: '请选择所属区域' }]}
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
            <Form.Item
              name="industry"
              label="所属行业"
              rules={[{ required: true, message: '请选择所属行业' }]}
            >
              <Select
                placeholder="请选择所属行业"
                options={industryOption}
                fieldNames={{ label: 'dict_value', value: 'dict_key' }}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_version" label="部署版本" rules={[{ required: true }]}>
              <Input placeholder="请输入部署版本" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_date" label="部署日期">
              {/* @ts-ignore */}
              <DatePicker style={{ width: "100%" }} format={dateFormat} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deployment_environment" label="部署环境">
              <Input placeholder="请输入部署环境" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="url" label="URL地址">
              <Input placeholder="请输入URL地址" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vpn" label="VPN名称">
              <Input placeholder="请输入VPN名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="asset_count"
              label="资产总数"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                placeholder="请输入资产总数"
              />
            </Form.Item>
          </Col>
          {applicationList.map((item, index) => {
            return (
              <Col span={24} key={index}>
                <Form.Item
                  name={`application${index + 1}`}
                  label={`纳管应用${index + 1}`}
                  labelCol={{ span: 3 }}
                  wrapperCol={{ span: 21 }}
                  style={{ marginBottom: 24 }}
                >
                  <Input.Group compact>
                    <Input
                      placeholder="请输入纳管应用名称"
                      style={{ width: "90%" }}
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...applicationList];
                        newList[index].name = e.target.value;
                        setApplicationList(newList);
                      }}
                    />
                    <div style={{ display: "inline-flex", alignItems: "center", height: "32px", verticalAlign: "middle" }}>
                      <PlusSquareOutlined
                        onClick={addIcon}
                        style={{
                          fontSize: "20px",
                          marginLeft: 8,
                          marginRight: 8,
                          color: "#1677FF",
                          cursor: "pointer",
                        }}
                      />
                      <MinusSquareOutlined
                        onClick={() => removeIcon(index)}
                        style={{
                          fontSize: "20px",
                          color:
                            applicationList.length <= 1 ? "#cccccc" : "#ff1645",
                          cursor:
                            applicationList.length <= 1
                              ? "not-allowed"
                              : "pointer",
                        }}
                      />
                    </div>
                  </Input.Group>
                </Form.Item>
              </Col>
            );
          })}
          <Col span={24}>
            <Form.Item
              name="notify_channels"
              label="告警通知媒介"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
              style={{ marginBottom: 24 }}
            >
              <Checkbox.Group options={mediumOption} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="project_desc"
              label="项目描述"
              rules={[{ required: true }]}
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
              style={{ marginBottom: 24 }}
            >
              <Input.TextArea
                allowClear
                placeholder="请输入项目情况介绍，包含合同及投标文件对于运维相关描述等。"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contact_person"
              label="联系人"
              rules={[{ required: true }]}
            >
              <Input placeholder="请输入联系人" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="联系人手机号"
              name="contact_phone"
              rules={[
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: "请输入有效的11位手机号"
                }
              ]}
            >
              <Input
                placeholder="请输入手机号"
                maxLength={11}
                inputMode="numeric"
              />
            </Form.Item>
          </Col>
          {maintenanceUserList.map((item, index) => (
            <React.Fragment key={`maintenance-user-${index}`}>
              <Col span={11}>
                <Form.Item
                  name={['maintenanceUserList', index, 'name']}
                  label={`运维人员${index + 1}`}
                  labelCol={{ span: 7 }}
                  wrapperCol={{ span: 17 }}
                  style={{ marginBottom: 24 }}
                >
                  <Input
                    placeholder="请输入运维人员名称"
                    onChange={e => {
                      const newList = maintenanceUserList.map((u, i) =>
                        i === index ? { ...u, name: e.target.value } : u
                      );
                      setMaintenanceUserList(newList);
                      form.setFieldsValue({ maintenanceUserList: maintenanceUserList.map((u, i) => i === index ? { ...u, name: e.target.value } : u) });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={11}>
                <Form.Item
                  name={['maintenanceUserList', index, 'phone']}
                  label={`手机号${index + 1}`}
                  labelCol={{ span: 7 }}
                  wrapperCol={{ span: 17 }}
                  style={{ marginBottom: 24 }}
                  rules={[
                    {
                      pattern: /^1[3-9]\d{9}$/,
                      message: "请输入有效的11位手机号"
                    }
                  ]}
                >
                  <Input
                    placeholder="请输入手机号"
                    maxLength={11}
                    inputMode="numeric"
                    onChange={e => {
                      const newList = maintenanceUserList.map((u, i) =>
                        i === index ? { ...u, phone: e.target.value } : u
                      );
                      setMaintenanceUserList(newList);
                      form.setFieldsValue({
                        maintenanceUserList: maintenanceUserList.map((u, i) =>
                          i === index ? { ...u, phone: e.target.value } : u
                        )
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col
                span={2}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 24,
                  paddingLeft: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <PlusSquareOutlined
                    onClick={addMaintenanceUser}
                    style={{
                      fontSize: "20px",
                      marginRight: 8,
                      color: "#1677FF",
                      verticalAlign: "middle",
                      cursor: "pointer",
                    }}
                  />
                  <MinusSquareOutlined
                    onClick={() => removeMaintenanceUser(index)}
                    style={{
                      fontSize: "20px",
                      color:
                        maintenanceUserList.length <= 1 ? "#cccccc" : "#ff1645",
                      cursor:
                        maintenanceUserList.length <= 1
                          ? "not-allowed"
                          : "pointer",
                      verticalAlign: "middle",
                    }}
                  />
                </div>
              </Col>
            </React.Fragment>
          ))}
        </Row>
      </Form>
    </Modal>
  );
};

export default DeploymentModal;
