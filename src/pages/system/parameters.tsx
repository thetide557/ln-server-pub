import React, { createRef, useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row, Form, Checkbox, Card, FormInstance, Select, Col, Radio } from 'antd';
import PageLayout from '@/components/pageLayout';
import { CheckCircleOutlined, DownOutlined, GroupOutlined, SearchOutlined } from '@ant-design/icons';
const { confirm } = Modal;
import { SetConfigTables, SetConfigForms, ParametersForms } from './catalog'
import { CommonStateContext } from '@/App';
import './style.less';
import _ from 'lodash';
import { getParametersList, updateParametersList } from '@/services/parameters'
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

export default function () {
  const commonState = useContext(CommonStateContext);

  const [initData, setInitData] = useState({});
  const [formData, setFormData] = useState<any>({});
  const [businessForm, setBusinessForm] = useState<any>({});
  const [form] = Form.useForm();
  const { permList, profile, setProfile } = useContext(CommonStateContext);
  const [refArr, setRefArr] = useState<any>({});
  // const logOptions = [
  //   { label: 'DEBUG', value: 1 },
  //   { label: 'INFO', value: 2 },
  //   { label: 'WARNING', value: 3 },
  //   { label: 'ERROR', value: 4 }
  // ];
  const logOptions = [
    { label: 'DEBUG', value: "1" },
    { label: 'INFO', value: "2" },
    { label: 'WARNING', value: "3" },
    { label: 'ERROR', value: "4" }
  ];
  const [swithCaptcha, setSwithCaptcha] = useState<any>();
  const [swithRsa, setSwithRsa] = useState<any>();
  const [checkBoxCheck, setCheckBoxCheck] = useState<any>();
  const [checkedValues, setCheckedValues] = useState<any>([]);
  const { Group: RadioGroup } = Radio;
  const [radioCheck, setRadioCheck] = useState<number>();
  useEffect(() => {
    setSwithCaptcha(true);
    setSwithRsa(true);
    getParametersList().then(({ dat }) => {
      console.log("AAAAAAAAAAAAAA")
      console.log(dat);
      if (dat.captcha == 2) {
        setSwithCaptcha(false);
      }
      if (dat.open_rsa == 2) {
        setSwithRsa(false);
      }
      let groups = [];
      if (dat.log_lever) {
        setRadioCheck(dat.log_lever);
        //dat["log_lever"]= [dat.log_lever];
        dat["log_lever"] = dat.log_lever.toString();
      }
      form.setFieldsValue(dat);


    })
  }, []);

  const renderFields = (text, record, field, currentConfigId) => {
    console.log("渲染数据列", text, record, field, currentConfigId);
    let value = record[field];
    return value;
  }

  const handleClick = (action: any, id: any) => {
    console.log('handleClick', action, id);
  }

  const submitForm = async (values) => {
    console.log('submitForm', values);
    values["http_port"] = parseInt(values["http_port"]);



    values["log_lever"] = radioCheck;
    values["captcha"] = swithCaptcha ? 1 : 2;
    values["open_rsa"] = swithRsa ? 1 : 2;
    updateParametersList(values).then((res) => {
      message.success('保存成功');
    });
  };

  const onSwitchCaptchaChange = (checked: boolean) => {
    setSwithCaptcha(checked);
    console.log(`switch to ${checked}`);
  };
  const onSwitchRsaChange = (checked: boolean) => {
    setSwithRsa(checked);
    console.log(`switch to ${checked}`);
  };
  // const onCheckChange = (checkedValues: CheckboxValueType[]) => {
  //   console.log('checked = ', checkedValues);
  //   setCheckedValues(checkedValues);
  // };

  // 定义单选框回调函数
  const handleLogLeverChange = (e) => {
    const selectedValue = parseInt(e.target.value, 10);
    setRadioCheck(selectedValue);
    console.log('setRadioCheck:', radioCheck);
    console.log('选中的值:', selectedValue);

  };
  return (
    <PageLayout icon={<GroupOutlined />} title={'系统参数设置'}>
      <div className='body-list' style={{ width: '94%', margin: '0 auto' }}>

        <div className='parameters_set'>
          <Form form={form}
            name="basic"
            className='parameters_submit_form'
            layout="vertical"
            onFinish={submitForm}
          // autoComplete="off"
          >

            <div className='parameters_title'>
              <div className='title'>参数设置</div>
            </div>
            <Row gutter={10}>
              <Col span={8} >
                <Form.Item label="绑定IP" name="http_host" className="form-item" labelAlign='right'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="启用端口" name='http_port' className="form-item" labelAlign='right'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='启用验证码' name='captcha' className="form-item" labelAlign='right'>
                  <Switch checked={swithCaptcha} onChange={onSwitchCaptchaChange}></Switch>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={10}>
              <Col span={8}>
                <Form.Item label="用户登录token过期时间" name='access_expired' labelAlign='right'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="用户登录token刷新时间" name='refresh_expired' labelAlign='right'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='启动RSA加密' name='open_rsa' labelAlign='right'>
                  <Switch checked={swithRsa} onChange={onSwitchRsaChange}></Switch>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col >
                <Form.Item label='日志等级' name='log_lever' labelAlign='right'>
                  {/* <Checkbox.Group  options={logOptions} onChange={onCheckChange}></Checkbox.Group> */}
                  <RadioGroup options={logOptions} onChange={handleLogLeverChange} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item wrapperCol={{ offset: 10, span: 16 }} className='submit_button'>
              {
                (profile.roles?.includes("Admin") || permList.includes("/system/parameters/save")) && <Button style={{ width: "70px" }} type="primary" htmlType="submit">
                  保存
                </Button>
              }
            </Form.Item>


          </Form>
        </div>
      </div>
    </PageLayout>
  );
}
