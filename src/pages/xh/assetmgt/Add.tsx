import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import queryString from 'query-string';
import Form from './Form';

export default function () {
  const { t } = useTranslation('assets');

  const { search } = useLocation();
  const { mode } = queryString.parse(search);
  const [id, setId] = useState(queryString.parse(search)['id']);


  return (
    <PageLayout title={id!=null?(mode=="view"?'资产信息查看':'资产信息修改'):'资产信息新增'} showBack>
      <Form></Form>
    </PageLayout>
  );
}
