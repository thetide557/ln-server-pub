import React, { useEffect } from 'react';
import { DictValueEnumObj } from '@/components/DictTag';
import FormItem from '@/components/PromQueryBuilder/components/FormItem';
import { Form, Input, Modal, Radio } from 'antd';
import TextArea from 'rc-textarea';

export type DictTypeFormData = Record<string, unknown> & Partial<API.System.DictType>;

export type DictTypeFormProps = {
  onCancel: (flag?: boolean, formVals?: DictTypeFormData) => void;
  onSubmit: (values: DictTypeFormData) => Promise<void>;
  open: boolean;
  values: Partial<API.System.DictType>;
  statusOptions: DictValueEnumObj;
};

const DictTypeForm: React.FC<DictTypeFormProps> = (props:any) => {
  const [form] = Form.useForm();

  const { statusOptions } = props;


  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      id: props.values.id,
      dict_name: props.values.dict_name,
      dict_code: props.values.dict_code,
      remark: props.values.remark,
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
    props.onSubmit(values as DictTypeFormData);
  };

  return (
    <Modal
      width={640}
      title='编辑字典类型'
      visible={props.open}
      forceRender
      destroyOnClose
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        // initialValues={props.values}
        labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}
        onFinish={handleFinish}>

         <Form.Item
          label='主键'
          name="id"
          hidden
        >
          <Input placeholder="请输入字典主键！" />
        </Form.Item>
        <Form.Item
          label='字典编号'
          name="type_code"
          rules={[
            {
              required: true,
              message: "请输入字典编号！",
            },
          ]}
        >
          <Input placeholder="请输入字典编号(非中文字符)！" />
        </Form.Item>

        <Form.Item
          name="dict_name"
          label='字典名称'
          rules={[
            {
              required: true,
              message: "请输入字典名称！",
            },
          ]}
        >
          <Input placeholder='请输入字典名称！'  />
        </Form.Item>        
        <Form.Item label="备注" name="remark">
            <TextArea placeholder='请输入备注'  rows={4} cols={60}  defaultValue={props.values.remark}/>
        </Form.Item>

      </Form>
    </Modal>
  );
};

export default DictTypeForm;
