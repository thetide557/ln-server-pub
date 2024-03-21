import React, { useState, useRef, useEffect, useContext, memo } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useInterval } from 'ahooks';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { message } from 'antd';
import { IRawTimeRange, getDefaultValue, isValid } from '@/components/TimeRangePicker';
import { Dashboard } from '@/store/dashboardInterface';
import { getDashboard, updateDashboardConfigs, getDashboardPure, getBuiltinDashboard } from '@/services/dashboardV2';
import { CommonStateContext } from '@/App';
import { useSearchParam, useWindowSize } from 'react-use';
import '../dashboard/Detail/style.less';
import '../dashboard/Detail/dark.antd.less';
import '../dashboard/Detail/dark.less';
import { useGlobalState } from '../dashboard/globalState';
import { IVariable } from '../dashboard/VariableConfig';
import { JSONParse } from '../dashboard/utils';
import BoardTitle from '../dashboard/Detail/BoardTitle';
import Renderer from '../dashboard/Renderer/Renderer';

interface IProps {
  id: string;
  builtinParams?: any;
  onLoaded?: (dashboard: Dashboard['configs']) => boolean;
  panel: any;
}

export const dashboardTimeCacheKey = 'dashboard-timeRangePicker-value';
const fetchDashboard = ({ id, builtinParams }) => {
  if (builtinParams) {
    return getBuiltinDashboard(builtinParams);
  }
  return getDashboard(id);
};
/**
 * 获取默认的时间范围
 * 1. 优先使用 URL 中的 __from 和 __to，如果不合法则使用默认值
 * 2. 如果 URL 中没有 __from 和 __to，则使用缓存中的值
 * 3. 如果缓存中没有值，则使用默认值
 */
// TODO: 如果 URL 的 __from 和 __to 不合法就弹出提示，这里临时设置成只能弹出一次
message.config({
  maxCount: 1,
});
export const getDefaultTimeRange = (query, t) => {
  if (query.__from && query.__to) {
    if (isValid(query.__from) && isValid(query.__to)) {
      return {
        start: query.__from,
        end: query.__to,
      };
    }
    if (moment(_.toNumber(query.__from)).isValid() && moment(_.toNumber(query.__to)).isValid()) {
      return {
        start: moment(_.toNumber(query.__from)),
        end: moment(_.toNumber(query.__to)),
      };
    }
    message.error(t('detail.invalidTimeRange'));
    return getDefaultValue(dashboardTimeCacheKey, {
      start: 'now-1h',
      end: 'now',
    });
  }
  return getDefaultValue(dashboardTimeCacheKey, {
    start: 'now-1h',
    end: 'now',
  });
};

const Board = (props: IProps) => {
  const { id, builtinParams, panel } = props;
  const { t, i18n } = useTranslation('dashboard');
  const query = queryString.parse(useLocation().search);
  const refreshRef = useRef<{ closeRefresh: Function }>();
  const [dashboard, setDashboard] = useState<Dashboard>({} as Dashboard);
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();
  const [panels, setPanels] = useState<any[]>([]);
  const [range, setRange] = useState<IRawTimeRange>(getDefaultTimeRange(query, t));
  const [editable, setEditable] = useState(true);
  const size = useWindowSize()

  let updateAtRef = useRef<number>();

  const themeMode = useSearchParam('themeMode');

  const refresh = async (cbk?: () => void) => {
    fetchDashboard({
      id,
      builtinParams,
    }).then((res) => {
      updateAtRef.current = res.update_at;
      const configs = _.isString(res.configs) ? JSONParse(res.configs) : res.configs;
      if (props.onLoaded && !props.onLoaded(configs)) {
        return;
      }
      setDashboard({
        ...res,
        configs,
      });
      if (configs) {
        // TODO: configs 中可能没有 var 属性会导致 VariableConfig 报错
        const variableConfig = configs.var
          ? configs
          : {
            ...configs,
            var: [],
          };
        setVariableConfig(
          _.map(variableConfig.var, (item) => {
            return _.omit(item, 'options'); // 兼容性代码，去除掉已保存的 options
          }) as IVariable[],
        );
        if (cbk) {
          cbk();
        }
      }
    });
  };

  const handleUpdateDashboardConfigs = (id, configs) => {
    updateDashboardConfigs(id, configs).then((res) => {
      updateAtRef.current = res.update_at;
      refresh();
    });
  };

  const handleVariableChange = (value, b, valueWithOptions) => {
    const dashboardConfigs: any = dashboard.configs;
    dashboardConfigs.var = value;
    // 更新变量配置
    b && handleUpdateDashboardConfigs(dashboard.id, { configs: JSON.stringify(dashboardConfigs) });
  };

  const handlePanelChange = (ids: any[]) => {
    panels.map((p) => {
      p.hidden = !ids.includes(p.id);
    });
    setPanels([...panels]);
  };
  const stopAutoRefresh = () => {
    refreshRef.current?.closeRefresh();
  };

  useEffect(() => {
    if (id && panel) {
      refresh();
    }
  }, [id, panel]);

  useInterval(() => {
    if (import.meta.env.PROD && dashboard.id) {
      getDashboardPure(_.toString(dashboard.id)).then((res) => {
        if (updateAtRef.current && res.update_at > updateAtRef.current) {
          if (editable) setEditable(false);
        } else {
          setEditable(true);
        }
      });
    }
  }, 2000);

  return (
    <div style={{ height: size.height * 0.6 }}>
      <BoardTitle
        dashboard={dashboard}
        range={range}
        setRange={(v) => {
          setRange(v);
        }}
        id={id}
        handleVariableChange={handleVariableChange}
        stopAutoRefresh={stopAutoRefresh}
        variableConfig={variableConfig}
        handlePanelChange={handlePanelChange}
      />
      <Renderer
        isPreview={true}
        themeMode={themeMode as 'dark'}
        dashboardId={_.toString(dashboard.id)}
        id={panel.id}
        time={range}
        values={panel}
        variableConfig={variableConfig}
        isHome={true}
      />
    </div>
  );
};

export default memo(Board);
