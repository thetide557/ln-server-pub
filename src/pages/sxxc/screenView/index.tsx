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
import React, { useState, useEffect, useRef, useContext } from 'react';
import { CommonStateContext } from '@/App';
import { useHistory } from 'react-router-dom';
import _ from 'lodash';
import { getBigScreen, getDashboards, getNav2 } from '@/services/sxxc/bigScreen';
import { Dropdown, Menu, message, Select } from 'antd';
import { DownOutlined, AppstoreOutlined } from '@ant-design/icons';
import './index.less'

export default function ScreenView() {
  // const origin = window.location.origin
  const history = useHistory();
  const [screenList, setScreenList] = useState<any>([]);
  const [selectGroup, setSelectGroup] = useState<any>('')
  const { busiGroups } = useContext(CommonStateContext);
  const [nav2, setNav2] = useState<any>([]);
  const [url, setUrl] = useState<any>('')
  const [first, setFirst] = useState<any>('')
  const [activeColor, setActiveColor] = useState<any>(null)
  const baseUrl = '/dataroom/#/bigscreen/preview'
  // console.log('baseUrl', baseUrl);
  // console.log('url', url);
  const token = localStorage.getItem('access_token')

  const sendToken = window.onload = function () {
    var iframe: any = document.getElementById('logFrame');
    iframe.onload = function () {
      iframe.contentWindow.postMessage({ token: token }, '*');
    };
  };

  const goBoard = ({ key }) => {
    // console.log(key);
    const labelValue = busiGroups.filter(item => item.id == key)[0]?.label_value
    getDashboards(key).then(res => {
      if (res.length > 0) {
        // const groupUrl = `/dashboards/${res[0].id}?themeMode=dark&viewMode=fullscreen`
        // setUrl(groupUrl)
        setSelectGroup(key)
        if (labelValue) {
          const arr = res.filter(item => item.tags == labelValue)
          if (arr.length > 0) {
            const id = arr[0].id
            history.push(`/dashboardsxc/${id}?themeMode=dark&viewMode=fullscreen`)
          } else {
            history.push(`/dashboardsxc/${res[0].id}?themeMode=dark&viewMode=fullscreen`)
          }
        } else {
          history.push(`/dashboardsxc/${res[0].id}?themeMode=dark&viewMode=fullscreen`)
        }

      } else {
        message.warning("当前业务组暂未配置仪表盘");
      }
    })
  }
  // 下拉切换
  const changeScreen = ({ key }) => {
    // console.log(`selected ${key}`);
    let code = screenList.find(item => item.id == key).config
    // console.log(code);
    if (code.startsWith('http') || code.startsWith('https') || code.startsWith('www.')) {
      if (code.includes('?')) {
        let code1 = code + `&token=${token}`
        setUrl(code1)
      } else {
        let code1 = code + `?token=${token}`
        setUrl(code1)
      }
      sendToken()
    } else {
      const screenUrl = `${baseUrl}?code=${code}`
      setUrl(screenUrl)
      // sendToken()
    }
  }
  // tab切换
  const handleClick = (item) => {
    setActiveColor(item.id)
    // console.log(`selected ${key}`);
    let code = item.config
    // console.log(code);
    if (code.startsWith('http') || code.startsWith('https') || code.startsWith('www.')) {
      if (code.includes('?')) {
        let code1 = code + `&token=${token}`
        setUrl(code1)
      } else {
        let code1 = code + `?token=${token}`
        setUrl(code1)
      }
      sendToken()
    } else {
      const screenUrl = `${baseUrl}?code=${code}`
      setUrl(screenUrl)
      // sendToken()
    }
  }

  const MyStyle = (styleString) => {
    // 将样式字符串转换为样式对象
    const styleObject = styleString.split(';').reduce((style, declaration) => {
      const [key, value] = declaration.split(':').map(part => part.trim());
      if (key && value) {
        style[key] = value;
      }
      return style;
    }, {});
    return styleObject;
  };
  const menu = (
    <Menu
      onClick={goBoard}
      selectedKeys={[selectGroup]}
    >
      {_.map(nav2, (item) => {
        return <Menu.Item key={item.id}>{item.name}</Menu.Item>;
      })}
    </Menu>
  );

  const menu1 = (
    <Menu
      selectable
      onClick={changeScreen}
      defaultSelectedKeys={[first]}
    >
      {_.map(screenList, (item) => {
        return <Menu.Item key={item.id}>{item.title}</Menu.Item>;
      })}
    </Menu>
  );


  const goBack = () => {
    // 清除趋势图缓存数据
    if (localStorage.getItem('card5Data')) {
      localStorage.removeItem('card5Data')
    }
    history.push('/home')
    // window.location.href = '/home'
  }

  useEffect(() => {
    getBigScreen().then(res => {
      if (res.dat.list.length > 0) {
        setScreenList(res.dat.list)
        const id = res.dat.list[0].id.toString()
        // 切换
        setFirst(id)
        // tab页
        setActiveColor(res.dat.list[0].id)
        // code值
        const code = res.dat.list[0]['config']
        // 外部链接
        if (code.startsWith('http') || code.startsWith('https') || code.startsWith('www.')) {
          if (code.includes('?')) {
            let code1 = code + `&token=${token}`
            setUrl(code1)
          } else {
            let code1 = code + `?token=${token}`
            setUrl(code1)
          }
          sendToken()
        } else {
          const screenUrl = `${baseUrl}?code=${code}`
          setUrl(screenUrl)
          // sendToken()
        }
      }
    })
    // 获取二级导航
    getNav2().then(res => {
      if (res.dat.length) {
        setNav2(res.dat)
      }
    })
  }, []);
  return (
    <div className='screen-view'>
      <div className='screen1'>
        <div className='screen1-cont'>
          {/* tab标签 */}
          <div className='screen-tab'>
            {_.map(screenList.filter(x => x.type == 1), (item, index) => {
              return (
                <div className={['c-tab', activeColor == item.id ? 'active' : null].join(" ")} style={{ width: item.bg_width / 18 + 'vw', height: item.bg_height / 18 + 'vw', background: item.bg_color, ...MyStyle(item.nav_template) }} key={item.id} onClick={() => handleClick(item)}>
                  <span className='title' style={{ fontSize: item.font_size / 18 + 'vw', color: item.font_color, ...MyStyle(item.nav_template) }}>{item.nav_name}</span>
                </div>
              )
            })}
          </div>

          {/* 下拉切换 */}
          {/* <div className='screen-groups'>
            <Dropdown overlay={menu1} arrow overlayClassName='screen-drop'>
              <div className='screen-icon icon1'>
                <span>切换大屏</span>
                <DownOutlined style={{fontSize: '0.52vw', marginLeft: '0.1vw'}} />
              </div>
            </Dropdown>
          </div> */}
          <div className='screen-groups'>
            <Dropdown overlay={menu} arrow overlayClassName='screen-drop'>
              <div className='screen-icon icon2'>
                <span>项目组</span>
                <DownOutlined style={{ fontSize: '0.52vw', marginLeft: '0.1vw' }} />
              </div>
            </Dropdown>
          </div>
          <div className='back1' onClick={goBack} title='返回'>
            <div className='back-icon'></div>
            <img src="/image/screenview/back.png" alt="" />
          </div>
        </div>
        <iframe id="logFrame" src={url} sandbox="allow-forms allow-popups allow-same-origin allow-scripts"></iframe>
      </div>
    </div>
  );
}
