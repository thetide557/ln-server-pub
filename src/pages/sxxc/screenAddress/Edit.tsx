// import { getApiService, updateApiService } from '@/services/api_service';
import { getScreenById, editBigScreen } from '@/services/sxxc/bigScreen';
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
    getScreenById(id).then((res) => {
      setData(res.dat);
    });
  }, [id]);

  const saveData = (val: ApiServiceType) => {
    editBigScreen(val).then(res => {
        message.success('修改成功');
        history.goBack();
    });
  };

  return <Form title='大屏配置-编辑' initialValues={data} onFinish={saveData}></Form>;
};
