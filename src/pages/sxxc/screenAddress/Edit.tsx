// import { getApiService, updateApiService } from '@/services/api_service';
import { getGroupScreenById, editGroupScreen } from '@/services/sxxc/bigScreen';
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
    getGroupScreenById(id).then((res) => {
      setData(res.data);
    });
  }, [id]);

  const saveData = (val: ApiServiceType) => {
    editGroupScreen(val).then(res => {
      if (res.code == 200) {
        message.success('修改成功');
        history.goBack();
      }
    });
  };

  return <Form title='大屏配置-编辑' initialValues={data} onFinish={saveData}></Form>;
};
