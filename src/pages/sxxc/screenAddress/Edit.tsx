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
      const busi_group = res.dat?.busi_group.split(',').map((item:string | number) => Number(item));
      const data = {
        ...res.dat,
        busi_group,
      }
      setData(data);
    });
  }, [id]);

  const saveData = (val: ApiServiceType) => {
    const params = {
      ...val,
      busi_group: val?.busi_group.toString(),
    }
    editBigScreen(params).then(res => {
        message.success('修改成功');
        history.goBack();
    });
  };

  return <Form title='大屏配置-编辑' initialValues={data} onFinish={saveData}></Form>;
};
