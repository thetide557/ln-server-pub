import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import _ from 'lodash';
import './index.less';

const AccordionModal = (props: any) => {
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const { title, open, setOpen, refreshTree, treeData, groupId } = props
  console.log(treeData);
  const optionList = treeData[0]?.children || []
  const [checkList, setCheckList] = useState<any>([])

  const handleOk = () => {
    // let data = form.getFieldsValue();
    // console.log(data);
    form.validateFields().then((data) => {
      console.log(data);
      // setOpen(false);
      // refreshTree()
    }).catch(err => {
      console.log(err);
    })
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleChange = (value: any, option: any) => {
    console.log(value);
    console.log(option);
    setCheckList(value)
  }

  const reset = () => {
    // 重置下拉框
    form.setFieldsValue({
      groups: []
    })
    setCheckList([])
  }

  const remove = (item) => {
    console.log(item);
    const data = checkList.filter(param => param != item)
    console.log(data);
    form.setFieldsValue({
      groups: data
    })
    setCheckList(data)
  }

  return (
    <Modal
      visible={open}
      title={title}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
      >
        <Form.Item name="name" label="分组名称" rules={[{ required: true }]}>
          <Input placeholder="请输入分组名称" maxLength={20} />
        </Form.Item>
        <Form.Item name="groups" label="分组设备" rules={[{ required: true, message: '请选择分组内的设备类型' }]}>
          <Select
            mode="multiple"
            placeholder="请选择分组内的设备类型"
            onChange={handleChange}
            allowClear
          >
            {
              _.map(optionList, item => {
                return (
                  <Select.Option value={item.name} key={item.id}>
                    {item.name}
                  </Select.Option>
                )
              })
            }
          </Select>
        </Form.Item>
        <Form.Item label={null}>
          <div className='check-box'>
            <div className="check-title">
              <div className="check-num">
                已选（{checkList.length}）
              </div>
              <div className="check-reset" onClick={reset}>
                <div className="check-icon"></div>
                <div>重置</div>
              </div>
            </div>
            <div className='check-content'>
              {_.map(checkList, (item) => {
                return (
                  <div className='check-card'>
                    <div className='card-icon' onClick={() => { remove(item) }}></div>
                    <div>{item}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default AccordionModal

