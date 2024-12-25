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
import React, { useRef, useState } from 'react';
import { Modal, message, Button } from 'antd';
import _ from 'lodash';
import TaskForm from '../taskForm';
import RunForm from '../runForm';
import { getBizScriptList, addBizScript, removeBizScript, editBizScript, getBizScriptInfo, runTask, getTaskLog, getTaskLogList, getTaskTypeList } from '@/services/sxxc/taskManage'
import { ModalProps, Task, Team, TaskType, Contacts } from '@/store/sxxc/taskInterface';
import { useTranslation } from 'react-i18next';

const CreateModal: React.FC<ModalProps> = (props: ModalProps) => {
  const { t } = useTranslation('task');
  const { visible, onClose, task, taskId, width } = props;
  const taskRef = useRef(null as any);
  const isTaskForm: boolean = (task === TaskType.CreateTask || task === TaskType.EditTask) ? true : false;
  const isRunForm: boolean = task === TaskType.RunTask ? true : false;

  const onOk = async (val?: string) => {
    if (isTaskForm) {
      let form = taskRef.current.form;
      const values = await form.validateFields();
      if(values.taskTypeId){
        console.log('--->values',(values))
        delete values.taskParentId
      }else {
        values.taskTypeId = values.taskParentId
        delete values.taskParentId
      }
      let params = { ...values,status:'0' };
      console.log('新增任务',(params))

      if (task === TaskType.CreateTask) {
        addBizScript(params).then((res) => {
          console.log("新增结果",res.code)
          if(res.code===200){
            message.success('新增成功');
            onClose(true);
          }else{
            message.error(res.msg)
          }
          
        });
      }

      if (task === TaskType.EditTask && taskId) {
        editBizScript({...params,id:taskId}).then((res) => {
          if (res.code == 200) {
            message.success('修改成功');
            onClose(true);
          } else {
            message.error(res.msg)
          }
        });
      }

    }
    if (isRunForm){
      if (task === TaskType.RunTask && taskId) {
        let value = taskRef.current.serveList;
        let projectNameArr = taskRef.current.projectNameList;
        let params = taskRef.current.initialValues;
        console.log('IP列表',(value),params)
        // 执行任务run接口增加 projectNames参数，勾选的项目名称数组
        runTask({...params,hosts:value,projectNames:projectNameArr}).then((res) => {
          console.log((res))
          if(res.code == 200){
            message.success('执行成功');
            onClose(true);
          }else{
            message.error(res.msg)
            onClose(true);
          }
        });
      }
    }
  };

  const taskLabel = () => {
    if (task === TaskType.CreateTask) {
      return '新建任务';
    }
    if (task === TaskType.EditTask) {
      return '修改任务';
    }
    if (task === TaskType.RunTask) {
      return '执行任务';
    }
  };

  return (
    <Modal
      title={taskLabel()}
      visible={visible}
      width={width ? width : 1200}
      onCancel={onClose}
      destroyOnClose={true}
      footer={[
        <Button key='back' onClick={onClose}>
          取消
        </Button>,
        <Button key='submit' type='primary' onClick={() => onOk()}>
          {isRunForm?'执行':'确定'}
        </Button>,
      ]}
    >
      {isTaskForm && <TaskForm ref={taskRef} taskId={taskId} />}
      {isRunForm && <RunForm ref={taskRef} taskId={taskId} />}
    </Modal>
  );
};

export default CreateModal;
