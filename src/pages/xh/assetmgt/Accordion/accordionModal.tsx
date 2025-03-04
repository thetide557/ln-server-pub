import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { addAssetstypesNew, addXhAssetstypesNew, editAssetstypesNew, editXhAssetstypesNew } from '@/services/assets';
import _ from 'lodash';
import './index.less';

const AccordionModal = (props: any) => {
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const { title, open, closeOpen, treeData, curGroup,level,parentId } = props
  // console.log(treeData);
  const optionList = treeData[0]?.children || []
  const [checkList, setCheckList] = useState<any>([])

  useEffect(() => {
    console.log(curGroup);
    if (curGroup.name) {
      const typsList = curGroup.type_list?.map(item => item.name)
      // 修改
      const obj = {
        id: curGroup.id,
        name: curGroup.name,
        types: typsList
      }
      setCheckList(typsList)
      form.setFieldsValue(obj)
    }
  }, [])

  const handleOk = () => {
    // let data = form.getFieldsValue();
    // console.log(data);
    form.validateFields().then((data) => {
      let params = { ...data, status: 0 };
      // params.types = params.types.toString()
      // console.log(curGroup);
      if (curGroup.name) {
        params.level = curGroup.group_level
        // editAssetstypesNew({ ...params, id: curGroup.id }).then(res => {
        editXhAssetstypesNew({ ...params  },curGroup.id).then(res => {
          message.success('修改成功')
          // refreshTree()
          closeOpen('sure')
        })
      } else {
        params.level = level
        params.parent_id = parentId
        // addAssetstypesNew(params).then(res => {
        addXhAssetstypesNew(params).then(res => {
          message.success('新增成功')
          // refreshTree()
          closeOpen('sure')
        })

      }
    }).catch(err => {
      console.log(err);
    })
  };

  const handleCancel = () => {
    closeOpen('cancel');
  };

  const handleChange = (value: any, option: any) => {
    // console.log(value);
    // console.log(option);
    setCheckList(value)
  }

  const reset = () => {
    // 重置下拉框
    form.setFieldsValue({
      types: []
    })
    setCheckList([])
  }

  const remove = (item) => {
    // console.log(item);
    const data = checkList.filter(param => param != item)
    // console.log(data);
    form.setFieldsValue({
      types: data
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
        <Form.Item name="types" label="分组设备" rules={[{ required: level===3, message: '请选择分组内的设备类型' }]}>
          <Select
            mode="multiple"
            placeholder="请选择分组内的设备类型"
            onChange={handleChange}
            allowClear
          >
            {
              _.map(optionList, (item) => {
                return (
                  <Select.Option value={item.name} key={item.name}>
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
                  <div className='check-card' key={item}>
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

