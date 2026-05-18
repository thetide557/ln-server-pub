import { CommonStateContext, initTheme } from '@/App';
import { getMenuPerm } from '@/services/common';
import Icon, { DownOutlined, ProfileOutlined, ProjectOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import querystring from 'query-string';
import { Dropdown, Menu, Space, Image, message } from 'antd';
import _ from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconFont from '../IconFont';
import { useHistory, useLocation } from 'react-router-dom';
import { getMyPortrait } from '@/services/log_set';
import './topMenu.less';
import './locale';
import { Logout } from '@/services/login';
import { useLocalStorageState } from 'ahooks';
import { useLocalStorage } from 'react-use';
import { getBigScreen, getBigScreen2 } from '@/services/sxxc/bigScreen';
import { getDictDataListByType } from '@/services/system/dict';
import { downloadTemplet } from '@/services/menu';
import Cookies from 'js-cookie';
import moment from 'moment';

const getMenuList = (t) => {
  const menuList = [
    {
      key: '/home',
      icon: <IconFont type='icon-Menu_Infrastructure' />,
      label: t('首页'),
    },
    {
      key: '/xh/targets',
      icon: <IconFont type='icon-Menu_Infrastructure' />,
      label: t('资产管理'),
      children: [
        {
          key: '/xh/assetmgt',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('运维资产清单'),
        },
        {
          key: '/xh/iotassetmgt',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('物联网资产管理'),
        },
        // {
        //   key: '/serverVideoAsset',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('视频类项目资产清单'),
        // },
      ],
    },
    {
      key: 'dashboard',
      icon: <IconFont type='icon-Menu_Dashboard' />,
      label: t('监控管理'),
      children: [
        {
          key: '/xh/monitor',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('监控指标'),
        },
        // {
        //   key: '/dashboards-built-in',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('仪表盘'),
        // },
        {
          key: '/metric/explorer',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('即时查询'),
        },
        {
          key: '/recording-rules',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('记录规则'),
        }
      ],
    },
    {
      key: 'alarm',
      icon: <IconFont type='icon-Menu_AlarmManagement' />,
      label: t('告警管理'),
      children: [
        {
          key: '/alert-rules?id=-1',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('告警规则'),
        },
        {
          key: '/alert-cur-events',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('当前告警'),
        },
        {
          key: '/alert-his-events',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('历史告警'),
        },
        {
          key: '/alert-mutes',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('屏蔽规则'),
        },
        // {
        //   key: '/help/notification-settings',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('通知设置'),
        // },
        {
          key: '/help/notification-tpls',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('通知模板'),
        },
        // {
        //   key: '/serverVideoAlarm',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('视频类项目历史告警'),
        // },

      ],
    },
    {
      key: 'inspection',
      icon: <ProjectOutlined />,
      label: t('巡检中心'),
      children: [
        {
          key: '/inspection/inspectionList',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('巡检管理'),
        },
        // {
        //   key: '/productionplan',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('作业计划管理'),
        // },
      ],
    },
    {
      key: 'task',
      icon: <ProjectOutlined />,
      label: t('任务中心'),
      children: [
        // {
        //   key: '/inspection/inspectionList',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('巡检任务'),
        // },
        // {
        //   key: '/inspection/inspectionReport',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('巡检报告'),
        // },
        // {
        //   key: '/inspection/inspectionLog',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('巡检日志'),
        // },
        {
          key: '/taskManage/taskManage',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('任务管理'),
        },
        // {
        //   key: '/taskManage/strategy',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('任务策略'),
        // },
        {
          key: '/taskManage/taskInstance',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('任务实例'),
        },
        {
          key: 'job',
          icon: <IconFont type='icon-Menu_AlarmSelfhealing' />,
          // activeIcon: <Icon component={menuIcon.AlarmSelfhealing as any} />,
          label: t('告警自愈'),
          children: [
            {
              key: '/job-tpls',
              label: t('自愈脚本'),
            },
            {
              key: '/job-tasks',
              label: t('执行历史'),
            },
            // {
            //   key: '/ibex-settings',
            //   label: t('自愈配置'),
            // },
          ],
        },
      ],
    },
    {
      key: 'healthReport',
      icon: <ProjectOutlined />,
      label: t('健康报告'),
      children: [
        {
          key: '/healthReport',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('健康报告'),
        },
      ]
    },
    {
      key: 'workOrder',
      icon: <IconFont type='icon-Menu_Infrastructure' />,
      label: t('运维工单'),
      children: [
        {
          key: '/workOrder',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('运维工单'),
        },
      ]
    },
    {
      key: 'bigscreen',
      icon: <ProjectOutlined />,
      label: t('大屏管理'),
      children: [
        {
          key: '/bigscreen',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('大屏设计'),
        },
        {
          key: '/bigscreen/topology',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('拓扑管理'),
        },
        {
          key: '/bigscreen/api-service',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('接口管理'),
        },
        {
          key: '/bigscreen/address',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('大屏配置'),
        }
      ],
    },
    {
      key: 'help',
      icon: <IconFont type='icon-Menu_SystemInformation' />,
      label: t('系统配置'),
      children: [
        {
          // key: 'manage',
          key: '/users',
          icon: <IconFont type='icon-Menu_PersonnelOrganization' />,
          label: t('人员组织'),
          children: [
            {
              key: '/users',
              label: t('用户管理'),
            },
            {
              key: '/user-groups',
              label: t('团队管理'),
            },
            {
              key: '/busi-groups',
              label: t('业务组管理'),
            },
            {
              key: '/permissions',
              label: t('角色管理'),
            },

          ],
        },
        {
          key: '/help/version',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('系统版本'),
        },
        // {
        //   key: '/target/version',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('客户端版本'),
        // },
        {
          key: '/targets',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('探针管理'),
        },
        {
          // key: 'log',
          key: '/log/operlog',
          icon: <IconFont type='icon-Menu_LogAnalysis' />,
          label: t('日志分析'),
          children: [
            // {
            //   key: '/log/debug/switch',
            //   label: '日志调试启动开关',
            // },
            {
              key: '/log/operlog',
              label: t('操作日志'),
            },
            {
              key: '/log/syslog',
              label: t('系统日志'),
            },
          ],
        },
        {
          // key: 'monitorLog',
          key: '/log/explorer',
          icon: <IconFont type='icon-Menu_LogAnalysis' />,
          // activeIcon: <Icon component={menuIcon.LogAnalysis as any} />,
          label: t('监控日志'),
          children: [
            {
              key: '/log/explorer',
              label: t('即时查询'),
            },
            {
              key: '/log/index-patterns',
              label: t('索引模式'),
            },
          ],
        },
        // {
        //   key: 'inspection',
        //   icon: <IconFont type='icon-Menu_LinkAnalysis' />,
        //   label: t('巡检管理'),
        //   children: [
        //     {
        //       key: '/inspection/plans',
        //       label: t('巡检任务'),
        //     },
        //     {
        //       key: '/inspection/applylist',
        //       label: t('巡检历史'),
        //     },
        //   ],
        // },
        {
          // key: '/help/other',
          key: '/help/source',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('其它设置'),
          children: [
            {
              key: '/help/source',
              label: t('数据源'),
            },
            {
              key: '/help/servers',
              label: t('告警引擎'),
            },
            {
              key: '/system/logo',
              label: t('LOGO设置'),
            },
            {
              key: '/system/parameters',
              label: '系统参数设置',
            },
            // {
            //   key: '/system/interface',
            //   label: '接口访问设置',
            // },
            {
              key: '/types/dictype',
              label: t('数据字典'),
            },
            {
              key: '/help/sso',
              label: t('单点登录管理'),
            },
            // {
            //   key: '/system/upgrade',
            //   label: t('系统升级'),
            // },
          ],
        },
        {
          // key: '/license/management',
          key: '/license/base',
          icon: <ProfileOutlined />,
          label: t('许可管理'),
          children: [
            {
              key: '/license/base',
              label: '许可信息',
            },
            {
              key: '/license/device',
              label: '设备License',
            },
          ],
        },
        {
          key: '/autoInspect',
          icon: <IconFont type='icon-Menu_Infrastructure' />,
          label: t('自动化检测'),
        },
        // {
        //   key: '/safety/certification',
        //   icon: <IconFont type='icon-Menu_Infrastructure' />,
        //   label: t('安全认证'),
        // },
      ],
    },

  ];
  if (import.meta.env['VITE_IS_COLLECT']) {
    const targets: any = _.find(menuList, (item) => item.key === 'targets');
    if (targets) {
      targets.children?.push({
        key: '/collects',
        label: t('采集配置'),
      });
    }
  }
  return menuList;
};
interface IProps {
  url?: string;
}

export default function () {//{ selectMenu?:any }
  const { t, i18n } = useTranslation('menu');

  const menuList = getMenuList(t);
  const [menus, setMenus] = useState(menuList);
  const [defaultSelectedKeys, setDefaultSelectedKeys] = useState<string[]>();

  const [mainMenuKey, setMainMenuKey] = useState<string[]>([]);
  const [mainMenuItems, setMainMenuItems] = useState<any>({});
  const location = useLocation();
  const history = useHistory();
  const { pathname } = location;
  const { profile } = useContext(CommonStateContext);
  const [home] = useLocalStorageState('HOME_URL');
  const [imageUrl, setImageUrl] = useState<string>();
  const [safeUrl, setSafeUrl] = useState<string>();

  const [theme, setTheme] = useLocalStorage<any>("platform_theme", initTheme);

  useEffect(() => {
    setDefaultSelectedKeys([]);
  }, [pathname]);

  useEffect(() => {
    if (location.pathname != '/login' && !pathname.startsWith('/callback')) {
      getMyPortrait().then((res) => {
        if (res.dat != null && res.dat != "") {
          setImageUrl(_.cloneDeep("/api/takin/" + res.dat + "?" + Math.random()));
        }
      })
      getDictDataListByType('safety_certification').then((res) => {
        // console.log(res);
        if (res.dat?.length > 0) {
          setSafeUrl(res.dat[0].dict_value);
        }
      })
    }
  }, []);


  useEffect(() => {
    if (profile?.roles?.length > 0) {
      if (profile?.roles.indexOf('Admin') === -1) {
        getMenuPerm().then((res) => {
          const { dat } = res;
          // console.log(dat);

          // 过滤掉没有权限的菜单
          const newMenus: any = _.filter(
            _.map(menuList, (menu) => {
              return {
                ...menu,
                children: _.filter(menu.children, (item) => {
                  if (item && item.children && item.children.length > 0) {
                    item.children = item.children.filter(item2 => dat.includes(item2.key))
                    if (item.children.length > 0) {
                      return item
                    }
                  } else if (item) {
                    return dat.includes(item.key)
                  }
                }),
              };
            }),
            (item) => {
              return item.children && item.children.length > 0;
            },
          ) || [];
          const flag = newMenus.some(item => item.key == '/home')
          // console.log(flag);
          if (!flag) {
            newMenus.unshift(
              {
                key: '/home',
                icon: <IconFont type='icon-Menu_Infrastructure' />,
                label: t('首页'),
              },
            )
          }
          setMenus(newMenus);
        });
      } else {
        // let mainMenus = menuList.map((item,index) => {
        //   mainMenuItems[item.key] = item.children?item.children:[];
        //   delete item.children;
        //   return item
        // })
        // setMenus(mainMenus);
        // setMainMenuItems({...mainMenuItems});
        // if(window.localStorage.getItem('mainMenuKey')){
        //   let mainKey = window.localStorage.getItem('mainMenuKey') as string;
        //   setMainMenuKey([mainKey]);
        //   for(let item of mainMenus){
        //       if(item.key==mainKey){
        //         handleClick(item);
        //       }
        //   }


        // }
        setMenus(menuList);
      }
    }
    i18n.changeLanguage("zh_CN");
    localStorage.setItem('language', "zh_CN");
  }, [profile?.roles, i18n.language]);

  const hideSideMenu = () => {
    if (
      location.pathname === '/login' ||
      location.pathname.startsWith('/chart/') ||
      location.pathname.startsWith('/screenView') ||
      location.pathname.startsWith('/dashboards/share/') ||
      location.pathname.startsWith('/callback') ||
      location.pathname.indexOf('/polaris/screen') === 0
    ) {
      return true;
    }
    // 大盘全屏模式下也需要隐藏左侧菜单
    if (location.pathname.indexOf('/dashboard') === 0) {
      const query = querystring.parse(location.search);
      if (query?.viewMode === 'fullscreen') {
        return true;
      }
      return false;
    }
    return false;
  };

  const handleClick = (item) => {
    // 新增: 判断 access_token 与 refresh_token 是否存在
    if (!Cookies.get('access_token') && !Cookies.get('refresh_token')) {
      Logout().then((res) => {
        if (res?.dat?.logout_url) {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('curBusiId');
          localStorage.removeItem('card5Data');
          localStorage.removeItem('card7Data');
          localStorage.removeItem('userId');
          localStorage.removeItem('left_tissueId');
          localStorage.removeItem('left_parId');
          localStorage.removeItem('left_asset_type');
          // history.push('/login');
          window.location.href = res.dat.logout_url
        } else {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('curBusiId');
          localStorage.removeItem('card5Data');
          localStorage.removeItem('card7Data');
          localStorage.removeItem('userId');
          localStorage.removeItem('left_tissueId');
          localStorage.removeItem('left_parId');
          localStorage.removeItem('left_asset_type');
          // history.push('/login');
          window.location.href = '/login'
        }
      });
      return;
    }

    if ((item.key as string) === "/safety/certification") {
      if (!safeUrl) return message.error(t('请先在数据字典中配置安全认证'))
      return window.open(safeUrl)
    }

    if ((item.key as string) === "home") {
      window.location.href = '/prod-api/'
    }
    if ((item.key as string).startsWith('/')) {
      history.push(item.key as string);
    }
  };

  const goScreen = () => {
    let busiGroup = localStorage.getItem('groupIds') || '';
    getBigScreen2(busiGroup).then(res => {
      const list = res.dat?.list?.filter((item: any) => item.type == 1) || [];
      if (list.length > 0) {
        history.push('/screenView')
      }
    })
  }

  const topRightMenu = (
    <Menu>
      <Menu.Item
        onClick={() => {
          history.push('/account/profile/info');
        }}
      >
        {t('profile')}
      </Menu.Item>
      <Menu.Item
        onClick={() => {
          Logout().then((res) => {
            if (res?.dat?.logout_url) {
              Cookies.remove('access_token');
              Cookies.remove('refresh_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('curBusiId');
              localStorage.removeItem('card5Data');
              localStorage.removeItem('card7Data');
              localStorage.removeItem('userId');
              localStorage.removeItem('left_tissueId');
              localStorage.removeItem('left_parId');
              localStorage.removeItem('left_asset_type');
              // history.push('/login');
              window.location.href = res.dat.logout_url
            } else {
              Cookies.remove('access_token');
              Cookies.remove('refresh_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('curBusiId');
              localStorage.removeItem('card5Data');
              localStorage.removeItem('card7Data');
              localStorage.removeItem('userId');
              localStorage.removeItem('left_tissueId');
              localStorage.removeItem('left_parId');
              localStorage.removeItem('left_asset_type');
              // history.push('/login');
              window.location.href = '/login'
            }
          });
        }}
      >
        {t('logout')}
      </Menu.Item>
    </Menu>
  );

  return hideSideMenu() ? null : (
    <div className='top-menu1'>
      <div className='top_left'>
        <div className='logoImg' onClick={goScreen}>
          <Image src={theme.logo} className='xh_logo_image_size' preview={false}></Image>
          {theme?.title}</div>
        <Menu mode='horizontal' className='layer_1_menu' selectedKeys={mainMenuKey} onClick={handleClick} items={menus} />
      </div>
      <div className='top_right'>
        <span
          className='language'
          onClick={() => {
            let language = i18n.language == 'en_US' ? 'zh_CN' : 'en_US';
            i18n.changeLanguage(language);
            localStorage.setItem('language', language);
          }}
        >
          <Icon type="bell" />
        </span>
        {/* 帮助文档 - 临时用户和有使用期限的用户不显示 */}
        {!profile.roles?.includes("临时用户") && !profile.temp_remaining_days && (
          <Dropdown 
            overlay={
              <Menu>
                <Menu.Item
                  onClick={() => {
                    // 操作手册下载接口
                    const url = '/api/takin/xh/assets/download/manual';
                    const exportTitle = '操作手册';
                    downloadTemplet(url).then((res) => {
                      const blobUrl = window.URL.createObjectURL(
                      new Blob([res], {
                        type: 'application/pdf',
                      }),
                    );
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    const dlName =
                      exportTitle + moment().format('YYYY-MM-DD') + '.pdf';
                      link.setAttribute('download', dlName);
                      document.body.appendChild(link);
                      link.click();
                    });
                  }}
                >
                  <span>操作手册</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    // 版本说明下载接口
                    const url = '/api/takin/xh/assets/download/version';
                    const exportTitle = '版本说明'; 
                    downloadTemplet(url).then((res) => {
                      const blobUrl = window.URL.createObjectURL(
                        new Blob([res], {
                          type: 'application/pdf',
                        }),
                      );
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      const dlName =
                        exportTitle + moment().format('YYYY-MM-DD') + '.pdf';
                      link.setAttribute('download', dlName);
                      document.body.appendChild(link);
                      link.click();
                    });
                  }}
                >
                  <span>版本说明</span>
                </Menu.Item>
              </Menu>
            } 
            trigger={['hover']} 
            className='help-doc'
          >
            <span className='help-icon'>
              <QuestionCircleOutlined />
            </span>
          </Dropdown>
        )}
        <Dropdown overlay={topRightMenu} trigger={['click']} className='my_portrait' >
          <span className='avator'>
            <img src={imageUrl ? imageUrl : '/image/avatar1.png'} alt='' />
            <span className='display-name'>{profile.nickname || profile.username}</span>
            <DownOutlined />
          </span>
        </Dropdown>
      </div>
    </div>
  );
}
