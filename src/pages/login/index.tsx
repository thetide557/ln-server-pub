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
import React, { useState, useEffect } from 'react';
import { ifShowSso } from '@/services/login';
import LoginNormal from './loginNormal';
import LoginSso from './loginSso';


export default function Login() {
  const [showSso, setShowSso] = useState<boolean | null>(null); // 修改初始值为 null
  useEffect(() => {
    ifShowSso().then((res) => {
      setShowSso(res?.dat?.show);
    });
    localStorage.removeItem('password_expiry_reminded');
  }, []);

  // 在数据未加载完成前，可以显示加载状态或者返回 null
  if (showSso === null) {
    return null; // 或者其他加载组件
  }

  return (
    <>
      {showSso ? <LoginSso /> : <LoginNormal />}
    </>
  );
}
