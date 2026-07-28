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
import { Link, useHistory } from 'react-router-dom';
import { Table, Divider, Checkbox, Row, Col, Input, Select, Button } from 'antd';
import { PlusOutlined, SearchOutlined, CodeOutlined } from '@ant-design/icons';
import { ColumnProps } from 'antd/lib/table';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import request from '@/utils/request';
import api from '@/utils/api';
import { BusinessGroup } from '@/pages/targets';
import PageLayout from '@/components/pageLayout';
import BlankBusinessPlaceholder from '@/components/BlankBusinessPlaceholder';
import { CommonStateContext } from '@/App';
import './style.less';

interface DataItem {
  id: number;
  title: string;
}

function getTableData(options: any, busiId: number | undefined, query: string, mine: boolean, days: number) {
  if (busiId) {
    return request(`${api.tasks(busiId)}?limit=${options.pageSize}&p=${options.current}&query=${query}&mine=${mine ? 1 : 0}&days=${days}`).then((res) => {
      return { list: res.dat.list, total: res.dat.total };
    });
  }
  return Promise.resolve({ list: [], total: 0 });
}

const index = (_props: any) => {
  const history = useHistory();
  const { t, i18n } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(true);
  const [days, setDays] = useState(7);
  const { profile, permList, curBusiId, setCurBusiId } = useContext(CommonStateContext);
  const { tableProps } = useAntdTable((options) => getTableData(options, curBusiId, query, mine, days), { refreshDeps: [curBusiId, query, mine, days] });
  const columns: ColumnProps<DataItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 100,
    },
    {
      title: t('task.title'),
      dataIndex: 'title',
      width: 200,
      render: (text, record) => {
        return <Link to={{ pathname: `/job-tasks/${record.id}/result` }}>{text}</Link>;
      },
    },
    {
      title: t('table.operations'),
      width: 150,
      render: (_text, record) => {
        return (
          <span className='job-task-operation-links'>
            {
              (profile.roles?.includes("Admin") || permList.includes("/job-tasks/clone")) && <><Link className='job-task-op-btn job-task-op-copy' to={{ pathname: '/job-tasks/add', search: `task=${record.id}` }}>{t('task.clone')}</Link><Divider type='vertical' /></>
            }

            {
              (profile.roles?.includes("Admin") || permList.includes("/job-tasks/meta")) && <Link className='job-task-op-btn job-task-op-meta' to={{ pathname: `/job-tasks/${record.id}/detail` }}>{t('task.meta')}</Link>
            }
          </span>
        );
      },
    },
    {
      title: t('task.creator'),
      dataIndex: 'create_by',
      width: 100,
    },
    {
      title: t('task.created'),
      dataIndex: 'create_at',
      width: 160,
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  return (
    <div className='job-task-page'>
      <PageLayout
        title={
          <>
            <CodeOutlined />
            {t('task')}
          </>
        }
      >
        <div className='job-task-content'>
          <BusinessGroup
            curBusiId={curBusiId}
            setCurBusiId={(id) => {
              setCurBusiId(id);
            }}
          />
          {curBusiId ? (
            <div className='job-task-main-card'>
              <Row className='job-task-toolbar' align='middle'>
                <Col flex='auto' className='job-task-filters'>
                  <Input
                    className='job-task-search'
                    prefix={<SearchOutlined />}
                    placeholder='搜索任务标题'
                    defaultValue={query}
                    onPressEnter={(e) => {
                      setQuery(e.currentTarget.value);
                    }}
                  />
                  <Select
                    className='job-task-days'
                    value={days}
                    onChange={(val: number) => {
                      setDays(val);
                    }}
                  >
                    <Select.Option value={7}>{t('last.7.days')}</Select.Option>
                    <Select.Option value={15}>{t('last.15.days')}</Select.Option>
                    <Select.Option value={30}>{t('last.30.days')}</Select.Option>
                    <Select.Option value={60}>{t('last.60.days')}</Select.Option>
                    <Select.Option value={90}>{t('last.90.days')}</Select.Option>
                  </Select>
                  <Checkbox
                    className='job-task-mine'
                    checked={mine}
                    onChange={(e) => {
                      setMine(e.target.checked);
                    }}
                  >
                    {t('task.only.mine')}
                  </Checkbox>
                </Col>
                <Col flex='none' className='job-task-actions'>
                  {
                    (profile.roles?.includes("Admin") || permList.includes("/job-tasks/add")) && <Button
                      type='primary'
                      onClick={() => {
                        history.push('/job-tasks/add');
                      }}
                    >
                      <PlusOutlined />
                      创建临时任务
                    </Button>
                  }
                </Col>
              </Row>
              <Table
                className='job-task-list-table'
                size='small'
                rowKey='id'
                columns={columns as any}
                {...(tableProps as any)}
                pagination={
                  {
                    ...tableProps.pagination,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '50', '100', '500', '1000'],
                    showTotal: (total) => {
                      return i18n.language == 'en' ? `Total ${total} items` : `共 ${total} 条`;
                    },
                  } as any
                }
              />
            </div>
          ) : (
            <BlankBusinessPlaceholder text={t('task')}></BlankBusinessPlaceholder>
          )}
        </div>
      </PageLayout>
    </div>
  );
};

export default index;
