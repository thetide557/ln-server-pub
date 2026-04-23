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
// @ts-nocheck
import React, { useEffect, useState, createContext, useRef, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
// Modal 会被注入的代码所使用，请不要删除
import { ConfigProvider, notification, Modal, message, Select, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import zhCN from 'antd/lib/locale/zh_CN';
import enUS from 'antd/lib/locale/en_US';
import 'antd/dist/antd.less';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import TaskOutput from '@/pages/taskOutput';
import TaskHostOutput from '@/pages/taskOutput/host';
import { getAuthorizedDatasourceCates, Cate } from '@/components/AdvancedWrap';
import { GetProfile } from '@/services/account';
import { WebSocketURL } from './utils/constant';
import { getBusiGroups, getDatasourceBriefList, getMenuPerm } from '@/services/common';
import { getLicense } from '@/components/AdvancedWrap';
import { getVersions } from '@/components/pageLayout/Version/services';
import Content from './routers';
import { getSystemTheme } from '@/services/login';
// @ts-ignore
import useIsPlus from 'plus:/components/useIsPlus';
import './App.less';
import './global.variable.less';
import './styles/theme.less';
import TopMenu from './components/menu/topMenuXH'; //西航版本
import { useLocalStorage } from 'react-use';
import { getAlertEventsById } from '@/services/warning';
import AiRobotSse from '@/pages/sxxc/aiRobot/sse';
import WarnModal from '@/pages/sxxc/warnModal';
import { ThemeProvider, useTheme } from '@/store/theme';
interface IProfile {
  admin?: boolean;
  nickname: string;
  role: string;
  roles: string[];
  username: string;
  email: string;
  phone: string;
  id: number;
  portrait: string;
  contacts: { string?: string };
  board_id: number;
  temp_remaining_days?: number;
  password_valid_days?: number;
}

interface Datasource {
  id: number;
  name: string;
  plugin_type: string;
}

export interface ICommonState {
  datasourceCateOptions: Cate[];
  groupedDatasourceList: {
    [index: string]: Datasource[];
  };
  datasourceList: Datasource[];
  setDatasourceList: (list: Datasource[]) => void;
  busiGroups: {
    name: string;
    id: number;
    label_value?: string;
  }[];
  setBusiGroups: (groups: { name: string; id: number; label_value?: string }[]) => void;
  curBusiId: number;
  permList: string[],
  setPermList: ([]) => void;
  organizationId: number;
  queryCondition: string;
  setCurBusiId: (id: number) => void;
  setOrganizationId: (id: number) => void;
  setQueryCondition: (queryCondition: string) => void;
  profile: IProfile;
  setProfile: (profile: IProfile) => void;
  licenseRulesRemaining?: number;
  licenseExpireDays?: number;
  licenseExpired: boolean;
  versions: {
    version: string;
    github_verison: string;
    newVersion: boolean;
  };
  feats?: {
    fcBrain: boolean;
    plugins: any[];
  };
  isPlus: boolean;
}

export const initTheme = {
  title: '一体化综合运维管理平台',
  logo: '/image/topmenu/favicon.png',
  icon: '/image/plticon.png',
}
// 可以匿名访问的路由 TODO: job-task output 应该也可以匿名访问
const anonymousRoutes = ['/login', '/callback', '/chart', '/dashboards/share/'];
// 判断是否是匿名访问的路由
const anonymous = _.some(anonymousRoutes, (route) => window.location.pathname.startsWith(route));
// 初始化数据 context
export const CommonStateContext = createContext({} as ICommonState);

var link: any = document.querySelector('link[rel*="icon"]');

function App() {
  const { t, i18n } = useTranslation();
  const isPlus = useIsPlus();
  const initialized = useRef(false);
  const path = window.location.pathname;
  const alertWebsocket = useRef<WebSocket | null>(null);
  const licenseWebsocket = useRef<WebSocket | null>(null);
  const audioRef = useRef<any>(null);
  const [dialogShow, setDialogShow] = useState<string>(_.toString(localStorage.getItem('alert_dialog_show') || '0'));
  const [alertLevel, setAlertLevel] = useState<number>(0);
  const [alertId, setAlertId] = useState<number>(0);
  const [warnModalShow, setWarnModalShow] = useState<boolean>(false)

  const setPageTitle = (newTitle) => {
    document.title = newTitle;
  };

  const [theme, setTheme] = useLocalStorage("platform_theme", initTheme);
  const [commonState, setCommonState] = useState<ICommonState>({
    datasourceCateOptions: [],
    groupedDatasourceList: {},
    datasourceList: [],
    setDatasourceList: (datasourceList) => {
      setCommonState((state) => ({
        ...state,
        datasourceList,
        groupedDatasourceList: _.groupBy(datasourceList, 'plugin_type') as {
          [index: string]: {
            name: string;
            id: number;
            plugin_type: string;
          }[];
        },
      }));
    },
    permList: [],
    setPermList: (permList) => {
      setCommonState((state: any) => ({ ...state, permList }));
    },
    busiGroups: [],
    setBusiGroups: (busiGroups) => {
      setCommonState((state) => ({ ...state, busiGroups }));
    },
    curBusiId: window.localStorage.getItem('curBusiId') ? Number(window.localStorage.getItem('curBusiId')) : 0,

    setCurBusiId: (id: number) => {
      window.localStorage.setItem('curBusiId', String(id));
      setCommonState((state) => ({ ...state, curBusiId: id }));
    },
    organizationId: window.localStorage.getItem('organizationId') ? Number(window.localStorage.getItem('organizationId')) : 0,

    setOrganizationId: (id: number) => {
      window.localStorage.setItem('organizationId', String(id));
      setCommonState((state) => ({ ...state, organizationId: id }));
    },
    queryCondition: window.localStorage.getItem('queryCondition') as string,
    setQueryCondition: (condition: string) => {
      window.localStorage.setItem('queryCondition', condition);
      setCommonState((state) => ({ ...state, queryCondition: condition }));
    },
    profile: {} as IProfile,
    setProfile: (profile: IProfile) => {
      setCommonState((state) => ({ ...state, profile }));
    },
    licenseExpired: false,
    versions: {
      version: '',
      github_verison: '',
      newVersion: false,
    },
    isPlus,
  });

  // 右下角告警
  const handleClick = () => {
    // console.log('点击了', location.pathname);

    if (window.location.pathname != '/screenView') {
      setWarnModalShow(false)
      getAlertEventsById(alertId)
        .then((res) => {
          window.location.href = '/alert-cur-events/' + alertId;
        }).catch(_ => {
          setDialogShow('0')
        })
    } else {
      setTimeout(() => {
        setDialogShow('0')
      }, 200);
      setWarnModalShow(true)
    }
  }

  useLayoutEffect(() => {
    // console.log('anonymous', anonymous);
    alertWebsocket.current = new WebSocket(WebSocketURL + 232443);//获取推送过来的告警消息
    alertWebsocket.current.onmessage = e => {
      if (!anonymous) {
        const busiGroups = localStorage.getItem('groupIds')?.split(',').map(id => Number(id));
        let data = JSON.parse(e.data);
        if (busiGroups?.includes(data.dat[0].group_id)) {
          // setWarnModalShow(false)
          message.error("有设备发生告警信息")
          if (audioRef?.current) {
            audioRef?.current.play();
          }
          setAlertLevel(data.dat[0].severity);
          setAlertId(data.dat[0].id);
          setDialogShow('1');
        }
      }
    };
    return () => {
      alertWebsocket.current?.close();
    };
  }, [alertWebsocket]);

  useLayoutEffect(() => {
    let flag = true
    licenseWebsocket.current = new WebSocket(WebSocketURL + 758493);//获取推送过来的许可到期的消息
    licenseWebsocket.current.onmessage = e => {
      if (!anonymous && flag) {
        let data = JSON.parse(e.data);
        Modal.warning({
          title: '许可信息提醒',
          content: data.dat,
          keyboard: false,
          okButtonProps: { type: 'default', disabled: true }
        });
        flag = false
      }
    };
    return () => {
      licenseWebsocket.current?.close();
    };
  }, [licenseWebsocket]);

  useEffect(() => {
    getSystemTheme().then((res) => {
      if (res.dat) {
        setTheme({
          title: res.dat.login_title,
          icon: res.dat.logo_title,
          logo: res.dat.logo_top,
        });
      }
    });
    link.href = theme?.icon;
    setPageTitle(theme?.title);
    try {
      (async () => {
        // 非匿名访问，需要初始化一些公共数据
        if (!anonymous) {
          const { dat: profile } = await GetProfile();
          // console.log('profile', profile);
          // 存储用户id
          localStorage.setItem('userId', profile?.id)
          const { dat: busiGroups } = await getBusiGroups();
          let groupIds = ''
          if (busiGroups.length > 0) {
            groupIds = busiGroups.map(item => item.id).toString()
          }
          localStorage.setItem('groupIds', groupIds)


          const { dat: permList } = await getMenuPerm()
          const datasourceList = await getDatasourceBriefList();
          const { licenseRulesRemaining, licenseExpireDays, feats } = await getLicense(t);
          let versions = { version: '', github_verison: '', newVersion: false };
          if (!isPlus) {
            versions = await getVersions();
          }
          const defaultBusiId = commonState.curBusiId || busiGroups?.[0]?.id;
          const defaultOrganizationId = commonState.organizationId || 0;
          const queryCondition = commonState.queryCondition || '';
          window.localStorage.setItem('curBusiId', String(defaultBusiId));
          window.localStorage.setItem('organizationId', String(defaultOrganizationId));
          window.localStorage.setItem('queryCondition', queryCondition);
          initialized.current = true;
          setCommonState((state) => {
            return {
              ...state,
              profile,
              busiGroups,
              permList,
              datasourceCateOptions: getAuthorizedDatasourceCates(feats, isPlus),
              groupedDatasourceList: _.groupBy(datasourceList, 'plugin_type'),
              datasourceList: datasourceList,
              curBusiId: defaultBusiId,
              organizationId: defaultOrganizationId,
              queryCondition: queryCondition,
              licenseRulesRemaining,
              licenseExpireDays,
              licenseExpired: licenseExpireDays !== undefined && licenseExpireDays <= 0,
              versions,
              feats,
            };
          });
          if (_.isEmpty(datasourceList) && !_.startsWith(window.location.pathname, '/help/source')) {
            Modal.warning({
              title: t('common:datasource.empty_modal.title'),
              okText: _.includes(profile.roles, 'Admin') ? t('common:datasource.empty_modal.btn1') : t('common:datasource.empty_modal.btn2'),
              onOk: () => {
                if (_.includes(profile.roles, 'Admin')) {
                  // history.pushState(null, '', '/help/source');
                  window.location.reload();
                }
              },
            });
          }
        } else {
          // const datasourceList = await getDatasourceBriefList();
          initialized.current = true;
          setCommonState((state) => {
            return {
              ...state,
              // groupedDatasourceList: _.groupBy(datasourceList, 'plugin_type'),
              // datasourceList: datasourceList,
            };
          });
        }
      })();
    } catch (error) {
      console.error(error);
    }
  }, []);

  // 初始化中不渲染任何内容
  if (!initialized.current) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppWrapper dialogShow={dialogShow} alertLevel={alertLevel} alertId={alertId} warnModalShow={warnModalShow} setWarnModalShow={setWarnModalShow} setDialogShow={setDialogShow} handleClick={handleClick} commonState={commonState} path={path} audioRef={audioRef} i18n={i18n} />
    </ThemeProvider>
  );
}

function AppWrapper({ i18n, dialogShow, alertLevel, alertId, warnModalShow, setWarnModalShow, setDialogShow, handleClick, commonState, path, audioRef }: any) {
  const { themeType } = useTheme();

  return (
    <div className={`App theme-${themeType}`} style={path.startsWith('/login') ? { overflow: 'hidden' } : { overflow: 'auto' }}>
      <audio ref={audioRef} src='/music/y2168.mp3' />
      <CommonStateContext.Provider value={commonState}>
        <ConfigProvider locale={i18n.language == 'en_US' ? enUS : zhCN}>
          <Router>
            <Switch>
              <Route exact path='/job-task/:busiId/output/:taskId/:outputType' component={TaskOutput} />
              <Route exact path='/job-task/:busiId/output/:taskId/:host/:outputType' component={TaskHostOutput} />
              <>
                <TopMenu></TopMenu>
                <AiRobotSse />
                <div className='content-box'>
                  <Content />
                </div>
              </>
            </Switch>
          </Router>
        </ConfigProvider>
      </CommonStateContext.Provider>

      <div className='special_alert_dialog' style={dialogShow == '0' ? { display: 'none' } : { display: 'block' }}>
        <div className='close_button'>
          <p>告警提醒</p>
          <span
            onClick={() => {
              setDialogShow('0');
            }}
          >
            X
          </span>
        </div>
        <div className='alert_content'>
          <div className='level'>{alertLevel == 1 ? '紧急' : alertLevel == 2 ? '重要' : alertLevel == 3 ? '一般' : ''}</div>
          <div
            className='detail'
            onClick={handleClick}
          >
            查看详情
          </div>
        </div>
      </div>

      {/* 大屏告警弹窗 */}
      {warnModalShow && <WarnModal alertId={alertId} visible={warnModalShow} onClose={() => setWarnModalShow(false)} />}

    </div>
  );
}

export default App;
