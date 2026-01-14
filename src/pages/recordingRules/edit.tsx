import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getRecordingRule } from '@/services/recording';
import { useQuery } from '@/utils';
import OperateForm from './components/operateForm';
import './index.less';

const StrategyEdit: React.FC = () => {
  const { t } = useTranslation('recordingRules');
  const query = useQuery();
  const isClone = query.get('mode');
  const isEdit = query.get('edit');
  const params: any = useParams();
  const strategyId = useMemo(() => {
    return params.id;
  }, [params]);
  const [curStrategy, setCurStrategy] = useState<any>({});
  useEffect(() => {
    getStrategy();
    return () => {};
  }, [strategyId]);

  const getStrategy = async () => {
    const res = await getRecordingRule(strategyId);
    if (isClone) {
      res.dat.name = '';
    }
    setCurStrategy(res.dat || {});
  };

  return (
    <PageLayout title={t('title')} showBack>
      {curStrategy.id && <OperateForm detail={curStrategy} type={!isClone ? 1 : 2} isEdit={isEdit ? true : false} />}
    </PageLayout>
  );
};

export default StrategyEdit;
