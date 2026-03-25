import React, { useState, useEffect } from "react";
import { GetProfile } from '@/services/account';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const serverVideoAsset = function () {
  // const token = localStorage.getItem('access_token')
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  const [url, setUrl] = useState('');
  useEffect(() => {
    const timestamp = new Date().getTime();
    // 当接口401时，验证用户是否开启单一会话，若开启则跳转登录页
    GetProfile().then(_ => setUrl(`/servervideo/?time=${timestamp}#/asset-management`))
  }, [])
  return (
    <iframe
      src={url}
      style={{ width: "100%", height: "100%" }}
    ></iframe>
  );
  // return (
  //   <PageLayout title={'健康报告'} icon={<UserOutlined />}>
  //     <iframe src={`http://localhost/health?token=${token}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }} scrolling='no'></iframe>
  //   </PageLayout>
  // );
};

export default serverVideoAsset;
