import { getApiService, updateApiService } from '@/services/api_service';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { ApiServiceType } from '.';
import Form from './Form';

export default () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiServiceType>();
  const history = useHistory();

  useEffect(() => {
    getApiService(id).then((res) => {
      setData(res.dat);
    });
  }, [id]);

  const saveData = (val: ApiServiceType) => {
    updateApiService(val).then(() => {
      message.success('修改成功');
      history.goBack();
    });
  };

  return <Form title='接口管理-编辑' initialValues={data} onFinish={saveData}></Form>;
};
