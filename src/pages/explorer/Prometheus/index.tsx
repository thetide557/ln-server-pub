import React, { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import moment from 'moment';
import _ from 'lodash';
import { FormInstance } from 'antd/lib/form/Form';
import { useTranslation } from 'react-i18next';
import PromGraph from '@/components/PromGraphCpt';
import { IRawTimeRange, timeRangeUnix, isMathString } from '@/components/TimeRangePicker';
import { AiButton } from '@/components/AiChatNG/FlashAiButton';
import { buildPageFrom, getExplorerPrompts } from '@/components/AiChatNG/recommend';
import { queryStringOptions } from '../constants';

type IMode = 'table' | 'graph';
interface IProps {
  headerExtra: HTMLDivElement | null;
  datasourceValue: number;
  form: FormInstance;
}

export default function Prometheus(props: IProps) {
  const { headerExtra, datasourceValue, form } = props;
  const { i18n } = useTranslation();
  // 第六步：AI 浮窗生成 PromQL 后回填到查询框；seq 递增用来触发 PromGraph 里的 effect
  const [fillPromQL, setFillPromQL] = useState<{ value: string; seq: number }>();
  const history = useHistory();
  const { search } = useLocation();
  const query = queryString.parse(search, queryStringOptions);
  const defaultPromQL = _.isString(query.prom_ql) ? query.prom_ql : '';
  
  let defaultTime: undefined | IRawTimeRange;

  if (typeof query.start === 'string' && typeof query.end === 'string') {
    defaultTime = {
      start: isMathString(query.start) ? query.start : moment.unix(_.toNumber(query.start)),
      end: isMathString(query.end) ? query.end : moment.unix(_.toNumber(query.end)),
    };
  }

  return (
    <PromGraph
      type={query.mode as IMode}
      defaultTime={defaultTime}
      onTimeChange={(newRange) => {
        let { start, end } = newRange;
        if (moment.isMoment(start) && moment.isMoment(end)) {
          const parsedRange = timeRangeUnix(newRange);
          start = parsedRange.start as any;
          end = parsedRange.end as any;
        }
        history.replace({
          pathname: '/metric/explorer',
          search: queryString.stringify({ ...query, start, end }),
        });
      }}
      promQL={defaultPromQL as any}
      datasourceValue={datasourceValue}
      graphOperates={{ enabled: true }}
      globalOperates={{ enabled: true }}
      headerExtra={headerExtra}
      executeQuery={() => {
        form.validateFields();
      }}
      fillPromQL={fillPromQL}
      extra={
        <AiButton
          queryPageFrom={buildPageFrom({ param: { datasource_type: 'prometheus', datasource_id: datasourceValue } })}
          queryAction={{ key: 'query_generator', param: { datasource_type: 'prometheus', datasource_id: datasourceValue } }}
          promptList={getExplorerPrompts(i18n.language)}
          onExecuteQueryForQueryContent={(nextPromql) => {
            setFillPromQL((prev) => ({ value: nextPromql, seq: (prev?.seq ?? 0) + 1 }));
          }}
        />
      }
    />
  );
}
