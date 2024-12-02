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
import { ConfigProvider, notification, Modal, message, Select } from 'antd';
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
// import TopMenu from './components/menu/topMenu';
import TopMenu from './components/menu/topMenuXH'; //西航版本
import { useLocalStorage } from 'react-use';
import { getAlertEventsById, getHistoryEventsById, getWarningChart, setAlartMutes, updataprocess } from '@/pages/sxxc/screenView/alarmApi';
import AlarmChart from "@/pages/sxxc/screenView/alarmChart";

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
const anonymous = _.some(anonymousRoutes, (route) => location.pathname.startsWith(route));
// 初始化数据 context
export const CommonStateContext = createContext({} as ICommonState);

var link: any = document.querySelector('link[rel*="icon"]');

function App() {
  const { t, i18n } = useTranslation();
  const isPlus = useIsPlus();
  const initialized = useRef(false);
  const path = location.pathname;
  const alertWebsocket = useRef<WebSocket | null>(null);
  const licenseWebsocket = useRef<WebSocket | null>(null);
  const audioRef = useRef<any>(null);
  const [dialogShow, setDialogShow] = useState<string>(_.toString(localStorage.getItem('alert_dialog_show') || '0'));
  const [alertLevel, setAlertLevel] = useState<number>(0);
  const [alertId, setAlertId] = useState<number>(0);

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
      setCommonState((state) => ({ ...state, permList }));
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [curWarn, setCurWarn] = useState({})
  const [chartList, setChartList] = useState([])
  const [open1, setOpen1] = useState(false)
  const timeLensDefault = [
    {
      label: "1h",
      value: 3600,
    },
    {
      label: "2h",
      value: 7200,
    },
    {
      label: "3h",
      value: 10800,
    },
    {
      label: "6h",
      value: 21600,
    },
    {
      label: "12h",
      value: 43200,
    },
    {
      label: "1d",
      value: 86400,
    },
    {
      label: "2d",
      value: 172800,
    },
    {
      label: "3d",
      value: 259200,
    },
    {
      label: "5d",
      value: 432000,
    },
    {
      label: "7d",
      value: 604800,
    },
    {
      label: "14d",
      value: 1209600,
    },
    {
      label: "30d",
      value: 2592000,
    },
    {
      label: "60d",
      value: 5184000,
    },
    {
      label: "90d",
      value: 7776000,
    },
    {
      label: "99y",
      value: 3122064000,
    },
  ]

  // 屏蔽时长
  let time1 = 3600

  // 右下角告警
  const handleAlarm = () => {
    getAlertEventsById(alertId).then(res => {
      // console.log(1111, res.dat);
      setCurWarn(res.dat)
      const params = {
        query: res.dat.rule_config.queries[0].prom_ql,
        start: res.dat.trigger_time - 1800, // 30分之前
        end: res.dat.trigger_time + 1800, // 30分之后
        step: 15,
      };
      getWarningChart(params, res.dat.datasource_id).then((res2) => {
        setChartList(res2.data.result)
      });
    })
    setIsModalOpen(true);
  }


  const handleClick = () => {
    if (location.pathname != '/screenView') {
      location.href = '/alert-cur-events/' + alertId;
    } else {
      handleAlarm()
    }
  }

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  // 处理
  const handleDeal = () => {
    Modal.confirm({
      title: '提示',
      content: '该告警是否已被处理?',
      keyboard: false,
      className: 'handle-warn',
      centered: true,
      closable: true,
      onOk() {
        const params = {
          id: alertId
        }
        updataprocess(params).then(() => {
          message.success(t('处理成功'))
          handleAlarm()
        })
      },
      onCancel() {
        // console.log('Cancel');
      },
    });
  }

  // 屏蔽
  const handlePb = () => {
    setOpen1(true)
  }

  // 时间戳转换时间
  const convertTime = (timestamp, type) => {
    const date = new Date(parseInt(timestamp) * 1000);
    const Year = date.getFullYear();
    const Moth =
      date.getMonth() + 1 < 10
        ? "0" + (date.getMonth() + 1)
        : date.getMonth() + 1;
    const Day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    const Hour =
      date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    const Minute =
      date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    const Sechond =
      date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
    if (type == "year") {
      return `${Year}-${Moth}-${Day} ${Hour}:${Minute}:${Sechond}`;
    } else {
      return `${Hour}:${Minute}`;
    }
  }

  const handleChange = (val) => {
    // console.log(val);
    time1 = val
    // console.log(time1);
    
  }

  // 告警屏蔽
  const saveWarnig = () => {
    // console.log(111, curWarn);
      const timestamp = Math.floor(new Date().getTime() / 1000);
      let tags = [];
      if (curWarn.tags.length > 0) {
        curWarn.tags.forEach((item) => {
          let arr = item.split("=");
          tags.push({
            func: "==",
            key: arr[0],
            value: arr[1],
          });
        });
      }
      const params = {
        note: curWarn.rule_name + timestamp,
        group_id: curWarn.group_id,
        prod: curWarn.rule_prod,
        cate: curWarn.cate,
        datasource_ids: [curWarn.datasource_id],
        severities: [curWarn.severity],
        mute_time_type: 0,
        btime: timestamp,
        etime: timestamp + Number(time1),
        periodic_mutes: [
          {
            enable_days_of_week: "1 2 3 4 5 6 0",
            enable_stime: "00:00",
            enable_etime: "00:00",
          },
        ],
        cluster: curWarn.cluster,
        tags,
      };
      setAlartMutes(params, curWarn.datasource_id).then((res) => {
        setOpen1(false)
        message.success('屏蔽成功')
      });
  }

  useLayoutEffect(() => {
    // console.log('anonymous', anonymous);
    alertWebsocket.current = new WebSocket(WebSocketURL + 232443);//获取推送过来的告警消息
    alertWebsocket.current.onmessage = e => {
      if (!anonymous) {
        message.error("有设备发生告警信息")
        if (audioRef?.current) {
          audioRef?.current.play();
        }
        let data = JSON.parse(e.data);
        // console.log('data2222', data);

        setAlertLevel(data.dat[0].severity);
        setAlertId(data.dat[0].id);
        setDialogShow('1');
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
          if (_.isEmpty(datasourceList) && !_.startsWith(location.pathname, '/help/source')) {
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
    <div className='App' style={path.startsWith('/login') ? { overflow: 'hidden' } : { overflow: 'auto' }}>
      <audio ref={audioRef} src='/music/y2168.mp3' />
      <CommonStateContext.Provider value={commonState}>
        <ConfigProvider locale={i18n.language == 'en_US' ? enUS : zhCN}>
          <Router>
            <Switch>
              <Route exact path='/job-task/:busiId/output/:taskId/:outputType' component={TaskOutput} />
              <Route exact path='/job-task/:busiId/output/:taskId/:host/:outputType' component={TaskHostOutput} />
              <>
                {/* <LayoutXH /> */}
                <TopMenu></TopMenu>
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
          <div className='level'>{alertLevel}</div>
          <div
            className='detail'
            onClick={handleClick}
          >
            查看详情
          </div>
        </div>
      </div>

      {/* 大屏告警弹窗 */}
      <Modal className='warn-dialog' width={850} visible={isModalOpen} footer={null}>
        <div className="warn-header">
          <CloseOutlined className="el-icon-close" onClick={() => { setIsModalOpen(false) }} />
        </div>
        <div className='warn-cont'>
          <div className="asset1">
            <div className="row t-row">
              <div className="col col1">
                <span>告警规则名称：{curWarn.rule_name}</span>
              </div>
              <div className="col2">
                {
                  curWarn.processe == 1 ? <div>已处理</div> : <div onClick={handleDeal}>是否已处理</div>
                }
                <div onClick={handlePb}>屏蔽</div>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span>资产名称：{curWarn.asset_name}</span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span>IP地址：{curWarn.asset_ip}</span>
              </div>
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span>告警ID：{curWarn.id}</span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <div className="serverity">
                  <span>告警级别：</span>
                  <div className="s-img">
                    <img
                      src={`/image/alarm/s${curWarn.severity}.png`}
                      alt=""
                    />
                  </div>
                </div>
              </div>
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span
                >触发时间：{convertTime(curWarn.trigger_time, "year")}</span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span>触发值：{curWarn.trigger_value}</span>
              </div>
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span
                >告警状态：<span
                  style={{
                    color: curWarn.is_recovered ? '#39E9A4' : '#F26464',
                  }}>{curWarn.is_recovered ? "已恢复" : "未恢复"}</span></span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <img
                  className="dian"
                  src="/image/alarm/dian.png"
                  alt=""
                />
                <span>处理状态： {curWarn.processe == 1 ? '已处理' : '未处理'}</span>
              </div>
            </div>
          </div>
          <div className="chart1">
            <AlarmChart chartList={chartList} />
          </div>
        </div>
        {/* 屏蔽 */}
        <Modal className="warn-dialog warn-dialog1" visible={open1} footer={null}>
          <div className="header">
            <CloseOutlined className="el-icon-close" onClick={() => { setOpen1(false) }} />
          </div>
          <div className='icont'>
            <span style={{marginRight: '10px', fontSize: '18px'}}>屏蔽时长：</span>
            <Select
              dropdownClassName='warn-sel'
              className='alarm-select'
              defaultValue={3600}
              style={{ width: 200 }}
              onChange={handleChange}
              options={timeLensDefault}
            />
          </div>
          <div className="dialog-footer">
            <div onClick={() => setOpen1(false)}>取 消</div>
            <div type="primary" onClick={saveWarnig}>确 定</div>
          </div>
        </Modal>
      </Modal>

    </div>
  );
}

export default App;
