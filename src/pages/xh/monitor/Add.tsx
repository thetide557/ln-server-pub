import React from 'react';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import Form from './Form/index';
import View from './Form/view';
import Monitor from './Form/monitorV2';

export default function () {
  
  const location = useLocation();
  const params=new URLSearchParams(location.search);  

  return (
    <PageLayout title={'监控管理'} showBack>
      {params.get('type')=="asset" && (
          <Form initialValues={{}}  initParams={{}} disabled={params.get('action') == "view" ? true : false}></Form>
      )}
      {params.get('type')=="monitor" && (
          <Monitor></Monitor>
      )} 
    </PageLayout>
  );
}
