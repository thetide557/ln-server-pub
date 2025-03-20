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
import type { DatePickerProps } from 'antd';
import { Button, Input, message, Row, Modal, Table, Form, Space, Select, DatePicker, Switch } from 'antd';
import { useHistory, Link } from 'react-router-dom';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
import { getInspectionList, addInspection, editInspectionStatus, editInspection, removeInspection, getInspectionDetailByGroup } from '@/services/sxxc/inspection'
import { InspectionType, Inspection } from '@/store/sxxc/inspection';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import './index.less';
import InspectionInfoModal from './components/createModal/index'

// import './locale';

const { confirm } = Modal;

const Resource: React.FC = () => {
    const history = useHistory();
    const [inspection, setInspection] = useState<InspectionType>();
    const [inspectionId, setInspectionId] = useState<string>('');
    const [visible, setVisible] = useState<boolean>(false);
    const [typeList, setTypeList] = useState([
        { id: 1, value: '每日' },
        { id: 2, value: '每周' },
        { id: 3, value: '指定时间' },
    ]);
    const [statusList, setStatusList] = useState([
        { id: 0, value: '有效' },
        { id: 1, value: '无效' }
    ]);
    const [scopeList, setScopeList] = useState([
        { id: 1, value: '所有服务器' },
        { id: 2, value: '指定项目' },
        { id: 3, value: '指定IP' },
    ]);
    const [subType, setSubType] = useState<string>();
    const [createTime, setCreateTime] = useState<string>();
    const [resultList, setResultList] = useState(['success', 'waiting', 'running']);
    const [form] = Form.useForm();
    const { profile, permList, busiGroups } = useContext(CommonStateContext);
    const groupIds = busiGroups?.map(item => item.id)
    const pagination = usePagination({ PAGESIZE_KEY: 'inspectionList' });
    const [pageNum, setPageNum] = useState(1)
    
    const [formData, setFormData] = useState<any>({})

    const taskColumn: ColumnsType<Inspection> = [
        {
            title: '序号',
            render: (text, record, index) => `${index + 1}`,
        },
        {
            title: '巡检名称',
            dataIndex: 'name',
        },
        {
            title: '执行周期',
            // title: '类型',
            // dataIndex: 'type',
            dataIndex: 'executeCycle',
            render: (text, record, index) => typeList.filter(item => item.id == text)[0]?.value,
        },
        {
            title: '执行时间',
            dataIndex: 'excuteTime',
        },
        {
            title: '执行范围',
            dataIndex: 'scope',
            render: (text, record, index) => scopeList.filter(item => item.id == text)[0]?.value,
        },
        {
            title: '添加人',
            dataIndex: 'createBy',
        },
        {
            title: '状态',
            dataIndex: 'status',
            // render: (text, record, index) => statusList.filter(item => item.id == text)[0].value,
            render: (text, record, index) => (
                <>
                    <Switch disabled={(profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionStatus')) ? false : true} checkedChildren="有效" unCheckedChildren="无效" checked={text == 0} onChange={() => changeStatus(record)} />
                </>
            )
        },
    ];
    const taskColumns: ColumnsType<Inspection> = [
        ...taskColumn,
        {
            title: '操作',
            width: '240px',
            render: (text: string, record) => (
                <>
                    {/* <Button className='oper-name' type='link' onClick={() => changeStatus(record)}>
                        {record?.status == '0'?'失效':'有效'}
                    </Button> */}
                    {
                        (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionEdit')) && <Button className='oper-name' type='link' onClick={() => handleClick(InspectionType.EditInspection, record.id)}>
                            修改
                        </Button>
                    }
                    {
                        (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionReport')) && <Button className='oper-name' type='link' onClick={() => goReport(record)}>
                            报告
                        </Button>
                    }
                    {
                        (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionLog')) && <Button className='oper-name' type='link' onClick={() => goLog(record)}>
                            日志
                        </Button>
                    }
                    {
                        (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionRemove')) && <a
                            style={{
                                marginLeft: '16px',
                            }}
                            onClick={() => {
                                confirm({
                                    title: '删除巡检任务',
                                    content: `将删除巡检任务${record?.name}`,
                                    onOk: () => {
                                        console.log(record)
                                        removeInspection(record.id).then(res => {
                                            console.log(res)
                                            message.success('删除成功');
                                            handleClose();
                                        })
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

    if (!profile.roles?.includes('Admin')) {
        // taskColumns.pop(); //普通用户不展示操作列
    }

    const handleClick = (type: InspectionType, id?: string) => {
        if (id) {
            setInspectionId(id);
            const params = {
                groupIds: localStorage.getItem('groupIds')
            }
            getInspectionDetailByGroup(id, params).then((res) => {
                if (res.code != 200) return message.error(res.msg)
                setFormData(res.data)
                setVisible(true)
            });
        } else {
            setInspectionId('');
            setVisible(true);
            setFormData({})
        }
        setInspection(type);
    }

    const changeStatus = (val) => {
        let status
        if (val.status == 0) {
            status = 1
        } else {
            status = 0
        }
        let params = {
            id: val.id,
            status: status
        }
        editInspectionStatus(params).then(res => {
            console.log(res)
            run({ current: pageNum, pageSize: pagination.pageSize });
        })
    }

    const goLog = (item) => {
        console.log(item)
        history.push(`/inspection/inspectionLog/${item.id}`);
    }

    const goReport = (item) => {
        console.log(item)
        history.push(`/inspection/inspectionReport?name=${item.name}`);
    }

    // 弹窗关闭回调
    const handleClose = () => {
        setVisible(false);
        setRefreshFlag(_.uniqueId('refresh_flag'));
    };

    const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
    const getTableData = ({ current, pageSize }): Promise<any> => {
        setPageNum(current)
        const params = {
            ...form.getFieldsValue(),
            pageSize: pageSize,
            pageNum: current,
            groupIds: localStorage.getItem('groupIds')
        };

        return getInspectionList({
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

    const onChangeSubType = (val) => {
        console.log(val)
        setSubType(val)
    }

    const onChangeDate: DatePickerProps['onChange'] = (date, dateString) => {
        console.log(dateString);
        setCreateTime(dateString)
    };

    useEffect(() => {

    }, []);

    return (
        <PageLayout title={'巡检任务'} icon={<UserOutlined />}>
            <div className='task-manage-content'>
                <div className='task-content'>
                    <Form form={form}>
                        <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'巡检名称'} name='name'>
                                <Input
                                    className='left-area-group-search'
                                    placeholder='巡检名称'
                                    // maxLength={20}
                                    style={{ width: '270px' }}
                                    onPressEnter={(e) => {
                                        e.preventDefault();
                                        const value = e.currentTarget.value;
                                    }}
                                />
                            </Form.Item>
                        </Space>
                        <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'添加人'} name='createBy'>
                                <Input
                                    className='left-area-group-search'
                                    placeholder='添加人'
                                    // maxLength={20}
                                    style={{ width: '270px' }}
                                    onPressEnter={(e) => {
                                        e.preventDefault();
                                        const value = e.currentTarget.value;
                                    }}
                                />
                            </Form.Item>
                        </Space>
                        {/* <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'巡检类型'} name='type'>
                                <Select allowClear placeholder={'巡检类型'} style={{ width: 200 }}>
                                    {_.map(typeList, (item) => {
                                        return (
                                            <Select.Option key={item.id} value={item.id}>
                                                {item.value}
                                            </Select.Option>
                                        );
                                    })}
                                </Select>
                            </Form.Item>
                        </Space> */}
                        <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'执行周期'} name='executeCycle'>
                                <Select allowClear placeholder={'执行周期'} style={{ width: 200 }}>
                                    {_.map(typeList, (item) => {
                                        return (
                                            <Select.Option key={item.id} value={item.id}>
                                                {item.value}
                                            </Select.Option>
                                        );
                                    })}
                                </Select>
                            </Form.Item>
                        </Space>
                        <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'巡检状态'} name='status'>
                                <Select allowClear placeholder={'巡检状态'} style={{ width: 200 }} value={subType} onChange={onChangeSubType}>
                                    {_.map(statusList, (item) => {
                                        return (
                                            <Select.Option key={item.id} value={item.id}>
                                                {item.value}
                                            </Select.Option>
                                        );
                                    })}
                                </Select>
                            </Form.Item>
                        </Space>
                        {/* <Space style={{ marginRight: 16 }}>
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
                        </Space> */}
                        <Space>
                            {
                                (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionQuery')) && <Button style={{ marginRight: '16px' }} onClick={handleSubmit}
                                >查询</Button>
                            }
                            
                        </Space>
                        <Space>
                            {
                                (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionAdd')) && <Button type='primary' onClick={() => handleClick(InspectionType.CreateInspection)}>新增</Button>
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
                    <InspectionInfoModal
                        visible={visible}
                        inspection={inspection as InspectionType}
                        width={1200}
                        onClose={handleClose}
                        inspectionId={inspectionId}
                        formData={formData}
                    />
                </div>
            </div>
        </PageLayout>
    );
};

export default Resource;
