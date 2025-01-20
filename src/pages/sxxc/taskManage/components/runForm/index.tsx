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
import { Table, Form, Input, Select, Space, Switch, Button } from 'antd';
import { getBizScriptList, addBizScript, removeBizScript, editBizScript, getBizScriptInfo, runTask, getTaskLog, getTaskLogList, getTaskTypeList, getStrategyList,getBizScriptAssets } from '@/services/sxxc/taskManage'
import { TaskAndPasswordFormProps, Contacts, ContactsItem, Task,Serve } from '@/store/sxxc/taskInterface';
import { MinusCircleOutlined, PlusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useAntdTable } from 'ahooks';
import usePagination from '@/components/usePagination';
import { getBusiGroups } from '@/services/common';
import { getMonObjectList } from '@/services/targets';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import Item from 'antd/lib/list/Item';
// import { Link, Switch } from 'react-router-dom';

const { Option } = Select;
const TaskForm = React.forwardRef<ReactNode, TaskAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation();
  const { taskId } = props;
  const [form] = Form.useForm();
  const [initialValues, setInitialValues] = useState<Task>();
  const [loading, setLoading] = useState<boolean>(true);
  const [busiGroups,setBusiGroups ] = useState([] as any);
  const [serveList,setServeList] = useState([] as any);
  const [projectNameList,setProjectNameList] = useState([] as any);
  const [projectCodes,setProjectCodes] = useState([] as any);
  const pagination = usePagination({ PAGESIZE_KEY: 'tasks' });

  useImperativeHandle(ref, () => ({
    serveList: serveList,
    initialValues:initialValues,
    projectNameList:projectNameList,
    projectCodes: projectCodes
  }));

  const taskColumn: ColumnsType<Serve> = [
    {
      title: '选择',
      render: (text: string, record) => (
        <>
          <Switch onChange={(val)=>{
            console.log(record);
            
            // console.log(record.ident)
            if(val){
              // serveList.push(record.ident)
              serveList.push(record.ip)
              setServeList(serveList)

              projectNameList.push(record.groupName)
              setProjectNameList(projectNameList)

              projectCodes.push(record.groupId)
              setProjectCodes(projectCodes)
            }else{
              // console.log(111, record);
              
              // for(let i = 0;i<serveList.length;i++){
              //   if(serveList[i] == record.ident){
              //     serveList.splice(i,1)
              //     return
              //   }
              // }
              // console.log(serveList)
              // setServeList(serveList)
              for(let i = 0;i<serveList.length;i++){
                if(serveList[i] == record.ip){
                  serveList.splice(i,1)
                  break
                }
              }
              setServeList(serveList)
              
              for(let i = 0;i<projectCodes.length;i++){
                if(projectCodes[i] == record.groupId){
                  projectCodes.splice(i,1)
                  break
                }
              }
              // console.log('gg', projectCodes);
            
              setProjectCodes(projectCodes)


              for(let i = 0;i<projectNameList.length;i++){
                if(projectNameList[i] == record.groupName){
                  projectNameList.splice(i,1)
                  break
                }
              }
              setProjectNameList(projectNameList)
            }
          }}
          ></Switch>
        </>
      )
    },
    {
      title: '序号',
      render:(text,record,index)=>`${index+1}`,
    },
    // {
    //   title: '项目名',
    //   dataIndex: 'ident',
    // },
    // {
    //   title: 'IP',
    //   dataIndex: 'remote_addr',
    // },

    {
      title: '项目名',
      dataIndex: 'groupId',
      render(value, record, index) {
        if (value > 0) {
          let groupName = '';
          busiGroups.forEach((group) => {
            if (group.id === value) {
              groupName = group.name;
            }
          });
          return groupName;
        }
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
    }
  ];
  
  useEffect(() => {
    if (taskId) {
      getTaskInfoDetail(taskId);
    } else {
      setLoading(false);
    }
    getGroup()
  }, []);

  const getGroup = ()=>{
    getBusiGroups('').then((res) => {
      setBusiGroups(res.dat || []);
    });
  }

  const getTaskInfoDetail = (id: string) => {
    getBizScriptInfo(id).then((res) => {
      console.log(res.data)
      setInitialValues(
        Object.assign({}, res.data),
      );
      setLoading(false);
    });
  };
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const getTableData = ({ current, pageSize }): Promise<any> => {
    // const params = {
    //   ...form.getFieldsValue(),
    //   limit: pageSize,
    //   p: current,
    // };

    // return getMonObjectList({
    //   ...params,
    // }).then((res) => {
    //   return {
    //     total: res.dat.total,
    //     list: res.dat.list,
    //   };
    // });
    const params = {
      ...form.getFieldsValue(),
      pageSize: pageSize,
      pageNum: current,
      groupIds: localStorage.getItem('groupIds')
    };

    return getBizScriptAssets({
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
    refreshDeps: [form,refreshFlag],
  });

  return !loading ? (
    <div>
      <Form layout='inline' form={form} initialValues={initialValues} preserve={false} style={{marginBottom: '10px'}}>
      {/* <Form.Item label={'项目名称：'} name='bgid'>
          <Select allowClear placeholder={'项目名称'} style={{ width: 200 }} onClick={()=>run({current:1, pageSize:pagination.pageSize})}>
            {_.map(busiGroups, (item) => {
              return (
                <Select.Option key={item.name} value={item.id}>
                  {item.name}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item label={'IP地址：'} name='query'>
          <Input 
            placeholder='单行输入'
            max={15}
          />
        </Form.Item> */}

        <Form.Item label={'项目名称：'} name='groupId'>
          <Select allowClear placeholder={'项目名称'} style={{ width: 200 }} onChange={()=>run({current:1, pageSize:pagination.pageSize})}>
            {_.map(busiGroups, (item) => {
              return (
                <Select.Option key={item.name} value={item.id}>
                  {item.name}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item label={'IP地址：'} name='ip'>
          <Input 
            placeholder='单行输入'
            max={15}
            allowClear
          />
        </Form.Item>
        <Form.Item>
          <Button onClick={()=>run({current:1, pageSize:pagination.pageSize})}>查询</Button>
        </Form.Item>
      </Form>
      <Table
        size='small'
        rowKey='id'
        columns={taskColumn}
        {...tableProps}
        pagination={{
          ...tableProps.pagination,
          ...pagination,
        }}
      >
      </Table>
    </div>
  ) : null;
});
export default TaskForm;
