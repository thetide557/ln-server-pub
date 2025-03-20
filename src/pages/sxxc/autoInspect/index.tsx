import React, { useRef, useEffect } from 'react';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const autoInspect = function () {
  const token = sessionStorage.getItem('access_token')
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  return <iframe src={`/autoinspect`} style={{ width: '100%', height: '100%' }}></iframe>;
  // return (
  //   <PageLayout title={'健康报告'} icon={<UserOutlined />}>
  //     <iframe src={`http://localhost/health?token=${token}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }} scrolling='no'></iframe>
  //   </PageLayout>
  // );
};

export default autoInspect;
