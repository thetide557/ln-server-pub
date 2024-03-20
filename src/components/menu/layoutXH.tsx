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
import React, { useEffect, useState, createContext, useRef } from 'react';
import { BrowserRouter as Router, Switch, Route, useHistory, useLocation } from 'react-router-dom';

import TopMenu from './topMenuXH'; //西航版本

import { Layout, Menu } from 'antd';
import Content from '@/routers';
import { useLocalStorageState } from 'ahooks';

const {Header, Footer, Sider} = Layout

function layoutXH() {

  const history = useHistory();
  const [leftMenuItems, setLeftMenuItems] = useState<any>();
  const [leftMenuKey, setLeftMenuKey] = useState<any>("");
  const [mainMenu, setMainMenu] = useState<any>({});
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { pathname } = location;
  const [home] = useLocalStorageState("HOME_URL")

  useEffect(() => {
    try {
      if (window.localStorage.getItem('leftMenuItems')) {
        let leftMenus = window.localStorage.getItem('leftMenuItems') as string;
        setLeftMenuKey([leftMenus]);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);
  const toggleCollapsed=()=> {
    setCollapsed(!collapsed);
  }

  const handleClick = (item) => {
    if ((item.key as string).startsWith('/')) {
      history.push(item.key)
      window.localStorage.setItem("mainMenuKey", mainMenu.key);
      window.localStorage.setItem("leftMenuItems", item.key);
    }
  };

  return (
    <Layout>
      {pathname != "/login" ? (
        <>
          <Layout.Header className='yth_app_header'>
            <TopMenu
              // selectMenu={(mainMenu: any, items) => {
              //   setMainMenu(mainMenu);
              //   setLeftMenuItems(items)
              // }}
            ></TopMenu>
          </Layout.Header>
          <Layout hasSider>
            <Layout.Sider collapsible trigger={null} onCollapse={()=>{toggleCollapsed}} collapsed={collapsed} collapsedWidth={0}>
              <Menu
                mode="inline"
                defaultSelectedKeys={leftMenuKey}
                defaultOpenKeys={['sub1']}
                onClick={handleClick}
                style={{ height: '100%', borderRight: 0 }}
                items={leftMenuItems}
              /></Layout.Sider>
            <Content />
          </Layout>
          {/* <Footer>Footer</Footer> */}
        </>
      ):(
        <Content />
      )}
    </Layout>

  );
}

export default layoutXH;
