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
import TaskInfoModal from './components/createModal';
// import { getTaskInfoList, deleteTask } from '@/services/manage';
import { getBizScriptList, addBizScript, removeBizScript, editBizScript, getBizScriptInfo, runTask, getTaskLog, getTaskLogList, getTaskTypeList } from '@/services/sxxc/taskManage'
// import { Task, TaskType, ActionType } from '@/store/manageInterface';
import { Task, TaskType } from '@/store/sxxc/taskInterface';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import './index.less';
import './locale';

const { confirm } = Modal;

const Resource: React.FC = () => {
  const { t } = useTranslation('task');
  const [visible, setVisible] = useState<boolean>(false);
  const [task, setTask] = useState<TaskType>();
  const [taskId, setTaskId] = useState<string>('');
  const [typeList, setTypeList] = useState([] as any);
  const [taskTypeName, setTaskTypeName] = useState<string>('');
  const [subTypeList, setSubTypeList] = useState([] as any);
  const [form] = Form.useForm();
  const { profile, permList, busiGroups } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map(item => item.id)
  const pagination = usePagination({ PAGESIZE_KEY: 'tasks' });
  const [sysList, setSysList] = useState(
    [
      {id: 0, value: 'linux'},
      {id: 1, value: 'windows'},
    ]
  )
  const taskColumn: ColumnsType<Task> = [
    {
      title: '序号',
      render: (text, record, index) => `${index + 1}`,
    },
    {
      title: '任务名称',
      dataIndex: 'title',
    }, 
    {
      title: '任务执行系统',
      dataIndex: 'os',
      render: (text, record, index) => sysList.filter(item => item.id == text)[0]?.value
    },
    {
      title: '任务类型',
      dataIndex: 'taskTypeName',
    },
    {
      title: '任务子类',
      dataIndex: 'taskSubName',
    },
    {
      title: '策略名称',
      dataIndex: 'strategyName',
    },
    {
      title: '时间',
      dataIndex: 'createTime',
    },
    {
      title: '创建人',
      dataIndex: 'createBy',
    },
  ];
  const taskColumns: ColumnsType<Task> = [
    ...taskColumn,
    {
      title: t('common:table.operations'),
      width: '240px',
      render: (text: string, record) => (
        <>
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/taskManageEdit')) && <Button className='oper-name' type='link' onClick={() => handleClick(TaskType.EditTask, record.id)}>
              修改
            </Button>
          }
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/run')) && <Button className='oper-name' type='link' onClick={() => handleClick(TaskType.RunTask, record.id)}>
              执行
            </Button>
          }
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/taskManageRemove')) && <a
              style={{
                color: 'red',
                marginLeft: '16px',
              }}
              onClick={() => {
                confirm({
                  title: '删除',
                  onOk: () => {
                    removeBizScript(record.id).then((res) => {
                      if (res.code) {
                        message.success('删除成功');
                      } else {
                        message.error(res.msg);
                      }
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
  // console.log(profile);
  // console.log('per', permList);


  if (!profile.roles?.includes('Admin')) {
    // taskColumns.pop(); //普通用户不展示操作列
  }

  const handleClick = (type: TaskType, id?: string) => {
    if (id) {
      setTaskId(id);
    } else {
      setTaskId('');
    }

    setTask(type);
    setVisible(true);
  };

  // 弹窗关闭回调
  const handleClose = () => {
    setVisible(false);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const getTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      ...form.getFieldsValue(),
      taskTypeName: taskTypeName,
      pageSize: pageSize,
      pageNum: current,
      // groupIds: groupIds?.toString()
    };

    return getBizScriptList({
      ...params,
    }).then((res) => {
      return {
        total: res.total,
        list: res.rows,
      };
    });
  };
  const { tableProps, run } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [form, refreshFlag],
  });

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      run({ current: 1, pageSize: pagination.pageSize });
    } catch (e) {
      console.log(e);
    }
  };

  const getTaskType = () => {
    getTaskTypeList({ parentId: 0 }).then((res) => {
      console.log('任务类型', res)
      setTypeList(res.rows)
    })
  }

  const getSubType = (val) => {
    getTaskTypeList({ parentId: val }).then((res) => {
      console.log('任务子类', res)
      setSubTypeList(res.rows)
    })
  }

  const onChangeType = (val) => {
    console.log(val) 
      let name = typeList.filter(item => item.id == val)[0]?.name
      setTaskTypeName(name)
      getSubType(val)
    }

  useEffect(() => {
    getTaskType()
  }, []);

  return (
    <PageLayout title={'任务管理'} icon={<UserOutlined />}>
      <div className='task-manage-content'>
        <div className='task-content'>
          <Form form={form}>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'任务名称'} name='title' rules={[{ max: 20, message: '20个字不能重复' }]}>
                <Input
                  className='left-area-group-search'
                  placeholder='20个字不能重复'
                  maxLength={20}
                  style={{ width: '270px' }}
                  onPressEnter={(e) => {
                    e.preventDefault();
                    const value = e.currentTarget.value;
                    // getBusiGroups(value).then((res) => {
                    //   setBusinessGroupData(res.dat || []);
                    // });
                  }}
                />
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'策略名称'} name='strategyName' rules={[{ max: 20, message: '20个字不能重复' }]}>
                <Input
                  className='left-area-group-search'
                  placeholder='20个字不能重复'
                  maxLength={20}
                  style={{ width: '270px' }}
                  onPressEnter={(e) => {
                    e.preventDefault();
                    const value = e.currentTarget.value;
                    // getBusiGroups(value).then((res) => {
                    //   setBusinessGroupData(res.dat || []);
                    // });
                  }}
                />
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'任务类型'} >
                <Select allowClear placeholder={'任务类型'} style={{ width: 200 }} onChange={onChangeType} onClear={()=>{form.setFieldsValue({ taskSubName: undefined })}}>
                  {_.map(typeList, (item) => {
                    return (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'任务子类'} name='taskSubName'>
                <Select allowClear placeholder={'任务子类'} style={{ width: 200 }}>
                  {_.map(subTypeList, (item) => {
                    return (
                      <Select.Option key={item.id} value={item.name}>
                        {item.name}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Space>
            <Space>
              <Button style={{ marginRight: '16px' }} onClick={handleSubmit}
              >查询</Button>
            </Space>
            <Space>
              {
                (profile.roles?.includes('Admin') || permList.includes('/taskManage/taskManageAdd')) && <Button type='primary' onClick={() => handleClick(TaskType.CreateTask)}>新增</Button>
              }
            </Space>
          </Form>
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
        <TaskInfoModal
          visible={visible}
          task={task as TaskType}
          width={800}
          onClose={handleClose}
          taskId={taskId}
        />
      </div>
    </PageLayout>
  );
};

export default Resource;
