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
import './index.less'

export default function ScreenView() {
  const history = useHistory();
  const goBack = () => {
    history.push('/home')
    // window.location.href = '/home'
  }
  return (
    <div className='screen-view'>
      <div className='back1' onClick={goBack}>
        <img src="/image/back.png" alt="" title='返回' />
      </div>
      <iframe id="logFrame" src="http://113.141.79.47:17000/dataroom/#/bigscreen/preview?code=preview_bigScreen_pMc6MKqse1" sandbox="allow-forms allow-popups allow-same-origin allow-scripts"></iframe>
    </div>
  );
}
