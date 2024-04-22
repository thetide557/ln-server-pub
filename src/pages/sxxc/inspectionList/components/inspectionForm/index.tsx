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
import { Inspection, InspectionFormProps } from '@/store/sxxc/inspection';
import { Form, Input, Select, Switch, Checkbox, DatePicker, TimePicker, Table } from 'antd';
import type { DatePickerProps } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import _ from 'lodash';
import React, { ReactNode, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBusiGroups } from '@/services/common';
import { getMonObjectList } from '@/services/targets';
import { Task, TaskType } from '@/store/sxxc/taskInterface';
import { ColumnsType } from 'antd/lib/table';
import usePagination from '@/components/usePagination';
import { useAntdTable } from 'ahooks';
import moment from 'moment';
import { getBizScriptList, getTaskTypeList } from '@/services/sxxc/taskManage'
import { getInspectionList, getInspectionDetail } from '@/services/sxxc/inspection'
// import { Link, Switch } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
const dateFormat = 'YYYY-MM-DD';
const timeFormat = 'HH:mm:ss'
const { Option } = Select;
const InspectionForm = React.forwardRef<ReactNode, InspectionFormProps>((props, ref) => {
    const { t } = useTranslation();
    const { inspectionId } = props;
    const [form] = Form.useForm();
    const [taskForm] = Form.useForm()
    const [initialValues, setInitialValues] = useState<Inspection>();
    const [loading, setLoading] = useState<boolean>(true);
    const [strategy, setStrategy] = useState<boolean>(false);
    const { TextArea } = Input;
    const [subTypeList, setSubTypeList] = useState([] as any);
    const [strategyList, setStrategyList] = useState([] as any);
    const [type, setType] = useState<any>('')
    const [typeList, Task] = useState([
        { id: 1, value: '每日' },
        { id: 2, value: '每周' },
        { id: 3, value: '指定时间' },
    ]);
    const weekOption = [
        { label: '周一', value: 2 },
        { label: '周二', value: 3 },
        { label: '周三', value: 4 },
        { label: '周四', value: 5 },
        { label: '周五', value: 6 },
        { label: '周六', value: 7 },
        { label: '周日', value: 1 },
    ]

    const [scopeList, setScopeList] = useState([
        { id: 1, value: '所有服务器' },
        { id: 2, value: '指定项目' },
        { id: 3, value: '指定IP' },
    ]);
    const [scope, setScope] = useState(Number)
    const [serveList, setServeList] = useState([] as any)
    const [ipList, setIpList] = useState([] as any)

    const [taskType, setTaskType] = useState<string>();
    const [taskSubType, setTaskSubType] = useState<string>();
    const [taskTypeList, setTaskTypeList] = useState([] as any);
    const [taskSubTypeList, setTaskSubTypeList] = useState([] as any);
    const [excuteTime,setExcuteTime] = useState<Dayjs | null>(null);

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const pagination = usePagination({ PAGESIZE_KEY: 'tasks' });
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

    useImperativeHandle(ref, () => ({
        form: form,
        ipList:ipList,
        selectedRowKeys: selectedRowKeys
    }));

    useEffect(() => {
        getBusiGroup()
        getTaskType()
        run({ current: 1, pageSize: pagination.pageSize });
        if (inspectionId) {
            getInspectionInfo(inspectionId);
        } else {
            setLoading(false);
        }
    }, []);
    const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
    const getTableData = ({ current, pageSize }): Promise<any> => {
        const params = {
            ...taskForm.getFieldsValue(),
            taskTypeName: taskType,
            taskSubName: taskSubType,
            pageSize: pageSize,
            pageNum: current,
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
        refreshDeps: [taskForm, refreshFlag, taskType, taskSubType],
    });

    const getBusiGroup = () => {
        getBusiGroups('').then((res) => {
            console.log('--->busi', res)
            setServeList(res.dat || []);
        });
        const query = {
            query: '',
            bgid: '-1',
            limit: 5000,
            p: 1,
        };
        getMonObjectList(query).then(res => {
            let list = res.dat.list
            setIpList(list)
        })
    }

    const getTaskType = () => {
        getTaskTypeList({parentId:0}).then((res) => {
            console.log('任务类型', res)
            setTaskTypeList(res.rows)
        })
    }

    const onChangeTaskType = (val) => {
        let name = taskTypeList.filter(item => item.id == val)[0].name
        setTaskType(name)
        setTaskSubType(undefined)
        getTaskTypeList({ parentId: val }).then((res) => {
            console.log('任务子类', res)
            setTaskSubTypeList(res.rows)
        })
    }

    const onChangeTaskSubType = (val) => {
        setTaskSubType(val)
        // run({current:1, pageSize:pagination.pageSize});
    }

    const clearType = () => {
        setTaskType(undefined)
        setTaskSubType(undefined)
    }

    const onChangeType = (val) => {
        console.log(val)
        setType(val)
    };


    const onChangeScope = (val) => {
        setScope(val);
    };

    const onChangeTime = (time: Dayjs)=>{
        console.log(time)
        setExcuteTime(time)
    }

    const getInspectionInfo = (id: string) => {
        getInspectionDetail(id).then((res) => {
            console.log(res.data)
            setType(res.data.executeCycle)
            setScope(res.data.scope)
            res.data.excuteTime = dayjs(res.data.excuteTime,timeFormat)
            console.log('--->time',res.data.excuteTime)
            setSelectedRowKeys(res.data.scriptId?.split(',').map(item=>Number(item)))

            if (res.data.executeCycle == 2) {
                res.data.week = res.data.week.split(',').map(item=>Number(item))
            }else if(res.data.executeCycle == 3){
                res.data.excuteDate = dayjs(res.data.excuteDate,dateFormat)
            }
            if(res.data.scope == 2){
                res.data.scopeContext = res.data.scopeContext.split(',').map(item=>Number(item))
            }else if(res.data.scope == 3){
                res.data.hosts = res.data.hosts.split(',')
            }
            console.log('初始化表单',res.data)
            setInitialValues(
                Object.assign({}, res.data),
            );
            setLoading(false);
        });
    };

    return !loading ? (
        <>
            <Form form={form} initialValues={initialValues} preserve={false}>
                <Form.Item label={'巡检名称：'} name='name' rules={[{required:true,message:'请输入巡检名称'}]}>
                    <Input placeholder='巡检名称' max={20} />
                </Form.Item>
                {/* <Form.Item label={'巡检类型：'} name='type' rules={[{required:true,message:'请选择巡检类型'}]}>
                    <Select allowClear placeholder={'巡检类型'} style={{ width: 200 }} onChange={onChangeType}>
                        {_.map(typeList, (item) => {
                            return (
                                <Select.Option key={item.value} value={item.id}>
                                    {item.value}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item> */}
                <Form.Item label={'执行周期：'} name='executeCycle' rules={[{required:true,message:'请选择执行周期'}]}>
                    <Select allowClear placeholder={'执行周期'} style={{ width: 200 }} onChange={onChangeType}>
                        {_.map(typeList, (item) => {
                            return (
                                <Select.Option key={item.value} value={item.id}>
                                    {item.value}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
                {type == 2 && (
                    <Form.Item name='week'  rules={[{required:true,message:'请至少选择一个'}]}>
                        <Checkbox.Group style={{ marginLeft: '65px' }} options={weekOption} />
                    </Form.Item>
                )}
                {type == 3 && (
                    <Form.Item name='excuteDate' rules={[{required:true,message:'请选择时间'}]}>
                        {/* @ts-ignore */}
                        <DatePicker style={{ marginLeft: '65px' }} format={dateFormat} />
                    </Form.Item>
                )}
                <Form.Item label={'执行时间：'} name='excuteTime' rules={[{required:true,message:'请选择执行时间'}]}>
                     {/* @ts-ignore */}
                    <TimePicker value={excuteTime} onChange={onChangeTime}/>
                </Form.Item>
                <Form.Item label={'执行范围：'} name='scope' rules={[{required:true,message:'请选择执行范围'}]}>
                    <Select allowClear placeholder={'执行范围'} style={{ width: 200 }} onChange={onChangeScope}>
                        {_.map(scopeList, (item) => {
                            return (
                                <Select.Option key={item.value} value={item.id}>
                                    {item.value}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
                {scope == 2 && (
                    <Form.Item name="scopeContext" rules={[{required:true,message:'请选择项目'}]}>
                        <Checkbox.Group style={{ marginLeft: '65px' }} options={serveList.map(item => { return { label: item.name, value: item.id } })} />
                    </Form.Item>
                )}
                {scope == 3 && (
                    <Form.Item name="hosts" rules={[{required:true,message:'请选择Ip'}]}>
                        <Checkbox.Group style={{ marginLeft: '65px' }} options={ipList.map(item => { return { label: item.ident, value: item.ident } })}/>
                    </Form.Item>
                )}
            </Form>
            <Form form={taskForm} layout='inline' style={{borderTop:'2px solid #dcdcdc',paddingTop:'20px'}}>
                <Form.Item label={'任务类型：'}>
                    <Select allowClear placeholder={'任务类型'} style={{ width: 200 }} value={taskType} onChange={onChangeTaskType} onClear={clearType}>
                        {_.map(taskTypeList, (item) => {
                            return (
                                <Select.Option key={item.name} value={item.id}>
                                    {item.name}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
                <Form.Item label={'任务子类：'}>
                    <Select allowClear placeholder={'任务子类'} style={{ width: 200 }} value={taskSubType} onChange={onChangeTaskSubType}>
                        {_.map(taskSubTypeList, (item) => {
                            return (
                                <Select.Option key={item.name} value={item.name}>
                                    {item.name}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
                <Form.Item label={'任务名称：'} name='title'>
                    <Input placeholder='任务名称' max={20} onPressEnter={() => run({ current: 1, pageSize: pagination.pageSize })} />
                </Form.Item>
            </Form>
            <Table
                style={{ marginTop: '20px' }}
                size='small'
                rowKey='id'
                columns={taskColumn}
                {...tableProps}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (selectedRowKeys: string[]) => {
                        setSelectedRowKeys(selectedRowKeys);
                    },
                }}
                pagination={{
                    ...tableProps.pagination,
                    ...pagination,
                }}
            />
        </>
    ) : null;
});
export default InspectionForm;
