import React, { useEffect, useState } from 'react';
import { DictValueEnumObj } from '@/components/DictTag';
import { Button, Col, Form, Input, Modal, Radio, Row, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { relative } from 'path';


export type DictDataFormData = Record<string, unknown> & Partial<API.System.DictData>;

export type DictItemFormProps = {
  onCancel: (flag?: boolean, formVals?: DictDataFormData) => void;
  onSubmit: (values: any) => Promise<void>;
  open: boolean;
  values: [];
};

const DictItemForm: React.FC<DictItemFormProps> = (props) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      users: props.values,
    });
  }, [form, props]);

  //   const intl = useIntl();
  const handleOk = () => {
    form.submit();
  };
  const handleCancel = () => {
    props.onCancel();
  };
  const handleFinish = async (values: Record<string, any>) => {
    props.onSubmit(values as DictDataFormData[]);
  };

  return (
    <Modal
      width={660}
      title='编辑数据项'
      visible={props.open}
      forceRender
      destroyOnClose
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        autoComplete="off"
        labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}
        layout="horizontal" onFinish={handleFinish}
      >
        <Form.List name="users">
          {(feilds, { add, remove }) => {
            return (
              <>
                <div style={{ position:"relative" }}>
                  <Button onClick={() => {
                    add()
                  }}> 添加项</Button>
                </div>
                {feilds.map((item, index) => (
                  <Row key={item.key}>
                    <Col span={7}>
                      <Form.Item
                        label="键值"
                        labelCol={{ span: 6 }}
                        rules={[{ required: true, message: '请输入键值!' }]}
                        name={[item.name, 'dict_key']}
                      >
                        <Input placeholder='请输入标签键值' style={{ width: '120px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item
                        label="名称"
                        labelCol={{ span: 6 }}
                        rules={[{ required: true, message: '请输入名称!' }]}
                        name={[item.name, 'dict_value']}
                      >
                        <Input placeholder='请输入名称' style={{ width: '120px' }} />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item
                        label="备注"
                        labelCol={{ span: 6 }}
                        rules={[{ required: false, message: '请输入备注!' }]}
                        name={[item.name, 'remark']}
                      >
                        <Input placeholder='请输入备注' style={{ width: '120px' }} />                        
                      </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item>
                        <MinusCircleOutlined
                            className="dynamic-delete-button"
                            style={{ color: 'red' }}
                            onClick={() => remove(index)}
                          />
                          </Form.Item>
                      </Col>
                  </Row>
                ))}

              </>

            );

          }}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default DictItemForm;
