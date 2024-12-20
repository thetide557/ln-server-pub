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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import moment from 'moment';
import _ from 'lodash';
import type { DatePickerProps } from 'antd';
import { Button, Input, message, Row, Modal, Table, Form, Space, Select, DatePicker, TimePicker, Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
import { getInspectionList, addInspection, editInspection, removeInspection, getInspectionLogList, getInspectionReportList, getInspectionReport } from '@/services/sxxc/inspection'
import { InspectionType, Inspection } from '@/store/sxxc/inspection';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import { getBusiGroups } from '@/services/common';
import { getMonObjectList } from '@/services/targets';
import Report from './report'
import queryString from 'query-string';
import './index.less';
// import './locale';

const { confirm } = Modal;

interface Param {
    inspectionId: string;
}

const Resource: React.FC = () => {
    const history = useHistory();
    const { profile, permList, busiGroups } = useContext(CommonStateContext);
    const groupIds = busiGroups?.map(item => item.id)
    console.log(1, useParams());
    console.log(2, useLocation());
    
    const { inspectionId } = useParams<Param>();
    const { search } = useLocation()
    const { name } = queryString.parse(search);
    console.log(name);
    
    const [typeList, setTypeList] = useState([
        { id: 1, value: '每日' },
        { id: 2, value: '每周' },
        { id: 3, value: '指定时间' },
    ]);
    const [statusList, setStatusList] = useState([
        { id: 0, value: '未执行' },
        { id: 1, value: '执行中' },
        { id: 2, value: '已完成' },
    ]);
    const [scopeList, setScopeList] = useState([
        { id: 1, value: '所有服务器' },
        { id: 2, value: '指定项目' },
        { id: 3, value: '指定IP' },
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
    const [excuteDate, setExcuteDate] = useState<string>();
    const [excuteTime, setExcuteTime] = useState<string>();
    const [type, setType] = useState(Number)
    const [week, setWeek] = useState([] as any)
    const [scope, setScope] = useState(Number)
    const [checkedServe, setCheckedServe] = useState([] as any)
    const [checkedIp, setCheckedIp] = useState([] as any)
    const [checkedProjectName, setCheckedProjectName] = useState([] as any)
    const [excuteStatus, setExcuteStatus] = useState<number>()
    
    const [ipList, setIpList] = useState([] as any)
    const [serveList, setServeList] = useState([] as any)
    const [form] = Form.useForm();
    const pagination = usePagination({ PAGESIZE_KEY: 'inspectionLog' });
    const [report, setReport] = useState({} as any)
    const [visible, setVisible] = useState<boolean>(false)

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
            dataIndex: 'executeCycle',
            render: (text, record, index) => typeList.filter(item => item.id == text)[0]?.value,
        },
        {
            title: '执行时间',
            dataIndex: 'excuteTime',
        },
        {
            title: '业务组',
            dataIndex: 'projectName',
            // render: (text, record, index) => scopeList.filter(item => item.id == text)[0]?.value,
        },
        {
            title: '执行时间及状态',
            dataIndex: 'createTime',
        },
        {
            title: '执行状态',
            dataIndex: 'excuteStatus',
            render: (text, record, index) => statusList.filter(item => item.id == text)[0]?.value,
        },
        {
            title: '任务数',
            dataIndex: 'taskCount',
        },
        {
            title: '成功',
            dataIndex: 'successCount',
        },
        {
            title: '失败',
            // dataIndex: 'failCount',
            render: (text, record, index) => record.successCount ? record.taskCount - record.successCount : record.taskCount,
        },
    ];
    const taskColumns: ColumnsType<Inspection> = [
        ...taskColumn,
        {
            title: '操作',
            render: (text: string, record) => (
                <>
                    {/* <Button className='oper-name' type='link' onClick={() => changeStatus(record)}>
                        详情
                    </Button> */}
                    {
                        (profile.roles?.includes('Admin') || permList.includes('/inspection/inspectionLog')) && <Button className='oper-name' type='link' onClick={() => changeReport(record)}>
                            报告
                        </Button>
                    }

                </>
            ),
        },
    ];

    const elementRef = useRef<HTMLDivElement>(null);

    const exportPDF = () => {
        html2canvas(elementRef.current!).then((canvas) => {
            const contentWidth = canvas.width;
            const contentHeight = canvas.height;
            //一页pdf显示html页面生成的canvas高度;
            const pageHeight = contentWidth / 592.28 * 841.89;
            //未生成pdf的html页面高度
            let leftHeight = contentHeight;
            //页面偏移
            let position = 0;
            //a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
            const imgWidth = 595.28;
            const imgHeight = 592.28 / contentWidth * contentHeight;

            const pageData = canvas.toDataURL('image/jpeg', 1.0);
            const str: any = ''
            const pdf = new jsPDF(str, 'pt', 'a4');

            //有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
            //当内容未超过pdf一页显示的范围，无需分页
            console.log(leftHeight, pageHeight)
            if (leftHeight < pageHeight) {
                console.log(imgWidth, imgHeight)
                pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);
            } else {    // 分页
                while (leftHeight > 0) {
                    pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
                    leftHeight -= pageHeight;
                    position -= 841.89;
                    //避免添加空白页
                    if (leftHeight > 0) {
                        pdf.addPage();
                    }
                }
            }
            pdf.save(`${report.name}.pdf`);
        });
    };


    const changeStatus = (val) => {
        history.push(`/taskManage/taskInstance/${val.id}`);
    }

    const changeReport = (val) => {
        console.log(val)
        let params = { id: val.inspectionLogId, project: val.projectName }
        getInspectionReport(params).then(res => {
            console.log(res)
            setReport(res.data)
            setVisible(true)
        })
    }

    const getTableData = ({ current, pageSize }): Promise<any> => {  
        const params = {
            ...form.getFieldsValue(),
            id: inspectionId,
            // type: type == 0 ? undefined : type,
            executeCycle: type == 0 ? undefined : type,
            // scope: scope == 0 ? undefined : scope,
            excuteDate: excuteDate,
            excuteTime: excuteTime,
            // week: week.length != 0 ? week.join(',') : undefined,
            week: week.length != 0 ? week.join('') : undefined,
            // checkedServe: checkedServe.length != 0 ? checkedServe.join(',') : undefined,
            // 业务组名称
            projectName: checkedProjectName.length != 0 ? checkedProjectName.join(',') : undefined,
            // 执行状态
            excuteStatus: excuteStatus,
            // checkedIp: checkedIp.length != 0 ? checkedIp.join(',') : undefined,
            pageSize: pageSize,
            pageNum: current,
            // groupIds: groupIds?.toString(),
            name: name
        };

        return getInspectionReportList({
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
        refreshDeps: [form, type, scope, excuteTime, excuteDate, week, checkedServe, checkedIp,checkedProjectName,excuteStatus],
    });

    const onChangeType = (val) => {
        setType(val)
        if(val){
            if (val == 1) {
                setExcuteDate()
                setWeek([])
            } else if (val == 2) {
                setExcuteDate()
            } else if (val == 3) {
                setWeek([])
            }
        }else{
            setExcuteDate()
            setWeek([])
        }
    };

    const onChangeWeek = (checkedValues: CheckboxValueType[]) => {
        setWeek(checkedValues)
    }

    const onChangeTime = (time, timeString: string) => {
        setExcuteTime(timeString)
    }
    const onChangeScope = (val) => {
        setScope(val);
        if (val == 1) {
            setCheckedServe([])
            setCheckedIp([])
        } else if (val == 2) {
            setCheckedIp([])
        } else if (val == 3) {
            setCheckedServe([])
        }
    };
    const onChangeServe = (checkedValues: CheckboxValueType[]) => {
        console.log('checked = ', checkedValues);
        setCheckedServe(checkedValues)
    }
    const onChangeIp = (checkedValues: CheckboxValueType[]) => {
        let arr = checkedValues.map(item => {
            return ipList.filter(res => item == res.id)[0]?.remote_addr
        })
        console.log('checked = ', checkedValues);
        setCheckedIp(arr)
    }

    const onChangeProjectName = (value) => {
        setCheckedProjectName(value)
    };
    const onChangeExcuteStatus = (val) => {
        setExcuteStatus(val)
    };
    const onChangeDate: DatePickerProps['onChange'] = (date, dateString) => {
        console.log(dateString);
        setExcuteDate(dateString)
    };

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

    useEffect(() => {
        getBusiGroup()
    }, []);

    const handleClose = () => {
        setVisible(false)
    }

    const downLoad = () => {
        console.log(report)
    }

    const handleSubmit = async () => {
        try {
            await form.validateFields();
            run({ current: 1, pageSize: pagination.pageSize });
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <PageLayout title={'巡检报告'} icon={<UserOutlined />} showBack>
            <div className='task-manage-content'>
                <div className='task-content'>
                    <Form form={form}>
                        {/* <Space style={{ marginRight: 16 }}>
                            <Form.Item label={'巡检名称'} name='name'>
                                <Input
                                    className='left-area-group-search'
                                    placeholder='20个字不能重复'
                                    maxLength={20}
                                    style={{ width: '270px' }}
                                    onPressEnter={(e) => {
                                        e.preventDefault();
                                        const value = e.currentTarget?.value;
                                    }}
                                />
                            </Form.Item>
                        </Space> */}
                        <Space>
                            <Form.Item label={'执行周期：'} name='executeCycle'>
                                <Select allowClear placeholder={'执行周期'} style={{ width: 200 }} onChange={onChangeType}>
                                    {_.map(typeList, (item) => {
                                        return (
                                            <Select.Option key={item.value} value={item.id}>
                                                {item.value}
                                            </Select.Option>
                                        );
                                    })}
                                </Select>
                                {type == 2 && (
                                    <Checkbox.Group style={{ marginLeft: '65px' }} options={weekOption} onChange={onChangeWeek} />
                                )}
                                {type == 3 && (
                                    <DatePicker style={{ marginLeft: '65px' }} onChange={onChangeDate} />
                                )}
                            </Form.Item>
                        </Space>
                        {/* <Form.Item label={'执行范围：'} name='scope'>
                            <Select allowClear placeholder={'执行范围'} style={{ width: 200 }} onChange={onChangeScope}>
                                {_.map(scopeList, (item) => {
                                    return (
                                        <Select.Option key={item.value} value={item.id}>
                                            {item.value}
                                        </Select.Option>
                                    );
                                })}
                            </Select>

                            {scope == 2 && (
                                <Checkbox.Group style={{ marginLeft: '65px' }} options={serveList.map(item => { return { label: item.name, value: item.id } })} onChange={onChangeServe} />
                            )}
                            {scope == 3 && (
                                <Checkbox.Group style={{ marginLeft: '65px' }} options={ipList.map(item => { return { label: item.remote_addr, value: item.id } })} onChange={onChangeIp} />
                            )}
                        </Form.Item> */}
                        <Form.Item label={'业务组：'}>
                            <Select mode="multiple" allowClear placeholder={'请选择业务组'} style={{ width: 200 }} onChange={onChangeProjectName}>
                                {_.map(serveList, (item) => {
                                    return (
                                        <Select.Option key={item.id} value={item.name}>
                                            {item.name}
                                        </Select.Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                        <Form.Item label={'执行状态：'}>
                            <Select allowClear placeholder={'执行状态'} style={{ width: 200 }} onChange={onChangeExcuteStatus}  >
                                {_.map(statusList, (item) => {
                                    return (
                                        <Select.Option key={item.id} value={item.id}>
                                            {item.value}
                                        </Select.Option>
                                    );
                                })}
                            </Select>

                        </Form.Item>
                        <Space>
                            <Form.Item label={'执行时间：'}>
                                <TimePicker onChange={onChangeTime} />
                            </Form.Item>
                        </Space>
                        <Space>
                            <Button style={{ marginLeft: '16px' }} onClick={handleSubmit}
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
            </div>
            <Modal
                title={'巡检任务报告'}
                visible={visible}
                width={1600}
                onCancel={handleClose}
                destroyOnClose={true}
                footer={[
                    <Button key='back' onClick={handleClose}>
                        关闭
                    </Button>,
                    <Button type='primary' onClick={exportPDF}>
                        下载
                    </Button>
                ]}
            >
                <div ref={elementRef} style={{ minHeight: '300px' }}>
                    <Report
                        report={report}
                    />
                </div>
            </Modal>
        </PageLayout>
    );
};

export default Resource;
