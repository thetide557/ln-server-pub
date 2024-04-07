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
import { getListGroupScreen, getDashboards } from '@/services/sxxc/bigScreen';
import { Dropdown, Menu, message, Select } from 'antd';
import { DownOutlined, AppstoreOutlined } from '@ant-design/icons';
import './index.less'

export default function ScreenView() {
  // const origin = window.location.origin
  const history = useHistory();
  const [screenList, setScreenList] = useState<any>([]);
  const [selectGroup, setSelectGroup] = useState<any>('')
  const { busiGroups } = useContext(CommonStateContext);
  // const [url, setUrl] = useState<any>('http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1')
  const [url, setUrl] = useState<any>('')
  // const [url, setUrl] = useState<any>(`${origin}/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1`)
  // const baseUrl = 'http://113.141.79.47:17000/dataroom/#/bigscreen/preview'
  const baseUrl = `/dataroom/#/bigscreen/preview`
  // console.log('baseUrl', baseUrl);
  // console.log('url', url);
  console.log(busiGroups);
  
  const goBoard = ({key}) => {
    console.log(key);
    getDashboards(key).then(res => {
      if (res.length > 0) {
        // const groupUrl = `/dashboards/${res[0].id}?themeMode=dark&viewMode=fullscreen`
        // setUrl(groupUrl)
        setSelectGroup(key)
        history.push(`/dashboardsxc/${res[0].id}?themeMode=dark&viewMode=fullscreen`)
      } else {
        message.warning("当前业务组暂未配置仪表盘");
      }
    })
  }

  const menu = (
    <Menu
      onClick={ goBoard }
      selectedKeys={[selectGroup]}
    >
      {_.map(busiGroups, (item) => {
        return <Menu.Item key={item.id}>{item.name}</Menu.Item>;
      })}
    </Menu>
  );
  

  const goBack = () => {
    history.push('/home')
    // window.location.href = '/home'
  }
  // const handleClick = () => {
  //   if (screenList.length > 0) {
  //     const screenUrl = `${baseUrl}?code=${screenList[0].screenCode}`
  //     setUrl(screenUrl)
  //   }
  // }
  // const handleChange = (value: string) => {
  //   console.log(`selected ${value}`);
  //   let screenUrl = ''
  //   if (value) {
  //     screenUrl = `${baseUrl}?code=${value}`
  //   } else {
  //     screenUrl = `http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1`
  //     // screenUrl = `${origin}/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1`
  //   }
  //   setUrl(screenUrl)
  // }
  useEffect(() => {
    getListGroupScreen().then(res => {
      if (res.code == 200) {
        setScreenList(res.data[1]);
        let firstUrl = res.data[1][0]['screenCode']
        let screenUrl = `${baseUrl}?code=${firstUrl}`
        setUrl(screenUrl)
      }
    })
  }, []);
  return (
    <div className='screen-view'>
      <div className='screen1'>
        <div className='screen1-cont'>
          <div className='screen-groups'>
            <Dropdown overlay={menu} arrow>
              <div className='screen-icon'>
                  <AppstoreOutlined />
                  <DownOutlined />
              </div>
            </Dropdown>
          </div>
          {/* <div className='choose_screen1' onClick={handleClick}>
            <Select
              placeholder='请选择项目组'
              style={{ width: 180 }}
              onChange={handleChange}
              allowClear
              showSearch
            >
              {items.map((item, index) => (
                <Select.Option value={item.screenCode} key={index}>
                  {item.groupName}
                </Select.Option>
              ))}
            </Select>
            首页
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
