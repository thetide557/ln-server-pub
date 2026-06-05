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
import React, { ReactNode, useContext } from 'react';
import { useHistory, Link } from 'react-router-dom';
import Icon, { RollbackOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Menu, Dropdown, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Logout } from '@/services/login';
import AdvancedWrap, { License } from '@/components/AdvancedWrap';
import { CommonStateContext } from '@/App';
import Version from './Version';
import Cookies from 'js-cookie';
import './index.less';
import './locale';

interface IPageLayoutProps {
  icon?: ReactNode;
  title?: String | JSX.Element;
  children?: ReactNode;
  introIcon?: ReactNode;
  rightArea?: ReactNode;
  customArea?: ReactNode;
  showBack?: Boolean;
  backPath?: string;
  /** 与 backPath 一起使用时传给 history.push 的 state（如列表页需识别来源） */
  backState?: Record<string, unknown>;
  docFn?: Function;
  desc?: string;
}

const PageLayout: React.FC<IPageLayoutProps> = ({ icon, title, rightArea, introIcon, children, customArea, showBack, backPath, backState, docFn, desc }) => {
  const { t, i18n } = useTranslation('pageLayout');
  const history = useHistory();
  const { profile } = useContext(CommonStateContext);

  const menu = (
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
          Logout().then(() => {
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('curBusiId');
            localStorage.removeItem('card5Data');
            localStorage.removeItem('card7Data');
            localStorage.removeItem('userId');
            localStorage.removeItem('deepseek_token');
            history.push('/login');
          });
        }}
      >
        {t('logout')}
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={'page-wrapper'}>
      {customArea ? (
        <div className={'page-top-header'}>{customArea}</div>
      ) : (
        <div className={'page-top-header'}>
          <div className={'page-header-content'}>
            <div className={'page-header-title'}>
              {showBack && (
                <RollbackOutlined
                  onClick={() => {
                    if (backPath) {
                      history.push({
                        pathname: backPath,
                        ...(backState != null ? { state: backState } : {}),
                      });
                    } else {
                      history.goBack();
                    }
                  }}
                  style={{
                    marginRight: '5px',
                  }}
                />
              )}
              {icon}
              {title}
            </div>
            {/* {desc && <div className={'page-header-desc'}>{desc}</div>} */}
          </div>
        </div>
      )}
      {children && children}
    </div>
  );
};

export default PageLayout;
