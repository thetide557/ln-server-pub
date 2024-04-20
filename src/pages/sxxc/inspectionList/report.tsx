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
import { Table, List } from 'antd';
import _ from 'lodash';
import React, { ReactNode, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnsType } from 'antd/lib/table';
import { useAntdTable } from 'ahooks';
import './index.less'
export interface ReportProps {
    report?: any;
}
export interface Table {
    host: string;
    taskReslut: string;
    id: string;
}
const InspectionForm = React.forwardRef<ReactNode, ReportProps>((props, ref) => {
    const { t } = useTranslation();
    const { report } = props;
    const [loading, setLoading] = useState<boolean>(true);
    const [table,setTable] = useState([] as any)
    const taskColumn: ColumnsType<Table> = [
        {
            title: 'IP',
            dataIndex: 'host',
        },
        {
            title: '任务结果',
            dataIndex: 'taskReslut',
            render: (text, record, index) => (
                <>
                    {text == 'success' && '成功'}
                    {text == 'failed' && '失败'}
                    {text == 'timeout' && '超时'}
                </>
            )
        },
    ];

    useImperativeHandle(ref, () => ({

    }));

    useEffect(() => {
        if (report) {
            setLoading(false)
            console.log(report)
            setTable(report.table)
        }else{
            setLoading(true)
        }
    }, []);
    return !loading ? (
        <div className='report'>
            <div className='center' style={{fontSize:'18px',fontWeight:'bold',paddingTop:'30px'}}>{report.name}巡检报告</div>
            <div className='center'>执行时间：{report.time}</div>
            <div className='center'>{report.projectName}</div>
            <Table
                size='small'
                rowKey='host'
                columns={taskColumn}
                dataSource={report.table}
                pagination={false}
            />
            {report.faild?.length != 0 && (
                <>
                    <div style={{marginTop:'30px',paddingLeft:'15px'}}>日志</div>
                    {_.map(report.faild,(item,index)=>{
                        return (
                            <div style={{paddingLeft:'15px'}} key={item}>
                                {index+1}. {item}
                            </div>
                        )
                    })}
                </>
            )}
        </div>
    ) : null;
});
export default InspectionForm;
