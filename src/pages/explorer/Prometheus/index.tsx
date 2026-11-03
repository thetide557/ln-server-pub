import React, { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import moment from 'moment';
import _ from 'lodash';
import { FormInstance } from 'antd/lib/form/Form';
import PromGraph from '@/components/PromGraphCpt';
import { IRawTimeRange, timeRangeUnix, isMathString } from '@/components/TimeRangePicker';
import { queryStringOptions } from '../constants';
import { usePrometheusAiDock } from './aiDock';

type IMode = 'table' | 'graph';
interface IProps {
  headerExtra: HTMLDivElement | null;
  datasourceValue: number;
  form: FormInstance;
}

export default function Prometheus(props: IProps) {
  const { headerExtra, datasourceValue, form } = props;
  // 第六步：AI 浮窗生成 PromQL 后回填到查询框；seq 递增用来触发 PromGraph 里的 effect。
  // N36 批 E：这条路留给「停靠栏开关关着」的时候用——那时 `ai.chatButton` 就是原来那个浮窗按钮。
  // 开关开着时浮窗按钮不渲染，停靠栏改走 control 的 `fill()`（直接写 PromGraph 的 state），
  // 两条路互不相干，见 `n36/改动清单-E.md`。
  const [fillPromQL, setFillPromQL] = useState<{ value: string; seq: number }>();
  const ai = usePrometheusAiDock({
    datasourceValue,
    // 上游这里是「用户伸手找 AI = 已接管，体检落地横幅让位」（`ProbeBanner`）。
    // 羚牛这一页没有那个横幅，所以没有要收起来的东西，留一个空实现。
    onTakeOver: () => {},
    onQuery: (nextPromql) => {
      setFillPromQL((prev) => ({ value: nextPromql, seq: (prev?.seq ?? 0) + 1 }));
    },
  });
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
      controlRef={ai.controlRef}
      onUserContextChange={ai.onUserContextChange}
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
      queryExtra={ai.trigger}
      noticeBanner={ai.dock}
      extra={ai.chatButton}
    />
  );
}
