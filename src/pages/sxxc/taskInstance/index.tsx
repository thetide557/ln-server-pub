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
// @ts-nocheck
import React, { useEffect, useState, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { useParams, useHistory } from 'react-router-dom';
import type { DatePickerProps } from 'antd';
import { Button, Input, message, Row, Modal, Table, Form, Space, Select, DatePicker } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
import { getBizScriptList, addBizScript, removeBizScript, editBizScript, getBizScriptInfo, runTask, getTaskLog, getTaskLogList, getTaskTypeList, getStrategyList, getTaskLogInfo } from '@/services/sxxc/taskManage'
import { Log } from '@/store/sxxc/taskInterface';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import './index.less';
// import './locale';

interface Param {
  inspectionLogId: string;
}

const { confirm } = Modal;

const Resource: React.FC = () => {
  const { inspectionLogId } = useParams<Param>();
  const { t } = useTranslation('task');
  const [visible, setVisible] = useState<boolean>(false);
  const [stdout, setStdout] = useState<string>('');
  const [typeList, setTypeList] = useState([] as any);
  const [taskType, setTaskType] = useState<string>();
  const [subTypeList, setSubTypeList] = useState([] as any);
  const [subType, setSubType] = useState<string>();
  const [strategyList, setStrategyList] = useState([] as any);
  const [createTime, setCreateTime] = useState<string>();
  const [resultList, setResultList] = useState(['success', 'waiting', 'running', 'timeout','todo','failed']);
  const [form] = Form.useForm();
  const { profile, permList, busiGroups } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map(item => item.id)
  const pagination = usePagination({ PAGESIZE_KEY: 'tasks' });
  const taskColumn: ColumnsType<Log> = [
    {
      title: '序号',
      render: (text, record, index) => `${index + 1}`,
    },
    {
      title: '任务名称',
      dataIndex: 'taskName',
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
    },
    {
      title: '任务子类',
      dataIndex: 'taskSubType',
    },
    {
      title: '策略名称',
      dataIndex: 'strategyName',
    },
    {
      title: '巡检计划',
      dataIndex: 'inspectionLogName',
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
    },
    {
      title: '执行时间',
      dataIndex: 'createTime',
    },
    {
      title: '执行IP',
      dataIndex: 'host',
    },
    {
      title: '结果',
      dataIndex: 'taskReslut',
    },
  ];
  const taskColumns: ColumnsType<Log> = [
    ...taskColumn,
    {
      title: '操作',
      render: (text: string, record) => (
        <>
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/taskInstanceRun')) && <a
              onClick={() => {
                confirm({
                  title: '是否重新执行',
                  content: `${record?.host}将执行任务${record.taskName}`,
                  onOk: () => {
                    console.log(record)
                    getBizScriptInfo(record.scriptId).then(res => {
                      console.log(res)
                      if (res.code == 200) {
                        let params = {
                          id: record.scriptId,
                          title: record.taskName,
                          content: res.data.content,
                          hosts: [`${record.host}`],
                          strategyName: record.strategyName,
                          taskTypeName: record.taskType,
                          taskSubName: record.taskSubType,
                          projectName: record.projectName,
                          projectNames:[record.projectName] ,
                          
                        }
                        // 执行任务run接口增加 projectNames参数，项目名称数组
                        runTask(params).then((res1) => {
                          if (res1.code == 200) {
                            message.success('执行成功');
                            handleClose();
                          } else {
                            message.error(res1.msg);
                            handleClose();
                          }
                        });
                      } else {
                        message.error(res.msg);
                        handleClose();
                      }
                    })
                  },
                  onCancel: () => { },
                });
              }}
            >
              执行
            </a>
          }
          {
            (profile.roles?.includes('Admin') || permList.includes('/taskManage/taskInstanceLog')) && <Button className='oper-name' type='link' onClick={() => getLog(record)}>
              日志
            </Button>
          }

        </>
      ),
    },
  ];

  if (!profile.roles?.includes('Admin')) {
    // taskColumns.pop(); //普通用户不展示操作列
  }

  const getLog = (item) => {
    console.log(item)
    if (item.taskReslut == 'success') {
      setStdout(item.stdout)
    } else {
      setStdout(item.stderr)
    }
    setVisible(true)
    // let params = {
    //   host:item.host,
    //   excuteId:item.excuteId,
    //   id:item.id
    // }
    // getTaskLog(params).then(res=>{
    //   console.log(res)
    //   setStdout(res.stdout)
    //   setVisible(true)
    // })
  }

  // 弹窗关闭回调
  const handleClose = () => {
    setVisible(false);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const getTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      ...form.getFieldsValue(),
      taskType: taskType != '' ? taskType : undefined,
      taskSubType: subType != '' ? subType : undefined,
      executeDate: createTime != '' ? createTime : undefined,
      inspectionLogId: inspectionLogId ? inspectionLogId : undefined,
      pageSize: pageSize,
      pageNum: current,
      // groupIds: groupIds?.toString()
    };

    return getTaskLogList({
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

  const getStrategy = () => {
    getStrategyList({}).then((res) => {
      console.log('策略', res)
      setStrategyList(res.rows)
    })
  }

  const onChangeType = (val) => {
    console.log(val)
    let name = typeList.filter(item => item.id == val)[0]?.name
    setTaskType(name)
    setSubType(undefined)
    getSubType(val)
  }

  const clearType = () => {
    setTaskType(undefined)
  }

  const onChangeSubType = (val) => {
    console.log(val)
    setSubType(val)
  }

  const onChangeDate: DatePickerProps['onChange'] = (date, dateString) => {
    console.log(dateString);
    setCreateTime(dateString)
  };

  useEffect(() => {
    getTaskType()
    getStrategy()
  }, []);

  return (
    <PageLayout title={'任务实例'} icon={<UserOutlined />} showBack>
      <div className='task-manage-content'>
        <div className='task-content'>
          <Form form={form}>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'任务名称'} name='taskName' rules={[{ max: 20, message: '20个字不能重复' }]}>
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
              <Form.Item label={'策略名称：'} name='strategyName'>
                <Select allowClear placeholder={'任务子类'} style={{ width: 200 }}>
                  {_.map(strategyList, (item) => {
                    return (
                      <Select.Option key={item.title} value={item.title}>
                        {item.title}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'任务类型'}>
                <Select allowClear placeholder={'任务类型'} style={{ width: 200 }} value={taskType} onChange={onChangeType} onClear={clearType}>
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
              <Form.Item label={'任务子类'}>
                <Select allowClear placeholder={'任务子类'} style={{ width: 200 }} value={subType} onChange={onChangeSubType}>
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
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'结果'} name='taskReslut'>
                <Select allowClear placeholder={'结果'} style={{ width: 200 }}>
                  {_.map(resultList, (item) => {
                    return (
                      <Select.Option key={item} value={item}>
                        {item}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Space>
            <Space style={{ marginRight: 16 }}>
              <Form.Item label={'巡检计划'} name='inspectionLogName' rules={[{ max: 20, message: '20个字不能重复' }]}>
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
              <Form.Item label={'执行日期'}>
                <DatePicker onChange={onChangeDate} />
              </Form.Item>
            </Space>
            <Space>
              <Button onClick={handleSubmit}
              >查询</Button>
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
        <Modal
          title={'任务日志'}
          visible={visible}
          width={800}
          onCancel={handleClose}
          destroyOnClose={true}
          footer={[
            <Button key='back' onClick={handleClose}>
              关闭
            </Button>,
          ]}
        >
          <pre style={{ fontSize: 12, padding: 10 }}>
            {stdout}
          </pre>
        </Modal>

      </div>
    </PageLayout>
  );
};

export default Resource;
