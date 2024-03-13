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
import React, { useEffect, useState } from 'react';
import { Tag, Input, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import { getTeamInfo, getUserInfoList } from '@/services/manage';
import { TeamProps, User, Team } from '@/store/manageInterface';
import './index.less';
import { forEach } from 'lodash';

const AddUser: React.FC<TeamProps> = (props: TeamProps) => {
  const { t } = useTranslation('user');
  const { teamId, onSelect ,userIds} = props;
  const [teamInfo, setTeamInfo] = useState<Team>();
  const [selectedUser, setSelectedUser] = useState<React.Key[]>(userIds?userIds:[]);
  const [selectedUserRows, setSelectedUserRows] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [queryUsers, setQueryUsers] = useState<any[]>([]);
  const userColumn: ColumnsType<User> = [
    {
      title: t('account:profile.username'),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: t('account:profile.nickname'),
      dataIndex: 'nickname',
      ellipsis: true,
      render: (text: string, record) => record.nickname || '-',
    },
    {
      title: t('account:profile.email'),
      dataIndex: 'email',
      render: (text: string, record) => record.email || '-',
    },
    {
      title: t('account:profile.phone'),
      dataIndex: 'phone',
      render: (text: string, record) => record.phone || '-',
    },
  ];
  useEffect(() => {
    getTeam();
  }, []);

  const getTeam = () => {
    if (!teamId) return;
    getTeamInfo(teamId).then((data) => {
      setTeamInfo(data.user_group);
    });
  };

  const handleClose = (val) => {
    let newList = selectedUserRows.filter((item) => item.id !== val.id);
    let newId = newList.map((item) => item.id);
    setSelectedUserRows(newList);
    setSelectedUser(newId);
  };

  const onSelectChange = (newKeys: [], newRows: []) => {
    onSelect(newKeys);
    setSelectedUser(newKeys);
    let selectedUsers = new Array;
    for(let i = 0; i < newKeys.length;i++){
      queryUsers.forEach(user=>{
         if(user.id==newKeys[i]){
          selectedUsers.push(user);
         }
      })
    }
    setSelectedUserRows(selectedUsers);
  };

  const getTableData = ({ current, pageSize }): Promise<any> => {
    const params = {
      page: current,
      limit: pageSize,
    };

    return getUserInfoList({
      ...params,
      query,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
      setQueryUsers(res.dat.list);

    });
  };
  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: 5,
    refreshDeps: [query],
  });

  return (
    <div>
      <div>
        <span>{t('team.name')}：</span>
        {teamInfo && teamInfo.name}
      </div>
      <div
        style={{
          margin: '20px 0 16px',
        }}
      >
        {selectedUser.length > 0 && <span>{t('team.add_member_selected', { num: selectedUser.length })} </span>}
        {selectedUserRows.map((item, index) => {
          return (
            <Tag
              style={{
                marginBottom: '4px',
              }}
              closable
              onClose={() => handleClose(item)}
              key={item.id}
            >
              {item.username}
            </Tag>
          );
        })}
      </div>
      <Input
        className={'searchInput'}
        prefix={<SearchOutlined />}
        placeholder={t('user.search_placeholder')}
        onPressEnter={(e) => {
          setQuery((e.target as HTMLInputElement).value);
        }}
      />
      <Table
        size='small'
        rowKey='id'
        columns={userColumn}
        {...tableProps}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedUser,
          onChange: onSelectChange,
        }}
        pagination={{
          ...tableProps.pagination,
          size: 'small',
          pageSizeOptions: ['5', '10', '20', '50', '100'],
          showTotal: (total) => `总共 ${total} 条`,
          showSizeChanger: true,
        }}
      />
    </div>
  );
};

export default AddUser;
