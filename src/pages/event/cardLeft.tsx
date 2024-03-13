import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import './index.less';
import BusinessGroup from '../targets/BusinessGroup';
import classNames from 'classnames';
import { useLocalStorage } from 'react-use';
interface Props {
  onRefreshRule: (groupId: string) => void;
}

export interface CardAlertType {
  id: number;
  name: string;
  rule: string;
  cate: number;
  create_at: number;
  create_by: number;
  update_at: number;
}

export default function CardLeft(props: Props) {
  const { onRefreshRule } = props;
  const { t } = useTranslation('AlertCurEvents');
  const [alertList, setAlertList] = useState<CardAlertType[]>();
  const localSelectId = localStorage.getItem('selectedAlertRule');
  const [activeId, setActiveId] = useState<number>(localSelectId ? Number(localSelectId) : 0);
  const { profile, busiGroups } = useContext(CommonStateContext);
  const localGroupSelectId = localStorage.getItem('selectedAlertGroup');

  
  const [groupId, setGroupId] =   useLocalStorage<any>('current_event_groupId',-1);// useState<number>(localGroupSelectId ? Number(localGroupSelectId) :-1);

  useEffect(() => {
    let isGroupExist = false;
    let currentGroup = groupId;
    busiGroups.forEach((item) => {
      if (item.id === currentGroup) {
        isGroupExist = true;
      }
    });
    // if (!isGroupExist && busiGroups.length > 0) {
    //   currentGroup = busiGroups[0].id;
    //   setGroupId(currentGroup);
    //   // localStorage.setItem('selectedAlertGroup', '' + busiGroups[0].id);
    // }
    onRefreshRule('' + currentGroup);
  }, []);

  useEffect(() => {
    if (activeId && alertList && alertList.length > 0) {
      const currentAlert = alertList?.find((item) => item.id === activeId) as CardAlertType;
      if (currentAlert) {
        onRefreshRule(currentAlert.rule);
      } else {
        saveActiveId(alertList[0].id);
      }
    }
  }, [activeId]);

  function saveActiveId(id: number) {
    if (!id) return;
    setActiveId(id);
    // localStorage.setItem('selectedAlertRule', String(id));
  }

  const onSelect = (selectedKeys) => {
    let id = selectedKeys;
    setGroupId(id[0]);
    localStorage.setItem('selectedAlertGroup', id[0]);
    onRefreshRule(id[0] + '');
  };

  return (
      <BusinessGroup
        curBusiId={groupId}
        setCurBusiId={(id) => {
          onSelect([id]);
        }}
        renderHeadExtra={() => {
          return (
            <div>
              <div className='left-area-group-title'>预制筛选</div>
              <div
                className={classNames({
                  'n9e-biz-group-item': true,
                  active: groupId === -1,
                })}
                onClick={() => {
                  onSelect([-1]);
                }}
              >
                {'全部对象'}
              </div>
            </div>
          );
        }}
      />
  );
}
