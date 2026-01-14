// import { getApiService } from '@/services/api_service';
import { getScreenById } from '@/services/sxxc/bigScreen';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiServiceType } from '.';
import Form from './Form';

export default () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiServiceType>();

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

  return <Form title='大屏配置-详情' initialValues={data} disabled></Form>;
};
