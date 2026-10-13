import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import queryString from 'query-string';
import Form from './Form';

export default function () {
  const { t } = useTranslation('assets');

  const { search } = useLocation();
  const { mode , from } = queryString.parse(search);
  const [id, setId] = useState(queryString.parse(search)['id']);

  // 从机柜 U 位视图/列表跳转过来的，goBack 回到机房总览；
  // 从其他页面（资产列表等）跳转的，回到资产清单页
  const isFromRoomOverview = from === 'roomOverview';

  return (
    <PageLayout
      title={id!=null?(mode=="view"?'资产信息查看':'资产信息修改'):'资产信息新增'}
      showBack
      backPath={isFromRoomOverview ? undefined : '/xh/assetmgt'}
      backState={isFromRoomOverview ? undefined : { isops: true }}
    >
      <Form></Form>
    </PageLayout>
  );
}
