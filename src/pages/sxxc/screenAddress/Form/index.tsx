import PageLayout from '@/components/pageLayout';
import { Button, Col, Divider, Form, Input, Row, Space, InputNumber, Select, Modal, Tabs, Card } from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './form.less';
import Gradient from '@/components/ColorPicker/gradient';
import Color from '@/components/ColorPicker/color';
import { getBusiGroups } from '@/services/common';
import { Background } from '@antv/x6/lib/registry';
interface IProps {
  title?: string;
  disabled?: boolean;
  initialValues?: any;
  onFinish?: (value) => void;
}
interface Option {
  label: string;
  value: string;
}
const panelBaseProps: any = {
  size: 'small',
  bodyStyle: { padding: '24px 24px 5px 24px' },
};
const bigScreenTypeOption: any = [
  {
    label: '一级大屏',
    value: '1',
  },
  {
    label: '二级大屏',
    value: '2',
  },
]
const navTemplateOption: any = [
  {
    label: '模板一',
    value: '1',
  },
  {
    label: '模板二',
    value: '2',
  },
  {
    label: '模板三',
    value: '3',
  },
  {
    label: '模板四',
    value: '4',
  },
]
export default function ({ title, disabled, initialValues, onFinish }: IProps) {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    nav_template:'',
    nav_name:'',
    font_size:'',
    font_color:'',
    bg_color:'',
    bg_width:'',
    bg_height:''
  });
  const history = useHistory();
  const [bigScreenType, setBigScreenType] = useState();
  const [businessGroupOption, setBusinessGroupOption] = useState<Option[]>([]);
  const layout = { labelCol: { span: 8 }, wrapperCol: { span: 10 } };
  const hiddenLayout = { span: 0 };

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues]);
  useEffect(() => {
    getBusiGroupsData()
  }, []);

  // 获取业务组otions
  const getBusiGroupsData = () => {
    getBusiGroups().then(res => {
      const options = res.dat.map(x => {
        return {
          label: x.name,
          value: x.id
        }
      })
      setBusinessGroupOption(options)
    });
  }

  const onFormChange = (changedValues, allValues) => {
    setFormData(allValues);
  }
  return (
    <PageLayout title={title} showBack>
      <Tabs
        className='assetmgt_list_2'
        activeKey='base_set'
        type='card'
        size='small'
      >
        <Tabs.TabPane tab={'基本信息'} key='base_set' className='tab_header'></Tabs.TabPane>
      </Tabs>
      <Form layout='horizontal' {...layout} disabled={disabled} form={form} onFinish={onFinish} onValuesChange={onFormChange} className='forms'>
        <Card {...panelBaseProps} className='card_base'>
          <Form.Item name='id' wrapperCol={hiddenLayout}>
            <InputNumber hidden></InputNumber>
          </Form.Item>
          <Row>
            <Col span={12}>
              <Form.Item name='type' label='大屏类型' rules={[{ required: true }]}>
                <Select
                  style={{ width: '60%' }}
                  options={bigScreenTypeOption}
                  placeholder='请选择大屏类型'
                  onChange={(val) => {
                    setBigScreenType(val);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          {
            bigScreenType && (
              <>
                <Row>
                  <Col span={12}>
                    <Form.Item name='title' label='大屏标题' rules={[{ required: true }]}>
                      <Input placeholder='请输入大屏标题' />
                    </Form.Item>
                  </Col>
                  {
                    bigScreenType == '1' && (
                      <Col span={12}>
                        <Form.Item name='config' label='配置' rules={[{ required: true }]}>
                          <Input placeholder='请输入配置' />
                        </Form.Item>
                      </Col>
                    )
                  }
                  {
                    bigScreenType == '2' && (
                      <Col span={12}>
                        <Form.Item name='busi_group' label='业务组' rules={[{ required: true }]}>
                          <Select
                            options={businessGroupOption}
                            placeholder='请选择业务组'
                          />
                        </Form.Item>
                      </Col>
                    )
                  }
                </Row>
                {
                  bigScreenType == '1' && (
                    <Row>
                      <Col span={12}>
                        <Form.Item name='desc' label='简介'>
                          <Input.TextArea placeholder='请输入简介' />
                        </Form.Item>
                      </Col>
                    </Row>
                  )
                }
              </>
            )
          }
          {
            bigScreenType == '1' && (
              <>
                <Divider orientation="left" orientationMargin="0" style={{ borderColor: '#A9D0FF' }}>导航配置</Divider>
                <Row>
                  <Col span={12}>
                    <Form.Item name='copy_from' label='配置复制'>
                      <Select
                        options={businessGroupOption}
                        placeholder='请选择复制大屏'
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <Form.Item name='nav_template' label='导航模板' rules={[{ required: true }]}>
                      <Select
                        options={navTemplateOption}
                        placeholder='请选择导航模板'
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name='nav_name' label='导航名称' rules={[{ required: true }]}>
                      <Input placeholder='请输入导航名称' />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <Form.Item name='font_size' label='字体大小' rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} placeholder='请输入字体大小' />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name='font_color' className='colors' label='字体颜色' rules={[{ required: true, message: '请选择字体颜色' }]}>
                      <Color label={"字体颜色"} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <Form.Item name='bg_width' label='背景宽度' rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} placeholder='请输入背景宽度' />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name='bg_height' label='背景高度' rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} placeholder='请输入背景高度' />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <Form.Item name='bg_color' className='colors' label='背景颜色' rules={[{ required: true, message: '请选择背景颜色' }]}>
                      <Gradient label={"背景颜色"} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <Form.Item>
                      <Card title="导航预览" {...panelBaseProps} className='views'>
                        <div className={[formData.nav_template ? `style${formData.nav_template}` : null, 'diamond'].join(" ")} style={{ background: formData.bg_color, width: formData.bg_width, height: formData.bg_height }}>
                          {
                            formData.nav_name && (
                              <div className='title' style={{ fontSize: formData.font_size, color: formData.font_color }}>{formData.nav_name}</div>
                            )
                          }
                        </div>
                      </Card>
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )
          }
          <Row justify='center'>
            <Space>
              <Button
                onClick={() => {
                  history.goBack();
                }}
              >
                取消
              </Button>
              <Button type='primary' style={{backgroundColor:'#76D183',border: 'none'}} htmlType='submit'>
                确定
              </Button>
            </Space>
          </Row>
        </Card>
      </Form>


    </PageLayout>
  );
}
