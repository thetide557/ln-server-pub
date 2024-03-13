import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row, Card, Checkbox, Form, Select, Radio, Upload } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import Icon, { CheckCircleOutlined, SyncOutlined, GroupOutlined, SearchOutlined, DoubleLeftOutlined } from '@ant-design/icons';
const { confirm } = Modal;
import { SetConfigTables, SetConfigForms } from './catalog'
import { CommonStateContext } from '@/App';
import CommonModal from '@/components/CustomForm/CommonModal';
import './style.less';
import _ from 'lodash';
import { Link, useHistory } from 'react-router-dom';


interface DataType {
  key: React.ReactNode;
  name: string;
  age: number;
  address: string;
  children?: DataType[];
}

export default function () {
  const commonState = useContext(CommonStateContext);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const history = useHistory();
  const [fileName, setFileName] = useState<string>();
  const [fileList, setFileList] = useState<any>([]);

 

  useEffect(() => {
  }, []);

  const renderFields = (text, record, field, currentConfigId) => {
    console.log("渲染数据列", text, record, field, currentConfigId);
    let value = record[field];
    return value;
  }

  const formSubmit = (param, businessForm) => {
    

  }

  const handleClick = (action: string, record?: any) => {}
  const props = {
    showUploadList: false,
    onRemove: file => {
        setFileList([])
    },
    beforeUpload: file => {
      // console.log(file)
      let { name } = file;
      var fileExtension = name.substring(name.lastIndexOf('.') + 1);//截取文件后缀名
      setFileName(name);
      let newList = new Array();
      newList.push(file)
      fileList.concat(...newList);
      setFileList(newList)
      return false;
    },
    fileList,
  };

  return (
    <PageLayout icon={<GroupOutlined />} title={'系统升级'}>
      <div className='system_upgrade' >
        <Card
          hoverable
          title='新版本发布'
          className='notice_set'
        >
          <Form
            name="basic"
            labelCol={{ span: 10 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 890 }}
            initialValues={{ remember: true }}
            className='system_upgrade_form'
            // onFinish={onFinish}
            // onFinishFailed={onFinishFailed}
            autoComplete="off"
          >
           <Form.Item
              name="install_page"
              label="选择安装包"
              rules={[{required:true,message:'选择安装包'}]}
              className='choose_file'
            >
             <Input></Input>
              <Upload {...props}>
                <Button type="primary">
                  <Icon type="upload" />浏览
                </Button>
              </Upload>
            </Form.Item>

            <Form.Item
               label="选择节点"
               name="node"
               rules={[{required:true,message:'选择选择节点'}]}
            >
             
              
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 12, span: 16 }} className='submit_button'>
              <Space >
                <Button >
                  升级
                </Button>
               
              </Space>
            </Form.Item>
          </Form>

        </Card>
       
       
      </div>
    </PageLayout>
  );
}
