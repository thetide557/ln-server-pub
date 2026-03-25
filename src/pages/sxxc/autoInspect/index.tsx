import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { GetProfile } from '@/services/account';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const autoInspect = function () {
  const token = Cookies.get('access_token')
  const [url, setUrl] = useState('');
  useEffect(() => {
    const timestamp = new Date().getTime();
     // 当接口401时，验证用户是否开启单一会话，若开启则跳转登录页
    GetProfile().then(_ => setUrl(`/autoinspect/?time=${timestamp}`))
  }, [])
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default autoInspect;
