import PageLayout from '@/components/pageLayout';
import { getAsset } from '@/services/assets';
import { update } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Form from './Form';

export default function () {
  const { t } = useTranslation('assets');
  const { id } = useParams<{ id: string }>();
  const [initVal, setInitVal] = useState({});
  const [initParams, setInitParams] = useState({});

  useEffect(() => {
    getAsset(id).then((res) => {
      setInitVal(res.dat);
      if(res.dat.params) {
        setInitParams(JSON.parse(res.dat.params))
      }
    });
  }, []);

  return (
    <PageLayout title={t('title')} showBack>
      <Form initialValues={initVal} initParams={initParams} mode='edit'></Form>
    </PageLayout>
  );
}
