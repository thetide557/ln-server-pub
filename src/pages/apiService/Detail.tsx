import { getApiService } from '@/services/api_service';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiServiceType } from '.';
import Form from './Form';

export default () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApiServiceType>();

  useEffect(() => {
    getApiService(id).then((res) => {
      setData(res.dat);
    });
  }, [id]);

  return <Form title='接口管理-详情' initialValues={data} disabled></Form>;
};
