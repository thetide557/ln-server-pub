import React, { useState } from "react";
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const serverVideoAlarm = function () {
  // const token = localStorage.getItem('access_token')
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  const timestamp = new Date().getTime();
  const [url, setUrl] = useState(`/servervideo?time=${timestamp}#/alarm-management`);
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

export default serverVideoAlarm;
