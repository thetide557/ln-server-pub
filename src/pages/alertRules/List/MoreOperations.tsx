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
import { Dropdown, Button, Modal, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deleteStrategy, updateAlertRules } from '@/services/warning';
import { CommonStateContext } from '@/App';
import Import from './Import';
import Export from './Export';
import EditModal from './EditModal';

interface MoreOperationsProps {
  bgid: number;
  selectRowKeys: React.Key[];
  selectedRows: any[];
  refreshRules: (object?) => void;
}

const exportIgnoreAttrsObj = {
  cluster: undefined,
  create_by: undefined,
  group_id: undefined,
  id: undefined,
  notify_groups_obj: undefined,
  notify_groups: undefined,
  notify_users: undefined,
  create_at: undefined,
  update_at: undefined,
  update_by: undefined,
};

export default function MoreOperations(props: MoreOperationsProps) {
  const { t } = useTranslation('alertRules');
  const { bgid, selectRowKeys, selectedRows, refreshRules } = props;
  const [isModalVisible, setisModalVisible] = useState<boolean>(false);
  const { groupedDatasourceList, datasourceCateOptions } = useContext(CommonStateContext);

  return (
    <>
      <Dropdown
        overlay={
          <ul className='ant-dropdown-menu'>
            <li
              className='ant-dropdown-menu-item'
              onClick={() => {
                Import({
                  busiId: bgid<=0?1:bgid,
                  refreshList: refreshRules,
                  groupedDatasourceList,
                  datasourceCateOptions,
                });
              }}
            >
              <span>{'导入告警规则'}</span>
            </li>
            <li
              className='ant-dropdown-menu-item'
              onClick={() => {
                if (selectedRows.length) {
                  const exportData = selectedRows.map((item) => {
                    return { ...item, ...exportIgnoreAttrsObj };
                  });
                  Export({
                    data: JSON.stringify(exportData, null, 2),
                  });
                } else {
                  message.warning('请至少选择一条记录');
                }
              }}
            >
              <span>{'导出告警规则'}</span>
            </li>
            <li
              className='ant-dropdown-menu-item'
              onClick={() => {
                if (selectRowKeys.length) {
                  Modal.confirm({
                    title: "确定要批量删除？",
                    okText:"确认",
                    cancelText:"取消",
                    onOk: () => {
                      deleteStrategy(selectRowKeys as number[], bgid).then(() => {
                        message.success('删除成功');
                        refreshRules(2);
                      });
                    },
                  });
                } else {
                  message.warning(' 请选择要删除的告警规则');
                }
              }}
            >
              <span>批量删除</span>
            </li>
            <li
              className='ant-dropdown-menu-item'
              onClick={() => {
                if (selectRowKeys.length == 0) {
                  message.warning('请选择要更新的告警规则');
                  return;
                }
                setisModalVisible(true);
              }}
            >
              <span>{'更新告警规则'}</span>
            </li>
          </ul>
        }
        trigger={['click']}
      >
        <Button onClick={(e) => e.stopPropagation()}>
          {t('common:btn.more')}
          <DownOutlined
            style={{
              marginLeft: 2,
            }}
          />
        </Button>
      </Dropdown>
      <EditModal
        isModalVisible={isModalVisible}
        editModalFinish={async (isOk, fieldsData) => {
          if (isOk) {
            const action = fieldsData.action;
            delete fieldsData.action;
            const res = await updateAlertRules(
              {
                ids: selectRowKeys,
                fields: fieldsData,
                action,
              },
              bgid,
            );
            if (!res.err) {
              message.success('修改成功！');
              refreshRules(2);
              setisModalVisible(false);
            } else {
              message.error(res.err);
            }
          } else {
            setisModalVisible(false);

          }
        }}
      />
    </>
  );
}
