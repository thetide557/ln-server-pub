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
import React, { useEffect, useState, useImperativeHandle, ReactNode, useContext } from 'react';
import { Form, Input, Select, Space, Switch } from 'antd';
// import { getTaskInfo, getNotifyChannels, getRoles } from '@/services/manage';
import { getBizScriptList, addBizScript, removeBizScript, editBizScript, getBizScriptInfo, runTask, getTaskLog, getTaskLogList, getTaskTypeList, getStrategyList } from '@/services/sxxc/taskManage'
import { TaskAndPasswordFormProps, Contacts, ContactsItem, Task } from '@/store/sxxc/taskInterface';
import { MinusCircleOutlined, PlusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
// import { Link, Switch } from 'react-router-dom';

const { Option } = Select;
const TaskForm = React.forwardRef<ReactNode, TaskAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation();
  const { taskId } = props;
  const [form] = Form.useForm();
  const [initialValues, setInitialValues] = useState<Task>();
  const [loading, setLoading] = useState<boolean>(true);
  const [strategy, setStrategy] = useState<boolean>(false)
  const { TextArea } = Input;
  const [typeList, setTypeList] = useState([] as any);
  const [subTypeList, setSubTypeList] = useState([] as any);
  const [strategyList, setStrategyList] = useState([] as any);
  const { busiGroups } = useContext(CommonStateContext);
  const [sysList, setSysList] = useState(
    [
      { id: 0, value: 'linux' },
      { id: 1, value: 'windows' },
    ]
  )


  const getTaskType = () => {
    getTaskTypeList({ parentId: 0 }).then((res) => {
      console.log('任务类型', res)
      setTypeList(res.rows)
    })
  }

  const onChangeType = (val) => {
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

  useImperativeHandle(ref, () => ({
    form: form,
  }));

  useEffect(() => {
    if (taskId) {
      getTaskInfoDetail(taskId);
    } else {
      setLoading(false);
      getTaskType()
      getStrategy()
    }
  }, []);


  const onChange = (checked: boolean) => {
    setStrategy(() => checked)
  };


  const getTaskInfoDetail = (id: string) => {
    getBizScriptInfo(id).then((res) => {
      console.log(res.data)
      res.data.groupId = Number(res.data.groupId)
      if (!res.data.taskSubName) {
        res.data.taskParentId = res.data.taskTypeId
        res.data.taskTypeId = null
      }
      setInitialValues(
        Object.assign({}, res.data),
      );
      getTaskType()
      onChangeType(res.data.taskParentId)
      getStrategy()
      if (res.data.strategyId) {
        setStrategy(() => true)
      }
      setLoading(false);
    });
  };

  return !loading ? (
    <Form layout='vertical' form={form} initialValues={initialValues} preserve={false}>
      <Form.Item label={'任务名称：'} name='title' rules={[{ required: true, message: '请输入任务名称' },{max:20,message:'20字不能重复'}]}>
        <Input
          placeholder='20字不能重复'
          maxLength={20}
        />
      </Form.Item>
      {/* <Form.Item label={'业务组： '} name='groupId' rules={[{ required: true, message: '请选择业务组' }]}>
        <Select allowClear placeholder={'业务组'} style={{ width: 200 }}>
          {_.map(busiGroups, (item) => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item> */}
      <Form.Item label={'任务执行的系统：'} name='os' rules={[{ required: true, message: '请选择任务执行的系统' }]}>
        <Select allowClear placeholder={'任务执行的系统'} style={{ width: 200 }}>
          {_.map(sysList, (item) => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.value}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label={'任务类型：'} name='taskParentId' rules={[{ required: true, message: '请选择任务类型' }]}>
        <Select allowClear placeholder={'任务类型'} style={{ width: 200 }} onChange={onChangeType}>
          {_.map(typeList, (item) => {
            return (
              <Select.Option key={item.name} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label={'任务子类：'} name='taskTypeId'>
        <Select allowClear placeholder={'任务子类'} style={{ width: 200 }}>
          {_.map(subTypeList, (item) => {
            return (
              <Select.Option key={item.name} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>
      {/* <Form.Item label={'需要分析：'}>
        <Switch checked={strategy} onChange={onChange}></Switch>
      </Form.Item>
      {strategy && (
        <>
          <Form.Item label={'分析策略：'} name='strategyId'>
            <Select allowClear placeholder={'任务子类'} style={{ width: 200 }}>
              {_.map(strategyList, (item) => {
                return (
                  <Select.Option key={item.title} value={item.id}>
                    {item.title}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </>
      )} */}
      <Form.Item label={'备注：'} name='remark'>
        <TextArea showCount rows={4} placeholder="100字" maxLength={100} />
      </Form.Item>
      <Form.Item label={'任务脚本：'} name='content' rules={[{ required: true, message: '请输入任务脚本' }]}>
        <TextArea showCount rows={10} placeholder="1000字" maxLength={1000} />
      </Form.Item>
    </Form>
  ) : null;
});
export default TaskForm;
