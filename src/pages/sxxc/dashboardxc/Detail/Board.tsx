import React, { useState, useRef, useEffect, useContext, memo } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useInterval } from 'ahooks';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Button, message, Modal } from 'antd';
import PageLayout from '@/components/pageLayout';
import { IRawTimeRange, getDefaultValue, isValid } from '@/components/TimeRangePicker';
import { Dashboard } from '@/store/dashboardInterface';
import { getDashboard, updateDashboardConfigs, getDashboardPure, getBuiltinDashboard } from '@/services/dashboardV2';
import { SetTmpChartData } from '@/services/metric';
import { CommonStateContext } from '@/App';
import { IVariable } from '../VariableConfig';
import { replaceExpressionVars } from '../VariableConfig/constant';
import { ILink } from '../types';
import Panels from '../Panels';
import BoardTitle from './BoardTitle';
import { JSONParse } from '../utils';
import Editor from '../Editor';
import { sortPanelsByGridLayout, panelsMergeToConfigs, updatePanelsInsertNewPanelToGlobal } from '../Panels/utils';
import { useGlobalState } from '../globalState';
import Renderer from '../Renderer/Renderer';
import { useSearchParam, useWindowSize } from 'react-use';
import './style.less';
import './dark.antd.less';
import './dark.less';
import Chart from '@/pages/chart/chart';

interface IProps {
  id: string;
  isPreview?: boolean;
  isBuiltin?: boolean;
  gobackPath?: string;
  builtinParams?: any;
  isHome?: boolean;
  onLoaded?: (dashboard: Dashboard['configs']) => boolean;
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
    // YiTiHuaSystem-628 需求默认1小时
    // return getDefaultValue(dashboardTimeCacheKey, {
    //   start: 'now-1h',
    //   end: 'now',
    // });
    return {
      start: 'now-1h',
      end: 'now'
    }
  }
  // YiTiHuaSystem-628 需求默认1小时
  // return getDefaultValue(dashboardTimeCacheKey, {
  //   start: 'now-1h',
  //   end: 'now',
  // });
  return {
    start: 'now-1h',
    end: 'now'
  }
};

const Board = (props: IProps) => {
  const { id, isPreview = true, isBuiltin = false, gobackPath, builtinParams, isHome = false } = props;
  const { t, i18n } = useTranslation('dashboard');
  const { datasourceList, profile } = useContext(CommonStateContext);
  const roles = _.get(profile, 'roles', []);
  const [dashboardMeta, setDashboardMeta] = useGlobalState('dashboardMeta');
  const query = queryString.parse(useLocation().search);
  const refreshRef = useRef<{ closeRefresh: Function }>();
  const [dashboard, setDashboard] = useState<Dashboard>({} as Dashboard);
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();
  const [variableConfigWithOptions, setVariableConfigWithOptions] = useState<IVariable[]>();
  const [dashboardLinks, setDashboardLinks] = useState<ILink[]>();
  const [panels, setPanels] = useState<any[]>([]);
  const [range, setRange] = useState<IRawTimeRange>(getDefaultTimeRange(query, t));
  const [editable, setEditable] = useState(true);
  const [editorData, setEditorData] = useState({
    visible: false,
    id: '',
    initialValues: {} as any,
  });
  let updateAtRef = useRef<number>();
  const [fullScreen, setFullScreen] = useState<{
    visible: boolean;
    panel: any;
  }>({ visible: false, panel: {} });
  const windowSize = useWindowSize();
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
        setDashboardLinks(configs.links);
        setPanels(sortPanelsByGridLayout(configs.panels));
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
    // 更新变量配置状态
    if (valueWithOptions) {
      setVariableConfigWithOptions(valueWithOptions);
      setDashboardMeta({
        dashboardId: _.toString(id),
        variableConfigWithOptions: valueWithOptions,
      });
    }
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
    if (id !== '') {
      refresh();
    }
  }, [id]);

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
    <PageLayout
      customArea={
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
      }
    >
      <div className='dashboard-detail-container'>
        <div className='dashboard-detail-content'>
          {variableConfigWithOptions && (
            <Panels
              dashboardId={id}
              isPreview={isPreview}
              editable={editable}
              panels={panels}
              setPanels={setPanels}
              dashboard={dashboard}
              range={range}
              isHome={isHome}
              variableConfig={variableConfigWithOptions}
              onShareClick={(panel) => {
                const curDatasourceValue = replaceExpressionVars(panel.datasourceValue, variableConfigWithOptions, variableConfigWithOptions.length, id);
                const serielData = {
                  dataProps: {
                    ...panel,
                    datasourceValue: curDatasourceValue,
                    // @ts-ignore
                    datasourceName: _.find(datasourceList, { id: curDatasourceValue })?.name,
                    targets: _.map(panel.targets, (target) => {
                      const realExpr = variableConfigWithOptions
                        ? replaceExpressionVars(target.expr, variableConfigWithOptions, variableConfigWithOptions.length, id)
                        : target.expr;
                      return {
                        ...target,
                        expr: realExpr,
                      };
                    }),
                    range,
                  },
                };
                SetTmpChartData([
                  {
                    configs: JSON.stringify(serielData),
                  },
                ]).then((res) => {
                  const ids = res.dat;
                  window.open('/chart/' + ids);
                });
              }}
              onUpdated={(res) => {
                updateAtRef.current = res.update_at;
                refresh();
              }}
              onFullScreenClick={(panel) => {
                setFullScreen({
                  visible: true,
                  panel: panel,
                });
              }}
            />
          )}
        </div>
      </div>
      <Editor
        mode='add'
        visible={editorData.visible}
        setVisible={(visible) => {
          setEditorData({
            ...editorData,
            visible,
          });
        }}
        variableConfigWithOptions={variableConfigWithOptions}
        id={editorData.id}
        dashboardId={id}
        time={range}
        initialValues={editorData.initialValues}
        onOK={(values) => {
          const newPanels = updatePanelsInsertNewPanelToGlobal(panels, values, 'chart');
          setPanels(newPanels);
          handleUpdateDashboardConfigs(dashboard.id, {
            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
          });
        }}
      />
      <Modal
        visible={fullScreen?.visible}
        destroyOnClose
        footer={
          <Button
            type='primary'
            onClick={() => {
              setFullScreen({
                visible: false,
                panel: {},
              });
            }}
          >
            关闭
          </Button>
        }
        {...windowSize}
      >
        <Chart id={id} panel={fullScreen.panel}></Chart>
      </Modal>
    </PageLayout>
  );
};

export default memo(Board);
