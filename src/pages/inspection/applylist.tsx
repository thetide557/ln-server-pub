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
import React, { useState, useContext } from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Button, Input, message, Row, Modal, Table, Select } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
import ApplyInfoModal from './createModal/apply';
import { getUserInfoList, deleteUser } from '@/services/manage';
import { User, UserType, ActionType } from '@/store/manageInterface';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import RefreshIcon from '@/components/RefreshIcon';
// import './index.less';
// import './locale';
const { confirm } = Modal;

const Resource: React.FC = () => {
  const { t } = useTranslation('user');
  const [visible, setVisible] = useState<boolean>(false);
  const [action, setAction] = useState<ActionType>();
  const [keyId, setKeyId] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const { profile } = useContext(CommonStateContext);
  const pagination = usePagination({ PAGESIZE_KEY: 'users' });

  const [filter, setFilter] = useState<{
    name?: string;
    status?: number;
  }>({});


  const filterObj = Object.assign(
    filter.name !== undefined ? { name: filter.name } : {},
    filter.status !== undefined ? { status: filter.status } : {},
  );



  const userColumn: ColumnsType<User> = [
    {
      title: t('巡检任务名称'),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: t('任务描述'),
      dataIndex: 'nickname',
      ellipsis: true,
      render: (text: string, record) => record.nickname || '-',
    },
    {
      title: t('巡检负责人'),
      dataIndex: 'email',
      render: (text: string, record) => record.email || '-',
    },
    {
      title: t('巡检时间'),
      dataIndex: 'phone',
      render: (text: string, record) => record.phone || '-',
    },
  ];
  const userColumns: ColumnsType<User> = [
    ...userColumn,
    {
      title: t('巡检区域'),
      dataIndex: 'roles',
      render: (text: []) => text.join(', '),
    },
    {
      title: t('巡检范围'),
      dataIndex: 'roles',
      render: (text: []) => text.join(', '),
    },
    {
      title: t('巡检报备'),
      dataIndex: 'roles',
      render: (text: []) => text.join(', '),
    },
    {
      title: t('报告接收人'),
      dataIndex: 'roles',
      render: (text: []) => text.join(', '),
    },
    {
      title: t('状态'),
      dataIndex: 'roles',
      render: (text: []) => text.join(', '),
    },
    {
      title: t('common:table.create_at'),
      dataIndex: 'create_at',
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => a.create_at - b.create_at,
    },
    {
      title: t('common:table.operations'),
      width: '240px',
      render: (text: string, record) => (
        <>
          <a
            style={{
              color: 'red',
              marginLeft: '16px',
            }}
            onClick={() => {
              confirm({
                title: t('common:confirm.delete'),
                onOk: () => {
                  deleteUser(record.id).then((_) => {
                    message.success(t('common:success.delete'));
                    handleClose();
                  });
                },
                onCancel: () => {},
              });
            }}
          >
            {t('作废')}
          </a>
          <Button className='oper-name' type='link' onClick={() => handleClick(ActionType.Reset, record.id)}>
            {t('审批')}
          </Button>
        </>
      ),
    },
  ];

  if (!profile.roles?.includes('Admin')) {
    userColumns.pop(); //普通用户不展示操作列
  }

  const handleClick = (type: ActionType, id?: string) => {
    if (id) {
      setKeyId(id);
    } else {
      setKeyId('');
    }

    setAction(type);
    setVisible(true);
  };

  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));

  // 弹窗关闭回调
  const handleClose = () => {
    setVisible(false);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  const getTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      p: current,
      limit: pageSize,
      ...filterObj,
    };

    return getUserInfoList({
      ...params}).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [refreshFlag, JSON.stringify(filterObj)],
  });

  
 

  return (
    <PageLayout title={t('巡检审批列表')} icon={<UserOutlined />}>
      <div className='user-manage-content'>
        <div className='user-content'>
          <Row className='event-table-search'>
            <div className='event-table-search-left'>
            <RefreshIcon
                onClick={() => {
                  setRefreshFlag(_.uniqueId('refresh_'));
                }}
              />
              <Input className={'searchInput'}  value={filter.name} prefix={<SearchOutlined />}
                onChange={(e) => {
                  setFilter({
                    ...filter,
                    name: e.target.value,
                  });
                }}
                onPressEnter={(e) => {
                  setRefreshFlag(_.uniqueId('refresh_'));
                }}
                placeholder={t('巡检计划名称')} />
              <Select
                style={{ minWidth: 80 }}
                placeholder={t('审批状态')}
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
            </div>
            {/* <div className='event-table-search-right'>
              {profile.roles?.includes('Admin') && (
                <div className='user-manage-operate'>
                  <Button type='primary' onClick={() =>{
                      history.push(`/inspection/plans/add`);
                  }}>
                    {t('common:btn.add')}
                  </Button>
                </div>
              )}
            </div> */}
          </Row>
          <Table
            size='small'
            rowKey='id'
            columns={userColumns}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
          />
        </div>  
        <ApplyInfoModal
          visible={visible}
          width={500}
          action='apply'        
          onClose={handleClose}
          keyId={keyId}
        />      
      </div>
    </PageLayout>
  );
};

export default Resource;
