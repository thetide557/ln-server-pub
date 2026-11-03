/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import _ from 'lodash';
import moment from 'moment';
import semver from 'semver';
import { useTranslation } from 'react-i18next';
import { useInterval, useLocalStorageState } from 'ahooks';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Alert, Modal, Button, message } from 'antd';
import PageLayout from '@/components/pageLayout';
import { IRawTimeRange, getDefaultValue, isValid } from '@/components/TimeRangePicker';
import { Dashboard } from '@/store/dashboardInterface';
import { getDashboard, updateDashboardConfigs, getDashboardPure, getBuiltinDashboard } from '@/services/dashboardV2';
import { SetTmpChartData } from '@/services/metric';
import { CommonStateContext } from '@/App';
import MigrationModal from '@/pages/help/migrate/MigrationModal';
import VariableConfig, { IVariable } from '../VariableConfig';
import { replaceExpressionVars } from '../VariableConfig/constant';
import { ILink } from '../types';
import DashboardLinks from '../DashboardLinks';
import Panels from '../Panels';
import Title from './Title';
import { JSONParse } from '../utils';
import Editor from '../Editor';
import { defaultCustomValuesMap, defaultOptionsValuesMap } from '../Editor/config';
import { sortPanelsByGridLayout, panelsMergeToConfigs, updatePanelsInsertNewPanelToGlobal } from '../Panels/utils';
import { useGlobalState } from '../globalState';
// 2026-10-07 N34-var：把看板变量与时间范围写进 Variables 垫片的全局状态，新套 replaceTemplateVariables
// 靠它替换面板 SQL / ES filter 里的 ${var}。语义照 fe v9.1.0 Detail/Detail.tsx:97-98,266-282。
import { setGlobalState as setVariablesGlobalState, toVariablesWithOptions } from '../Variables/utils/n9eShim';
import './style.less';
import './dark.antd.less';
import './dark.less';

interface URLParam {
  id: string;
}

interface IProps {
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
const builtinParamsToID = (builtinParams) => {
  return `${builtinParams['__built-in-cate']}_${builtinParams['__built-in-name']}`;
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
const getDefaultTimeRange = (query, t) => {
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

export default function DetailV2(props: IProps) {
  const { isPreview = false, isBuiltin = false, gobackPath, builtinParams, isHome = false } = props;
  const { t, i18n } = useTranslation('dashboard');
  const history = useHistory();
  const { datasourceList, profile } = useContext(CommonStateContext);
  const roles = _.get(profile, 'roles', []);
  const isAuthorized = !_.some(roles, (item) => item === 'Guest') && !isPreview;
  const [dashboardMeta, setDashboardMeta] = useGlobalState('dashboardMeta');
  let { id } = useParams<URLParam>();

  if (isHome) {
    // N36-B：board_id 为 0 时 _.toString(0) 是字符串 '0'、是真值，`|| '1'` 兜不住，会拼出 GET /api/n9e/board/0 → 后端 404
    //（A13 OBS-T5-4，证据 `10-T510-standard-login.txt:142`，404 ×3）。这里改成只认大于 0 的 board_id，其余一律回落到默认首页看板 1。
    id = profile.board_id ? _.toString(profile.board_id) : '1';
  }
  const query = queryString.parse(useLocation().search);
  if (isBuiltin) {
    id = builtinParamsToID(query);
  }
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
      // 2026-10-07 N34-var：同步进垫片存储（fe v9.1.0 这里是 setVariablesWithOptions(newValue)）。
      // 老套变量对象的 options 是 string[]，新套要 { label, value }[]，过一道 toVariablesWithOptions。
      setVariablesGlobalState('variablesWithOptions', toVariablesWithOptions(valueWithOptions));
    }
  };
  const stopAutoRefresh = () => {
    refreshRef.current?.closeRefresh();
  };
  const handlePanelChange = (ids: any[]) => {
    const newPanels = panels.map((p) => {
      p.hidden = !ids.includes(p.id);
      return p;
    });
    setPanels(newPanels);
    handleUpdateDashboardConfigs(dashboard.id, {
      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
    });
  };

  // 2026-10-07 N34-var：时间范围变化时同步进垫片存储（照 fe v9.1.0 Detail/Detail.tsx:266-268）。
  // 面板取数时各数据源会把 range 显式传给 replaceTemplateVariables，这里写的是没显式传时的兜底值。
  useEffect(() => {
    setVariablesGlobalState('range', range);
  }, [range]);

  useEffect(() => {
    // 2026-10-07 N34-var：切换仪表盘时先清空变量，免得用上一个仪表盘的变量值（照 fe v9.1.0
    // Detail/Detail.tsx:270-282）；组件卸载时同样清空。
    setVariablesGlobalState('variablesWithOptions', []);
    refresh();
    return () => {
      setVariablesGlobalState('variablesWithOptions', []);
    };
  }, [id]);

  /*
   * 2026-10-05 N16 todo②（用户 M229 ④）：羚牛自研轮询（fe v9.1.0 与最新均无）；后端免登录入口对私有看板一律 403
   * （router_board.go:121-122），.then() 从不执行、editable 从未被它改过；注释掉以免每 2 秒刷一条 403。
   * 保留不删，便于将来公开看板需要时恢复。
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
  */

  useEffect(() => {
    if (profile?.roles?.includes("Admin")) return;
    const hasReminded = localStorage.getItem('password_expiry_reminded');
    if (!hasReminded && profile?.password_valid_days && profile?.password_valid_days < 8) {
      localStorage.setItem('password_expiry_reminded', 'true');
      Modal.warning({
        title: '密码有效期提醒',
        content: `密码即将过期，请及时更新！`,
        okType: 'primary',
        okText: '确定'
      });
    }
  }, []);

  return (
    <PageLayout
      customArea={
        <Title
          isPreview={isPreview}
          isBuiltin={isBuiltin}
          isHome={isHome}
          isAuthorized={isAuthorized}
          gobackPath={gobackPath}
          dashboard={dashboard}
          range={range}
          setRange={(v) => {
            setRange(v);
          }}
          onAddPanel={(type) => {
            if (type === 'row') {
              const newPanels = updatePanelsInsertNewPanelToGlobal(
                panels,
                {
                  type: 'row',
                  id: uuidv4(),
                  name: i18n.language === 'en_US' ? 'Row' : '分组',
                  collapsed: true,
                },
                'row',
              );
              setPanels(newPanels);
              handleUpdateDashboardConfigs(dashboard.id, {
                configs: panelsMergeToConfigs(dashboard.configs, newPanels),
              });
            } else {
              setEditorData({
                visible: true,
                id: uuidv4(),
                initialValues: {
                  name: '面板标题',
                  type,
                  targets: [
                    {
                      refId: 'A',
                      expr: '',
                    },
                  ],
                  custom: defaultCustomValuesMap[type],
                  options: defaultOptionsValuesMap[type],
                },
              });
            }
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
          {!editable && (
            <div style={{ padding: '5px 10px' }}>
              <Alert type='warning' message='仪表盘已经被别人修改，为避免相互覆盖，请刷新仪表盘查看最新配置和数据' />
            </div>
          )}
          {variableConfigWithOptions && (
            <Panels
              dashboardId={id}
              isPreview={isPreview}
              isHome={isHome}
              editable={editable}
              panels={panels}
              setPanels={setPanels}
              dashboard={dashboard}
              range={range}
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
    </PageLayout>
  );
}
