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
import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { getListGroupScreen } from '@/services/sxxc/bigScreen';
import { Button, Col, Divider, Form, Input, Row, Space, InputNumber, Select, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import './index.less'

export default function ScreenView() {
  const history = useHistory();
  const [items, setItems] = useState<any>([]);
  const [url, setUrl] = useState<any>('http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1')
  let baseUrl = 'http://113.141.79.47:17000/dataroom/#/bigscreen/preview'
  const goBack = () => {
    history.push('/home')
    // window.location.href = '/home'
  }
  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
    let screenUrl = ''
    if (value) {
      screenUrl = `${baseUrl}?code=${value}`
    } else {
      screenUrl = `http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=bigScreen_pMc6MKqse1`
    }
    setUrl(screenUrl)
  }
  useEffect(() => {
    // listApiService().then((res) => {
    //   setItems(res.dat.list);
    // });
    getListGroupScreen().then(res => {
      if (res.code == 200) {
        setItems(res.data[1]);
      }
    })
  }, []);
  return (
    <div className='screen-view'>
      <div className='screen1'>
        <div className='screen1-cont'>
          <div className='choose_screen1'>
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
          </div>
          <div className='back1' onClick={goBack}>
            <img src="/image/back.png" alt="" title='返回' />
          </div>
        </div>
        <iframe id="logFrame" src={url} sandbox="allow-forms allow-popups allow-same-origin allow-scripts"></iframe>
      </div>
    </div>
  );
}
