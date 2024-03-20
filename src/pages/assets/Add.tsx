import React from 'react';
import { useTranslation } from 'react-i18next';

import PageLayout from '@/components/pageLayout';

import Form from './Form';

export default function () {
  const { t } = useTranslation('assets');

  return (
    <PageLayout title={t('title')} showBack>
      <Form initialValues={{}} initParams={{}}></Form>
    </PageLayout>
  );
}
