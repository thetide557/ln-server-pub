import './style.less';
import React, { useContext, useEffect, useState } from 'react';

import { Button, Card, Col, Form, Input, message, Modal, Row, Select, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import { addAsset, getAssetDefaultConfig, getAssetsIdents, getAssetstypes, updateAsset } from '@/services/assets';
import { FileAddOutlined } from '@ant-design/icons';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { StreamLanguage } from '@codemirror/stream-parser';
import CodeMirror from '@uiw/react-codemirror';

export default function (props: { initialValues: object; initParams: object; mode?: string }) {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [curBusiId] = useState<number>(commonState.curBusiId);
  const [assetTypes, setAssetTypes] = useState<{ name: string; form: any }[]>([]);
  const [identList, setIdentList] = useState([]);
  const [params, setParams] = useState<{ label: string; name: string; editable?: boolean; password?: boolean; items?: [] }[]>([]);
  const [form] = Form.useForm();

  const panelBaseProps: any = {
    size: 'small',
    bodyStyle: { padding: '24px 24px 8px 24px' },
  };

  const genForm = () => {
    const assetType = assetTypes.find((v) => v.name === form.getFieldValue('type'));
    if (assetType) {
      setParams(assetType.form || []);
    }
  };

  const genDefaultConfig = () => {
    const name = form.getFieldValue('type');
    const data = form.getFieldsValue();
    if (data.configs) {
      Modal.confirm({
        title: '将会覆盖原有配置,是否继续?',
        onOk: () => {
          delete data.configs;
          getAssetDefaultConfig(name, data).then((res) => {
            form.setFieldsValue({ configs: res.dat.content });
          });
        },
      });
    } else {
      getAssetDefaultConfig(name, data).then((res) => {
        form.setFieldsValue({ configs: res.dat.content });
      });
    }
  };

  useEffect(() => {
    getAssetsIdents().then((res) => {
      const items = res.dat.map((v) => {
        return {
          value: v.ident,
          label: v.ident,
        };
      });
      setIdentList(items);
    });

    getAssetstypes().then((res) => {
      const items = res.dat
        .map((v) => {
          return {
            value: v.name,
            label: v.name,
            ...v,
          };
        })
        .filter((v) => v.name !== '主机'); //探针自注册的不在前台添加
      setAssetTypes(items);
    });
  }, []);

  useEffect(() => {
    genForm();
    form.setFieldsValue(props.initialValues);
  }, [props]);

  const submitForm = async (values) => {
    values.group_id = curBusiId;
    values.params = JSON.stringify(values);
    if (props.mode === 'edit') {
      await updateAsset(values);
    } else {
      await addAsset(values);
    }
    message.success('操作成功');
    history.back();
  };

  const renderForm = (v) => {
    if (v.items) {
      return (
        <Select
          style={{ width: '100%' }}
          options={v.items.map((v) => {
            return { label: v, value: v };
          })}
        ></Select>
      );
    }
    if (v.password) {
      return <Input.Password placeholder={`填写${v.label}`} />;
    }
    return <Input placeholder={`填写${v.label}`} />;
  };

  return (
    <Form
      name='asset'
      form={form}
      layout='vertical'
      onFinish={submitForm}
      onValuesChange={() => {
        genForm();
      }}
    >
      <Form.Item hidden name='id'>
        <Input></Input>
      </Form.Item>
      <div className='card-wrapper'>
        <Card {...panelBaseProps} title={t('basic')}>
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item label='类型' name='type' rules={[{ required: true }]}>
                <Select style={{ width: '100%' }} options={assetTypes} placeholder='请选择资产类型' disabled={props.mode === 'edit'} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label='名称' name='name' rules={[{ required: true }]}>
                <Input placeholder='请输入资产名称' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label='标识' name='label' rules={[{ required: true }]}>
                <Input placeholder='请输入资产名称' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label='备注' name='memo'>
                <Input placeholder='填写备注' />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </div>
      <div className='card-wrapper'>
        <Card {...panelBaseProps} title={t('info')}>
          <Row gutter={10}>
            {params.map((v) => {
              return (
                <Col key={`col=${v.name}`} span={12}>
                  <Form.Item key={`form-item${v.name}`} label={v.label} name={v.name} initialValue={props.initParams[v.name]}>
                    {renderForm(v)}
                  </Form.Item>
                </Col>
              );
            })}
            <Col span={12}>
              <Form.Item label='探针' name='ident'>
                <Select style={{ width: '100%' }} options={identList} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label={
                  <Space>
                    采集配置
                    <Button type='primary' icon={<FileAddOutlined />} size='small' onClick={genDefaultConfig}>
                      自动生成
                    </Button>
                  </Space>
                }
                name='configs'
                rules={[{ required: true }]}
              >
                <CodeMirror height='200px' extensions={[StreamLanguage.define(toml)]}></CodeMirror>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </div>
      <div className='card-wrapper'>
        <Form.Item>
          <Space>
            <Button type='primary' htmlType='submit'>
              保存
            </Button>
            <Button
              onClick={() => {
                history.back();
              }}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </div>
    </Form>
  );
}
