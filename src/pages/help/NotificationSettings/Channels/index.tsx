import React, { useState, useEffect } from 'react';
import { Table, Switch, Space, Button, Popconfirm, message } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { getNotifyChannels, putNotifyChannels } from '../services';
import { ChannelType } from '../types';
import AddModal from './AddModal';
import EditModal from './EditModal';

export default function Channels() {
  const { t } = useTranslation('notificationSettings');
  const [data, setData] = useState<ChannelType[]>([]);
  // 第六步 N33-D (d)（拍板 L-07）：后端第七份交接 6.1 把 `PUT /notify-channel` 改成**仅 Admin 可写**
  // （证据：ln-server `center/router/router.go:837` → `pages.PUT("/notify-channel", rt.auth(), rt.admin(), rt.notifyChannelPuts)`）。
  // 这里只把「会发那条 PUT 的入口」藏起来，**不是权限控制**——接口仍由后端 `rt.admin()` 拦，非 Admin 硬发请求照样 403。
  // 判法只认 Admin 角色、**不夹权限点那一半**（羚牛别处常写「Admin 角色 或 某个权限点」，这里不这么写），
  // 因为后端 6.1 只认角色、不认权限点。
  // 本页四个写入口都会直接发这条 PUT：footer 的「添加」、行内「修改」、行内「删除」、以及「隐藏」那一列的启停 Switch。
  // 前三个按羚牛样板（`src/pages/alertRules/List/index.tsx:245`）条件渲染藏掉；Switch 要留着让人看到当前状态，
  // 所以改成非 Admin `disabled`（能看、点不动）。
  const { profile } = React.useContext(CommonStateContext);
  const isAdmin = profile?.roles?.includes('Admin');

  useEffect(() => {
    getNotifyChannels().then((res) => {
      setData(res);
    });
  }, []);

  return (
    <div className='channels-container'>
      <Table<ChannelType>
        size='small'
        tableLayout='fixed'
        pagination={false}
        footer={() => {
          // 第六步 N33-D (d)：「添加」走 AddModal → putNotifyChannels，非 Admin 整个 footer 不渲染。
          if (!isAdmin) {
            return null;
          }
          return (
            <Space>
              <Button
                type='primary'
                onClick={() => {
                  AddModal({
                    idents: data.map((item) => item.ident),
                    onOk: (values) => {
                      const newData = [...data, values];
                      putNotifyChannels(newData).then(() => {
                        setData(newData);
                        message.success(t('common:success.add'));
                      });
                    },
                  });
                }}
              >
                {t('channels.add')}
              </Button>
            </Space>
          );
        }}
        dataSource={data}
        columns={[
          {
            title: t('channels.name'),
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: t('channels.ident'),
            dataIndex: 'ident',
            key: 'ident',
          },
          {
            title: t('channels.hide'),
            dataIndex: 'hide',
            key: 'hide',
            render: (val: boolean, record) => {
              return (
                <Switch
                  checked={val}
                  // 第六步 N33-D (d)：这个启停开关 onChange 里直接 putNotifyChannels，非 Admin 置灰（状态照看，点不动）。
                  disabled={!isAdmin}
                  onChange={(checked) => {
                    const newData = _.map(data, (item) => {
                      if (item.ident === record.ident) {
                        return {
                          ...item,
                          hide: checked,
                        };
                      }
                      return item;
                    });
                    putNotifyChannels(newData).then(() => {
                      setData(newData);
                      message.success(t('common:success.modify'));
                    });
                  }}
                />
              );
            },
          },
          {
            title: t('common:table.operations'),
            width: 100,
            render: (reocrd) => {
              // 第六步 N33-D (d)：「修改」「删除」两处 onOk / onConfirm 里都直接 putNotifyChannels，非 Admin 整列不渲染。
              if (!isAdmin) {
                return null;
              }
              return (
                <Space>
                  <a
                    onClick={() => {
                      EditModal({
                        initialValues: reocrd,
                        onOk: (values) => {
                          const oldIndex = _.findIndex(data, (item) => item.ident === reocrd.ident);
                          const newData = _.map(data, (item, idx) => {
                            if (idx === oldIndex) {
                              return values;
                            }
                            return item;
                          });
                          putNotifyChannels(newData).then(() => {
                            setData(newData);
                            message.success(t('common:success.modify'));
                          });
                        },
                      });
                    }}
                  >
                    {t('common:btn.modify')}
                  </a>
                  {!reocrd.built_in && (
                    <Popconfirm
                      title={t('common:confirm.delete')}
                      onConfirm={() => {
                        const newData = _.filter(data, (item) => item.ident !== reocrd.ident);
                        putNotifyChannels(newData).then(() => {
                          setData(newData);
                          message.success(t('common:success.delete'));
                        });
                      }}
                    >
                      <a>{t('common:btn.delete')}</a>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]}
      ></Table>
    </div>
  );
}
