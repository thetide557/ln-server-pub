import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Select, Tag, Tooltip, Tree, message } from 'antd';
import { getOrganizationTree } from '@/services/assets';
import CommonForm from './CommonForm';
export enum OperateType {
  ChangeOrganize = 'changeOrganize',
  FormEdit ="formEdit",
  None = 'none',
}
export const OperationModal = ({ operateType, setOperateType,initData,handlerClick,name }) => {


  const [form] = Form.useForm();
  const [info, setInfo] = useState(null);
  const [treeData, setTreeData] = useState();

  const onSelect = (selectedKeys: React.Key[], info) => {
      console.log("selectedKeys",selectedKeys);
      if(info.node.type=="asset"){
        setInfo(info.node);
      }else{
        setInfo(null);
      }
      
  };
  
  
  const formEdit = () => {
    return (
      <div>
          <CommonForm ></CommonForm>
      </div>
    )
  };

  const changeOrganizeDetail = () => {
    return {
      operateTitle: '选择存储',
      isFormItem: true,
      render() {
        return (
          <Form.Item rules={[{ required: true, message: '请选择'}]}>
            <Tree
              showLine={true}
              showIcon={true}
              style={{marginTop:0}} 
              defaultExpandAll={false}
              fieldNames={{ key: 'id', title: 'name' }}
              onSelect={onSelect}
              treeData={treeData}
            />
          </Form.Item>
        );
      },
    };
  };


  const onChange = (value: string) => {
    // setTypeId(value)
  };


  const operateDetail = {
    changeOrganizeDetail,
    noneDetail: () => ({
      operateTitle: '',
      requestFunc() {
        return Promise.resolve();
      },
      isFormItem: true,
      render() { },
    }),
  };
  const { operateTitle, isFormItem, render } = operateDetail[`${operateType}Detail`]();



  // 提交表单
  function submitForm() {
    if(info!=null) {
      handlerClick(info,"")
      setOperateType(OperateType.None);
    }else{
      message.error("请选择有效数据")
    };
  }

  // 点击批量操作时，初始化默认监控对象列表
  useEffect(() => { 
      if(operateType!='none' && initData!=undefined){          
          setTreeData(initData)
      }
  }, [operateType]);

  return (
    <Modal
      visible={operateType !== 'none'}
      title={operateTitle}
      okButtonProps={{

      }}
      okText={'确定'}
      onOk={submitForm}
      onCancel={() => {
        setOperateType(OperateType.None);
      }}
    >
      {/* 基础展示表单项 */}



      <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        {isFormItem && render()}
      </Form>
      {!isFormItem && render()}
    </Modal>
  );
};
