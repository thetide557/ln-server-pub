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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Button, Input, message, Modal, Select, Space, Row, Col, Dropdown, Menu, DatePickerProps, Radio } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, SearchOutlined, AppstoreOutlined, UnorderedListOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import PageLayout from '@/components/pageLayout';
import { deleteAlertEvents } from '@/services/warning';
import { AutoRefresh } from '@/components/TimeRangePicker';
import { CommonStateContext } from '@/App';
import { getProdOptions } from '@/pages/alertRules/Form/components/ProdSelect';
import Card from './card';
import Table from './Table';
import { hoursOptions } from './constants';
import locale from 'antd/es/date-picker/locale/zh_CN';
import './locale';
import DatePicker, { RangePickerProps } from 'antd/es/date-picker';
const { RangePicker } = DatePicker;
import './index.less';
import { exportTemplet } from '../historyEvents/services';
// @ts-ignore
import BatchAckBtn from 'plus:/parcels/Event/Acknowledge/BatchAckBtn';
import moment from 'moment';
import { useLocalStorage } from 'react-use';
import TimeRangePicker, { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';

const { confirm } = Modal;
export const SeverityColor = ['red', 'orange', 'yellow', 'green'];
export const SeverityFont = ['S1', 'S2', 'S3', '已修复'];
export function deleteAlertEventsModal(ids: number[], onSuccess = () => { }, t) {
  confirm({
    title: t('delete_confirm.title'),
    icon: <ExclamationCircleOutlined />,
    content: t('delete_confirm.content'),
    maskClosable: true,
    okButtonProps: { danger: true },
    zIndex: 1001,
    onOk() {
      return deleteAlertEvents(ids).then((res) => {
        message.success(t('common:success.delete'));
        onSuccess();
      });
    },
    onCancel() { },
  });
}
let cardQueryFilter = [
  { name: 'severity', label: '告警级别', type: 'select' },
  // { name: 'ip', label: 'IP地址', type: 'input' },
  
  // { name: 'rule_name', label: '告警规则名称', type: 'input' },
  // { name: 'name', label: '资产名称', type: 'input' },
  // { name: 'alert_rule', label: '告警规则', type: 'input' },
]
let listQueryFilter = [
  { name: 'ip', label: 'IP地址', type: 'input' },
  { name: 'severity', label: '告警级别', type: 'select' },
  { name: 'rule_name', label: '告警规则名称', type: 'input' },
  { name: 'name', label: '资产名称', type: 'input' },
  // { name: 'alert_rule', label: '告警规则', type: 'input' },
  { name: 'group_id', label: '业务组', type: 'select' },
]

const Event: React.FC = () => {
  const { t } = useTranslation('AlertCurEvents');
  const [view, setView] = useState<'card' | 'list'>('card');
  const { busiGroups, feats } = useContext(CommonStateContext);
  const [selectRowKeys, setSelectRowKeys] = useState<any[]>([]);

  const [searchVal, setSearchVal] = useLocalStorage<any>('current_filter_type', null);
  const [chooseVal,setChooseVal] = useState<any>('severity');
  const [filterParam, setFilterParam] = useLocalStorage<any>('current_filter_param', "severity");
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [ftype, setFtype] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [startTime, setStartTime] = useLocalStorage<any>('current_filter_start', null);
  const [endTime, setEndTime] = useLocalStorage<any>('current_filter_end', null);
  const DateFormat = 'YYYY-MM-DD HH:mm:ss';
  const [display, setDisplay] = useState<any>(localStorage.getItem('current_alert_display') ? _.toString(localStorage.getItem('current_alert_display')) : "card");

  const [filter, setFilter] = useState<any | {
    group_id?: number;
    severity?: number;
    query: string;
    start: number;
    end: number;
  }>({
    query: '',
    start: 0,
    end: 0,
  });
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [rowKeys, setRowKeys] = useState<any[]>([]);
  const [filterType, setFilterType] = useLocalStorage<any>('current_filter_types', "select");
  const [range, setRange] = useState<IRawTimeRange>({ start: 'now-1h', end: 'now' });

  const onChange = (
    value: DatePickerProps['value'] | RangePickerProps['value'],
    dateString: [string, string] | string,
  ) => {
    if (value == null ) {
      delete filter["start"];
      delete filter["end"];
      setStartTime(null)
      setEndTime(null)
      setRefreshFlag(_.uniqueId('refresh_'));
      localStorage.setItem('events_current_from',""+1);
    } else {
      setStartTime(dateString[0])
      setEndTime(dateString[1])
      localStorage.setItem('events_current_from',""+1);
    }
  };

  const onOk = (value: DatePickerProps['value'] | RangePickerProps['value'] | any) => {

    value?.forEach((element, index) => {
      if (index == 0 && element != null) {
        filter["start"] = moment(element).unix()
        setFilter({ ...filter });
      }
      if (index == 1 && element != null) {
        filter["end"] = moment(element).unix()
        setFilter({ ...filter });
      }
    });
    localStorage.setItem('events_current_from',""+1);
    setRefreshFlag(_.uniqueId('refresh_'));
  };
  useEffect(() => {
    setView(display);
    filterOptions["severity"] = [
      { label: 'S1', value: '1' },
      { label: 'S2', value: '2' },
      { label: 'S3', value: '3' },
    ];
    filterOptions["group_id"] = busiGroups.map(group => {
      return {
        value: "" + group.id,
        label: group.name,
      }
    })
    setFilterOptions({ ...filterOptions })
    const parsedRange = parseRange(range);
    filter["start"] = moment(parsedRange.start).unix();
    filter["end"] = moment(parsedRange.end).unix();
    setFilter({ ...filter });
    // if (startTime != null && endTime != null) {
    //   filter["start"] = moment(startTime).unix()
    //   filter["end"] = moment(endTime).unix()
    //   setFilter({ ...filter });
    // }
  }, [])

  useEffect(() => {
    const parsedRange = parseRange(range);
    filter["start"] = moment(parsedRange.start).unix();
    filter["end"] = moment(parsedRange.end).unix();
    setFilter({ ...filter });

  }, [JSON.stringify(range)])

  function renderLeftHeader(type:string) {
    
    return (
      <Row justify='space-between' style={{ width: '100%' }}>
        <Space>
          <Button icon={<AppstoreOutlined />} onClick={() => {
            setView('card');     
            if (filterParam == "group_id") {
              setFilterParam(null);
              setSearchVal(null);
              setFilterType(null);
            }       
            localStorage.setItem('current_alert_display', "card");
            setChooseVal('severity')
            
          }} />
          <Button icon={<UnorderedListOutlined />} onClick={() => {
            setView('list')
            localStorage.setItem('current_alert_display', "list")
            setChooseVal('')
          }} />

         
            <Select
              placeholder="选择过滤器"
              style={{ width: 120 }}
              value={chooseVal}
              defaultValue={filterParam}
              onChange={(value) => {
                setChooseVal(value)
                if (value == undefined) {
                  setFilterParam(null);
                  setSearchVal(null);
                  setFilterType(null);
                  localStorage.setItem('events_current_from',""+1);
                } else {
                  let list = type=="card"?cardQueryFilter:listQueryFilter
                  list.forEach((item) => {
                    if (item.name == value) {
                      setFilterType(item.type);
                      setFilterParam(value);
                      setSearchVal(null)
                      localStorage.setItem('events_current_from',""+1);
                    }
                  })

                }

              }}>
               {type=="card" && cardQueryFilter.map((item, index) => (
                <Select.Option value={item.name} key={index}>{item.label}</Select.Option>
              ))}
               {type=="list" && listQueryFilter.map((item, index) => (
                <Select.Option value={item.name} key={index}>{item.label}</Select.Option>
               ))}
            </Select>

          {filterType == "input" && (
            <Input
              className={'searchInput'}
              value={searchVal}
              allowClear
              onChange={(e) => {
                if (e.target.value && e.target.value.length > 0) {
                  setSearchVal(e.target.value);
                } else {
                  setSearchVal(null)
                }
                localStorage.setItem('events_current_from',""+1);
              }}
              suffix={<SearchOutlined />}
              placeholder={'输入检索关键字'}
            />
          )}
          {filterType == "select" && (
            <Select
              className={'searchInput'}
              value={searchVal}
              allowClear
              options={filterOptions[filterParam] ? filterOptions[filterParam] : []}
              onChange={(val) => {
                if (val && val.length > 0) {
                  setSearchVal(val);
                } else {
                  setSearchVal(null)
                }
                localStorage.setItem('events_current_from',""+1);
              }}
              placeholder={'选择要筛选的条件'}
            />
          )}
          <TimeRangePicker value={range} onChange={setRange} dateFormat='YYYY-MM-DD HH:mm:ss' />
          {/* <RangePicker
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm"
            onChange={onChange}
            defaultValue={[startTime ? moment(startTime) : null, endTime ? moment(endTime) : null]}
            value={[startTime ? moment(startTime, DateFormat) : null, endTime ? moment(endTime, DateFormat) : null]}
            locale={locale}
            onOk={onOk}
          /> */}
        </Space>
        <Col
          flex='200px'
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {view === 'list' && (
            <>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item
                      disabled={selectedRowKeys.length === 0}
                      onClick={() =>
                        deleteAlertEventsModal(
                          selectedRowKeys,
                          () => {
                            setSelectedRowKeys([]);
                            setRefreshFlag(_.uniqueId('refresh_'));
                          },
                          t,
                        )
                      }
                    >
                      {t('common:btn.batch_delete')}{' '}
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => {
                        if (selectedRowKeys.length == 0) {
                          Modal.confirm({
                            title: "确认导出所有告警信息吗",
                            onOk: async () => {
                              setModalOpen(true);
                            },
                            onCancel() { },
                          });
                          setRowKeys([]);
                        } else {
                          setModalOpen(true);
                          setRowKeys(selectedRowKeys);
                        }
                      }}>导出</Menu.Item>

                    <BatchAckBtn
                      selectedIds={selectedRowKeys}
                      onOk={() => {
                        setSelectedRowKeys([]);
                        setRefreshFlag(_.uniqueId('refresh_'));
                      }}
                    />
                  </Menu>
                }
                trigger={['click']}
              >
                <Button style={{ marginRight: 8 }}>{t('batch_btn')}</Button>
              </Dropdown>
            </>

          )}
          <AutoRefresh
            onRefresh={() => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
        </Col>
      </Row>
    );
  }

  const filterObj = Object.assign(
    (searchVal != null && searchVal.length > 0) ? { filter: filterParam, query: searchVal } : {},
    filter.start > 0 ? { start: filter.start } : {},
    filter.end > 0 ? { end: filter.end } : {},
  );

  const handleModal = (action: string, row: any[]) => {
    if (action == "open") {
      let params: any = {};
      if (row != null && row.length > 0) {
        params.ids = row;
      }
      filter["ftype"] = ftype;
      filter["alert_type"] = 1;
      if (filter.query == null || filter.query.length == 0) {
        delete filter["query"];
      }
      if (filter.start <= 0) {
        delete filter["start"];
      }
      if (filter.end <= 0) {
        delete filter["end"];
      }
      let url = "/api/n9e/alert-events/export-xls";
      let exportTitle = "活跃告警告警信息";
      exportTemplet(url, filter, params).then((res) => {
        const url = window.URL.createObjectURL(new Blob([res],
          // 设置该文件的mime类型，这里对应的mime类型对应为.xlsx格式                          
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        let fileType = ".xls"
        if (ftype === 1) {
          fileType = ".xls"
        } else if (ftype === 2) {
          fileType = ".xml"
        } else if (ftype === 3) {
          fileType = ".txt"
        }
        const fileName = exportTitle + "数据_" + moment().format('MMDDHHmmss') + fileType //decodeURI(res.headers['filename']);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        setModalOpen(false)
      })
    } else {
      setModalOpen(false)
    }
  }
  return (
    <PageLayout icon={<AlertOutlined />} title={t('title')}>
      {view === 'card' ? (
        <Card header={renderLeftHeader(view)} filter={filterObj} refreshFlag={refreshFlag} />
      ) : (
        <>

          <Table
            header={renderLeftHeader(view)}
            filter={filter}
            filterObj={filterObj}
            setFilter={setFilter}
            refreshFlag={refreshFlag}
            selectedRowKeys={selectedRowKeys}
            deleteAlert={(value) => {
              let ids = new Array();
              ids.push(value);
              setModalOpen(true);
              setRowKeys(ids);
            }}
            setSelectedRowKeys={setSelectedRowKeys}
          />
          <Modal title="告警信息导出" visible={modalOpen} onOk={e => { handleModal("open", rowKeys) }} onCancel={e => { handleModal("close", rowKeys) }} >
            <Radio.Group style={{ width: '100%', display: "flex", justifyContent: 'center' }} defaultValue={ftype}>
              <Radio value={1} onChange={e => {
                setFtype(parseInt("" + e.target.value))
              }}>Excle</Radio>
              <Radio value={2} onChange={e => {
                setFtype(parseInt("" + e.target.value))
              }}>XML</Radio>
              <Radio value={3} onChange={e => {
                setFtype(parseInt("" + e.target.value))
              }}>TXT</Radio>
            </Radio.Group>
          </Modal>
        </>
      )}
    </PageLayout>
  );
};

export default Event;
