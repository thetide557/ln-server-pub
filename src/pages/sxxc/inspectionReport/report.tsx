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
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React, { ReactNode, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.less';
// import ReactDiffCode from 'react-diff-code';
// import "react-diff-view/style/index.css";
// const {
//     parseDiff,
//     Diff,
//     Hunk,
//     Decoration,
//     tokenize,
//     markEdits,
//   } = require("react-diff-view");
// const { diffLines, formatLines } = require("unidiff");
// import { DiffViewer } from 'react-diff-view';
import ReactDiffViewer from 'react-diff-viewer';
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
  const [table, setTable] = useState([] as any);
  const taskColumn: ColumnsType<Table> = [
    {
      title: 'IP',
      dataIndex: 'host',
      width: '200px',
    },
    {
      title: '成功',
      dataIndex: 'success',
      width: '100px',
    },
    {
      title: '失败',
      dataIndex: 'failed',
      width: '100px',
    },
    {
      title: '超时',
      dataIndex: 'timeout',
      width: '100px',
    },
    // {
    //     title: 'cehnggong',
    //     dataIndex: 'taskReslut',
    //     render: (text, record, index) => (
    //         <>
    //             {text == 'success' && '成功'}
    //             {text == 'failed' && '失败'}
    //             {text == 'timeout' && '超时'}
    //         </>
    //     )
    // },
  ];

  let oldStr =
    '              total        used        free      shared  buff/cache   available\n' +
    'Mem:            23G         11G        2.2G        1.1G        9.6G         10G\n' +
    'Swap:            0B          0B          0B';
  let newStr =
    '              total        used        free      shared  buff/cache   available\n' +
    'Mem:            39G        3.1G         17G        2.0G         18G         32G\n' +
    'Swap:          2.0G          0B        2.0G';
  const newStyles = {
    line: {
      padding: '0px 2px',
      fontSize: '12px',
    },
  };

  useImperativeHandle(ref, () => ({}));

  useEffect(() => {
    if (report) {
      setLoading(false);
      console.log(report);
      // setTable(report.collect)
    } else {
      setLoading(true);
    }
  }, []);
  const resetTable = (value) => {
    let arr = [] as any;
    Object.keys(value).forEach((key) => {
      let success = 0;
      let failed = 0;
      let timeout = 0;
      value[key].forEach((item) => {
        if (item.taskReslut == 'success') {
          success++;
        } else if (item.taskReslut == 'fail') {
          failed++;
        } else {
          timeout++;
        }
      });
      let obj = {
        host: key,
        success: success,
        failed: failed,
        timeout: timeout,
      };
      arr.push(obj);
    });
    console.log(arr);
    return arr;
  };
  return !loading ? (
    <div className='report' style={{padding:'0px 30px'}}>
      <div className='center' style={{ fontSize: '18px', fontWeight: 'bold', paddingTop: '30px' }}>
        {report.name}巡检报告
      </div>
      <div className='center'>执行时间：{report.time}</div>
      {Object.keys(report.collect).map((key) => {
        return (
          <>
            <div key={key} className='center'>
              {key}
            </div>
            <Table size='small' style={{width:'500px'}} rowKey='host' columns={taskColumn} dataSource={resetTable(report.collect[key])} pagination={false} />
            {Object.keys(report.collect[key]).map((item) => {
              console.log(report.collect[key][item]);
              return (
                <>
                  <div style={{marginTop:'30px',fontSize:'18px'}}>IP：{item}</div>
                  {report.collect[key][item].map((res,index) => {
                    return (
                      <>
                        <div key={item} style={{fontSize:'18px'}}>{index+1}.任务名称：{res.taskName}</div>
                        <div style={{paddingLeft:'15px'}}>脚本内容：</div>
                        <pre style={{ fontSize: 12, padding: 10, background:'#000000', color:'#ffffff' }}>{res.script}</pre>
                        {res.taskReslut == 'success' && (
                          <>
                            {(res.sample || res.successMsg) && (<><div style={{paddingLeft:'15px'}}>执行结果差异对比：</div></>)}
                            <ReactDiffViewer oldValue={res.sample} newValue={res.successMsg} splitView={true} useDarkTheme={true} />
                          </>  
                        )}
                        {
                          res.taskReslut == 'failed' && (
                            <>
                              <div style={{paddingLeft:'15px',marginBottom:'20px'}}>{res.failedMsg}</div>
                            </>
                          )
                        }
                        {
                          res.taskReslut == 'timeout' && (
                            <>
                              <div style={{paddingLeft:'15px',marginBottom:'20px'}}>{res.timeoutMsg}</div>
                            </>
                          )
                        }
                      </>
                    );
                  })}
                </>
              );
            })}
          </>
        );
      })}
    </div>
  ) : null;
});
export default InspectionForm;
