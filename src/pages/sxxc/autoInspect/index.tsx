import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const autoInspect = function () {
  const token = Cookies.get('access_token')
  const timestamp = new Date().getTime();
  const [url, setUrl] = useState(`/autoinspect/?time=${timestamp}`);
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default autoInspect;