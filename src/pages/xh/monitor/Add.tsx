import React from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import Form from './Form/index';
import View from './Form/view';
import Monitor from './Form/monitorV2';

export default function () {
  
  const location = useLocation();
  const params=new URLSearchParams(location.search);  
  const type = params.get('type');
  const backPath =
    type === 'asset' ? '/xh/monitor' : type === 'monitor' ? '/xh/assetmgt' : undefined;
  const backState = backPath ? { isops: true } : undefined;

  return (
    <PageLayout
      title={'监控指标'}
      showBack
      {...(backPath ? { backPath, backState } : {})}
    >
      {params.get('type')=="asset" && (
          <Form initialValues={{}}  initParams={{}} disabled={params.get('action') == "view" ? true : false}></Form>
      )}
      {params.get('type')=="monitor" && (
          <Monitor></Monitor>
      )} 
    </PageLayout>
  );
}
