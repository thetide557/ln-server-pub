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
import { getBigScreen, getDashboards } from '@/services/sxxc/bigScreen';
import { Dropdown, Menu, message, Select } from 'antd';
import { DownOutlined, AppstoreOutlined } from '@ant-design/icons';
import { AddPanelIcon } from './config';
import './index.less'

export default function ScreenView() {
  // const origin = window.location.origin
  const history = useHistory();
  const [screenList, setScreenList] = useState<any>([]);
  const [selectGroup, setSelectGroup] = useState<any>('')
  // const [items, setItems] = useState<any>([])
  const { busiGroups } = useContext(CommonStateContext);
  // const [url, setUrl] = useState<any>('http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1')
  const [url, setUrl] = useState<any>('')
  const [first, setFirst] = useState<any>('')
  // const [url, setUrl] = useState<any>(`${origin}/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1`)
  // const baseUrl = 'http://113.141.79.47:17000/dataroom/#/bigscreen/preview'
  const baseUrl = `/dataroom/#/bigscreen/preview`
  // console.log('baseUrl', baseUrl);
  // console.log('url', url);
  // console.log(busiGroups);
  // const token = localStorage.getItem('access_token')

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

  const changeScreen = ({ key }) => {
    // console.log(`selected ${key}`);
    let code = screenList.find(item => item.id == key).config
    // console.log(code);
    let screenUrl = `${baseUrl}?code=${code}`
    setUrl(screenUrl)
  }

  const menu = (
    <Menu
      onClick={goBoard}
      selectedKeys={[selectGroup]}
    >
      {_.map(busiGroups, (item) => {
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
    history.push('/home')
    // window.location.href = '/home'
  }
  // const handleClick = () => {
  //   if (screenList.length > 0) {
  //     const screenUrl = `${baseUrl}?code=${screenList[0].config}`
  //     setUrl(screenUrl)
  //   }
  // }
  useEffect(() => {
    getBigScreen().then(res => {
      if (res.dat.list.length > 0) {
        setScreenList(res.dat.list)
        const id = res.dat.list[0].id.toString()
        setFirst(id)
        const firstUrl = res.dat.list[0]['config']
        const screenUrl = `${baseUrl}?code=${firstUrl}`
        setUrl(screenUrl)
      }
    })
  }, []);
  return (
    <div className='screen-view'>
      <div className='screen1'>
        <div className='screen1-cont'>
          <div className='screen-groups'>
            <Dropdown overlay={menu1} arrow>
              <div className='screen-icon'>
                <AppstoreOutlined />
                <DownOutlined />
              </div>
            </Dropdown>
          </div>
          <div className='screen-groups'>
            <Dropdown overlay={menu} arrow>
              <div className='screen-icon'>
                <AddPanelIcon />
                <DownOutlined />
              </div>
            </Dropdown>
          </div>
          {/* <div className='choose_screen1'>
            <Select
              placeholder='请选择项目组'
              style={{ width: 180 }}
              onChange={handleChange}
              showSearch
            >
              {items.map((item, index) => (
                <Select.Option value={item.id} key={index}>
                  {item.title}
                </Select.Option>
              ))}
            </Select>
          </div> */}
          <div className='back1' onClick={goBack}>
            <img src="/image/back.png" alt="" title='返回' />
          </div>
        </div>
        <iframe id="logFrame" src={url} sandbox="allow-forms allow-popups allow-same-origin allow-scripts"></iframe>
      </div>
    </div>
  );
}
