/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useEffect, useState, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Button, Input, message, Row, Modal, Table, Form, Space, Select } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
// import { getTaskInfoList, deleteTask } from '@/services/manage';
import { getBizStrategyList, removeBizStrategy, editBizStrategy, getBizStrategyInfo, addBizStrategy } from '@/services/sxxc/taskStrategy'
// import { Task, TaskType, ActionType } from '@/store/manageInterface';
import { Task, TaskType } from '@/store/sxxc/taskInterface';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import './index.less';
import './locale';

const { confirm } = Modal;

const Resource: React.FC = () => {
  const { t } = useTranslation('task');
  // const [visible, setVisible] = useState<boolean>(false);
  // const [task, setTask] = useState<TaskType>();
  // const [taskId, setTaskId] = useState<string>('');
  // const [typeList, setTypeList] = useState([] as any);
  // const [taskTypeName, setTaskTypeName] = useState<string>('');
  // const [subTypeList, setSubTypeList] = useState([] as any);
  // const [isEdit, setIsEdit] = useState(false)
  const [form] = Form.useForm();
  const [form1] = Form.useForm();
  // const { profile } = useContext(CommonStateContext);
  const { profile, permList } = useContext(CommonStateContext);
  const pagination = usePagination({ PAGESIZE_KEY: 'tasks' });
  const { TextArea } = Input;
  const [open, setOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [loading, setLoading] = useState<boolean>(true);
  const [initialValues, setInitialValues] = useState<any>();
  const [strategyId, setStrategyId] = useState<any>('')
  const taskColumn: ColumnsType<any> = [
    {
      title: '序号',
      render: (text, record, index) => `${index + 1}`,
    },
    {
      title: '策略名称',
      dataIndex: 'title',
    },
    {
      title: '策略地址',
      dataIndex: 'classPath',
    },
    {
      title: '策略描述',
      dataIndex: 'content',
    },
    {
      title: '添加时间',
      dataIndex: 'createTime',
    },
    // {
    //   title: '创建人',
    //   dataIndex: 'createBy',
    // },
  ];
  const taskColumns: ColumnsType<any> = [
    ...taskColumn,
    {
      title: '操作',
      render: (text: string, record) => (
        <>
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/strategyEdit')) && <Button className='oper-name' type='link' onClick={() => handleEdit(record.id)}>
              修改
            </Button>
          }

          {/* <Button className='oper-name' type='link' onClick={() => handleClick(TaskType.RunTask, record.id)}>
            执行
          </Button> */}
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/strategyRemove')) && <a
              style={{
                color: 'red',
                marginLeft: '16px',
              }}
              onClick={() => {
                confirm({
                  title: t('common:confirm.delete'),
                  onOk: () => {
                    removeBizStrategy(record.id).then((res) => {
                      message.success('删除成功');
                      handleClose();
                    });
                  },
                  onCancel: () => { },
                });
              }}
            >
              删除
            </a>
          }

        </>
      ),
    },
  ];

  // if (!profile.roles?.includes('Admin')) {
  //   // taskColumns.pop(); //普通用户不展示操作列
  // }

  // const handleClick = (type: TaskType, id?: string) => {
  //   if (id) {
  //     setTaskId(id);
  //   } else {
  //     setTaskId('');
  //   }

  //   setTask(type);
  //   setVisible(true);
  // };

  // 弹窗关闭回调
  const handleClose = () => {
    // setVisible(false);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const getTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      ...form.getFieldsValue(),
      // taskTypeName:taskTypeName,
      pageSize: pageSize,
      pageNum: current,
    };

    return getBizStrategyList({
      ...params,
    }).then((res) => {
      return {
        total: res.total,
        list: res.rows,
      };
    });
  };
  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [form, refreshFlag],
  });

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setRefreshFlag(_.uniqueId('refresh_flag'));
    } catch (e) {
      console.log(e);
    }
  };

  const handleReset = () => {
    form.resetFields()
    setRefreshFlag(_.uniqueId('refresh_flag'));
  }

  const handleAdd = () => {
    setOpen(true)
    // setIsEdit(false)
    form1.resetFields()
    setModalTitle('新增策略')
    setStrategyId('')
  }

  const handleEdit = (id: any) => {
    // setIsEdit(true)
    setStrategyId(id)
    setModalTitle('修改策略')
    getBizStrategyInfo(id).then(res => {
      form1.setFieldsValue({
        ...res.data
      })
    })
    setOpen(true)


  }

  const handleOk = async () => {
    const values = await form1.validateFields();
    // console.log(form1.getFieldsValue(true));
    console.log(values);
    if (strategyId) {
      // 编辑
      const params = {
        ...values,
        id: strategyId
      }
      editBizStrategy(params).then(res => {
        if (res.code == 200) {
          message.success('修改任务策略成功')
          setOpen(false)
          setRefreshFlag(_.uniqueId('refresh_flag'));
        } else {
          message.error(res.msg)
        }
      })
    } else {
      // 新增
      const params = values
      addBizStrategy(params).then(res => {
        if (res.code == 200) {
          message.success('新增任务策略成功')
          setOpen(false)
          setRefreshFlag(_.uniqueId('refresh_flag'));
        } else {
          message.error(res.msg)
        }
      })
    }
    // setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  // const getTaskType = ()=>{
  //   getTaskTypeList({}).then((res)=>{
  //     console.log('任务类型',res)
  //     setTypeList(res.rows)
  //   })
  // }

  // const getSubType = (val)=>{
  //   getTaskTypeList({parentId:val}).then((res)=>{
  //     console.log('任务子类',res)
  //     setSubTypeList(res.rows)
  //   })
  // }

  // const onChangeType = (val)=>{
  //   console.log(val)
  //   let name = typeList.filter(item=>item.id == val)[0].name
  //   setTaskTypeName(name)
  //   getSubType(val)
  // }

  // useEffect(() => {
  //   getTaskType()
  // }, []);

  return (
    <PageLayout title={'任务策略'} icon={<UserOutlined />}>
      <div className='task-manage-content'>
        <div className='task-content'>
          <Form form={form}>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'策略名称'} name='title'>
                <Input
                  allowClear
                  className='left-area-group-search'
                  placeholder='策略名称'
                  maxLength={20}
                  style={{ width: '200px' }}
                // onPressEnter={(e) => {
                //   e.preventDefault();
                //   const value = e.currentTarget.value;
                //   // getBusiGroups(value).then((res) => {
                //   //   setBusinessGroupData(res.dat || []);
                //   // });
                // }}
                />
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'策略地址'} name='classPath'>
                <Input
                  allowClear
                  className='left-area-group-search'
                  placeholder='策略地址'
                  style={{ width: '200px' }}
                // onPressEnter={(e) => {
                //   e.preventDefault();
                //   const value = e.currentTarget.value;
                //   // getBusiGroups(value).then((res) => {
                //   //   setBusinessGroupData(res.dat || []);
                //   // });
                // }}
                />
              </Form.Item>
            </Space>
            <Space>
              <Button type='primary' onClick={handleSubmit}
              >查询</Button>
              <Button style={{ marginLeft: '10px' }} onClick={handleReset}
              >重置</Button>
            </Space>

          </Form>
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/strategyAdd')) && <div style={{ textAlign: 'right' }}>
            <Button type='primary' onClick={handleAdd}>新增</Button>
          </div>
          }

          <Table
            size='small'
            rowKey='id'
            columns={taskColumns}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
          />
        </div>
        <Modal title={modalTitle} visible={open} destroyOnClose onOk={handleOk} onCancel={handleCancel}>
          <Form
            form={form1}
            labelCol={{ span: 4 }}
            autoComplete="off"
            initialValues={initialValues}
            preserve={false}
          >
            <Form.Item rules={[{ required: true }]} label="策略名称" name='title'>
              <Input />
            </Form.Item>
            <Form.Item rules={[{ required: true }]} label="策略地址" name='classPath'>
              <Input />
            </Form.Item>
            <Form.Item rules={[{ required: true }]} label="策略描述" name='content'>
              <TextArea />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default Resource;
