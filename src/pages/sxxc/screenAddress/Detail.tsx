// import { getApiService } from '@/services/api_service';
import { getGroupScreenById } from '@/services/sxxc/bigScreen';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiServiceType } from '.';
import Form from './Form';

export default () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiServiceType>();

  useEffect(() => {
    getGroupScreenById(id).then((res) => {
      setData(res.data);
    });
  }, [id]);

  return <Form title='大屏配置-详情' initialValues={data} disabled></Form>;
};
