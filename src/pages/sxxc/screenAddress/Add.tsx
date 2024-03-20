import { message } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { createApiService } from '@/services/api_service';

import { ApiServiceType } from './';
import Form from './Form';

export default () => {
  const history = useHistory();

  const saveData = (val: ApiServiceType) => {
    createApiService(val).then(() => {
      message.success('添加成功');
      history.goBack();
    });
  };

  return <Form title='接口管理-新增' onFinish={(val) => saveData(val)}></Form>;
};
