import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { GetProfile } from '@/services/account';

const DataRoom = function () {
  const token = Cookies.get('access_token')
  const [url, setUrl] = useState('');
  useEffect(() => {
    const timestamp = new Date().getTime();
    // 当接口401时，验证用户是否开启单一会话，若开启则跳转登录页
    GetProfile().then(_ => setUrl(`/dataroom/?time=${timestamp}`))
  }, [])
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default DataRoom;
