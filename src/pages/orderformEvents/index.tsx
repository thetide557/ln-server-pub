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
import React, { useContext, useState } from 'react';
import { AlertOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import _ from 'lodash';
import { useAntdTable } from 'ahooks';
import { Input, Tag, Button, Space, Table, Select, message } from 'antd';
import { Link } from 'react-router-dom';
import AdvancedWrap from '@/components/AdvancedWrap';
import PageLayout from '@/components/pageLayout';
import RefreshIcon from '@/components/RefreshIcon';
import { hoursOptions } from '@/pages/event/constants';
import { CommonStateContext } from '@/App';
import exportEvents, { downloadFile } from './exportEvents';
import { getEvents } from './services';
import { SeverityColor } from '../event';
import '../event/index.less';
import './locale';

export const getDefaultHours = () => {
  const locale = window.localStorage.getItem('alert_events_hours');
  if (locale) {
    return _.toNumber(locale) || 6;
  }
  return 6;
};

export const setDefaultHours = (hours: number) => {
  window.localStorage.setItem('alert_events_hours', `${hours}`);
};

const Event: React.FC = () => {
  const { t } = useTranslation('AlertHisEvents');
  const { groupedDatasourceList, busiGroups, datasourceList } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [filter, setFilter] = useState<{
    hours: number;
    datasourceIds: number[];
    bgid?: number;
    severity?: number;
    eventType?: number;
    queryContent: string;
    status?: number;
    rule_prods: string[];
  }>({
    hours: getDefaultHours(),
    datasourceIds: [],
    queryContent: '',
    rule_prods: [],
  });
  const statusLable = (status: number) => {
    if (status === 0) {
      return "未处理"
    } else if (status === 1) {
      return "已处理"
    } else if (status === 2) {
      return "已关闭"
    } else {
      return "未定义"
    }
  };
  const columns = [
    {
      title: t('prod'),
      dataIndex: 'rule_prod',
      width: 100,
      render: (value) => {
        return t(`rule_prod.${value}`);
      },
    },
    {
      title: t('common:datasource.id'),
      dataIndex: 'datasource_id',
      width: 100,
      render: (value, record) => {
        return _.find(groupedDatasourceList?.[record.cate], { id: value })?.name || '-';
      },
    },
    {
      title: t('rule_name'),
      dataIndex: 'rule_name',
      render(title, { id, tags }) {
        const content =
          tags &&
          tags.map((item) => (
            <Tag
              color='purple'
              key={item}
              onClick={(e) => {
                if (!filter.queryContent.includes(item)) {
                  setFilter({
                    ...filter,
                    queryContent: filter.queryContent ? `${filter.queryContent.trim()} ${item}` : item,
                  });
                }
              }}
            >
              {item}
            </Tag>
          ));
        return (
          <>
            <div>
              <Link
                to={{
                  pathname: `/alert-orderform-events/${id}`,
                }}
                target='_self'
              >
                {title}
              </Link>
            </div>
            <div>
              <span className='event-tags'>{content}</span>
            </div>
          </>
        );
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 120,
      render(value) {
        return statusLable(value);
      },
    },
    {
      title: t('common:table.operations'),
      width: '98px',
      dataIndex: 'operation',
      render: (value, record) => {
        if (record.status === 0) {
          return (
            <>
              <div>
                <Link
                  to={{
                    pathname: `/alert-orderform-events/${record.id}`,
                  }}
                  target='_self'
                >
                  处理
                </Link>
              </div>
            </>
          );
        }
      },
    },
    {
      title: t('last_eval_time'),
      dataIndex: 'last_eval_time',
      width: 120,
      render(value) {
        return moment((value ? value : 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  const [exportBtnLoadding, setExportBtnLoadding] = useState(false);
  const filterObj = Object.assign(
    { hours: filter.hours },
    filter.datasourceIds.length ? { datasource_ids: _.join(filter.datasourceIds, ',') } : {},
    filter.severity !== undefined ? { severity: filter.severity } : {},
    filter.queryContent ? { query: filter.queryContent } : {},
    filter.eventType !== undefined ? { is_recovered: filter.eventType } : {},
    filter.status !== undefined ? { status: filter.status } : {},
    { bgid: filter.bgid },
    filter.rule_prods.length ? { rule_prods: _.join(filter.rule_prods, ',') } : {},
  );

  function renderLeftHeader() {
    return (
      <div className='table-operate-box'>
        <Space>
          <RefreshIcon
            onClick={() => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Select
            style={{ minWidth: 80 }}
            value={filter.hours}
            onChange={(val) => {
              setFilter({
                ...filter,
                hours: val,
              });
              setDefaultHours(val);
            }}
          >
            {hoursOptions.map((item) => {
              return <Select.Option key={item.value} value={item.value}>{t(`hours.${item.value}`)}</Select.Option>;
            })}
          </Select>
          <AdvancedWrap var='VITE_IS_ALERT_AI,VITE_IS_ALERT_ES,VITE_IS_SLS_DS,VITE_IS_COMMON_DS'>
            {(isShow) => {
              let options = [
                {
                  label: 'Metric',
                  value: 'metric',
                },
                {
                  label: 'Host',
                  value: 'host',
                },
              ];
              if (isShow[0]) {
                options = [
                  ...options,
                  {
                    label: 'Anomaly',
                    value: 'anomaly',
                  },
                ];
              }
              if (isShow[1] || isShow[2]) {
                options = [
                  ...options,
                  {
                    label: 'Log',
                    value: 'logging',
                  },
                ];
              }
              if (isShow[3]) {
                options = [
                  ...options,
                  {
                    label: t('rule_prod.firemap'),
                    value: 'firemap',
                  },
                  {
                    label: t('rule_prod.northstar'),
                    value: 'northstar',
                  },
                ];
              }
              return (
                <Select
                  allowClear
                  placeholder={t('prod')}
                  style={{ minWidth: 80 }}
                  value={filter.rule_prods}
                  mode='multiple'
                  onChange={(val) => {
                    setFilter({
                      ...filter,
                      rule_prods: val,
                    });
                  }}
                  dropdownMatchSelectWidth={false}
                >
                  {options.map((item) => {
                    return (
                      <Select.Option value={item.value} key={item.value}>
                        {item.label}
                      </Select.Option>
                    );
                  })}
                </Select>
              );
            }}
          </AdvancedWrap>
          <Select
            allowClear
            mode='multiple'
            placeholder={t('common:datasource.id')}
            style={{ minWidth: 100 }}
            maxTagCount='responsive'
            dropdownMatchSelectWidth={false}
            value={filter.datasourceIds}
            onChange={(val) => {
              setFilter({
                ...filter,
                datasourceIds: val,
              });
            }}
          >
            {_.map(datasourceList, (item) => (
              <Select.Option value={item.id} key={item.id}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            style={{ minWidth: 120 }}
            placeholder={t('common:business_group')}
            allowClear
            value={filter.bgid}
            onChange={(val) => {
              setFilter({
                ...filter,
                bgid: val,
              });
            }}
          >
            {_.map(busiGroups, (item) => {
              return <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>;
            })}
          </Select>
          <Select
            style={{ minWidth: 60 }}
            placeholder={t('severity')}
            allowClear
            value={filter.severity}
            onChange={(val) => {
              setFilter({
                ...filter,
                severity: val,
              });
            }}
          >
            <Select.Option key={1} value={1}>S1</Select.Option>
            <Select.Option key={2} value={2}>S2</Select.Option>
            <Select.Option key={3} value={3}>S3</Select.Option>
          </Select>
          <Select
            style={{ minWidth: 60 }}
            placeholder={t('状态')}
            allowClear
            value={filter.status}
            onChange={(val) => {
              setFilter({
                ...filter,
                status: val,
              });
            }}
          >
            <Select.Option key={0} value={0}>未处理</Select.Option>
            <Select.Option key={1} value={1}>已处理</Select.Option>
            <Select.Option key={2} value={2}>关闭</Select.Option>
          </Select>
          <Input
            className='search-input'
            prefix={<SearchOutlined />}
            placeholder={t('search_placeholder')}
            value={filter.queryContent}
            onChange={(e) => {
              setFilter({
                ...filter,
                queryContent: e.target.value,
              });
            }}
            onPressEnter={(e) => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Button
            loading={exportBtnLoadding}
            onClick={() => {
              setExportBtnLoadding(true);
              exportEvents({ ...filterObj, limit: 1000000, p: 1 }, (err, csv) => {
                if (err) {
                  message.error(t('export_failed'));
                } else {
                  downloadFile(csv, `events_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
                }
                setExportBtnLoadding(false);
              });
            }}
          >
            {t('export')}
          </Button>
        </Space>
      </div>
    );
  }

  const fetchData = ({ current, pageSize }) => {
    filterObj.is_recovered = 0;
    return getEvents({
      p: current,
      limit: pageSize,
      ...filterObj,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [refreshFlag, JSON.stringify(filterObj)],
    defaultPageSize: 10,
  });

  return (
    <PageLayout icon={<AlertOutlined />} title={t('工单管理')}>
      <div className='event-content'>
        <div className='table-area'>
          {renderLeftHeader()}
          <Table
            size='small'
            columns={columns}
            {...tableProps}
            rowClassName={(record: { severity: number; is_recovered: number }) => {
              return SeverityColor[record.is_recovered ? 3 : record.severity - 1] + '-left-border';
            }}
            pagination={{
              ...tableProps.pagination,
              pageSizeOptions: ['10', '100', '200', '500'],
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Event;
