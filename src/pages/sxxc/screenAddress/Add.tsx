import { message } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';

// import { createApiService } from '@/services/api_service';
import { addGroupScreen } from '@/services/sxxc/bigScreen';

import { ApiServiceType } from './';
import Form from './Form';

export default () => {
  const history = useHistory();

  const saveData = (val: ApiServiceType) => {
    console.log(val);
    addGroupScreen(val).then(res => {
      if (res.code == 200) {
        message.success('添加成功');
        history.goBack();
      }
    });
  };

  return <Form title='大屏配置-新增' onFinish={(val) => saveData(val)}></Form>;
};
