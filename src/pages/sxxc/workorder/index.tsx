import React, { useRef, useEffect } from 'react';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const workOrder = function () {
  const token = sessionStorage.getItem('access_token')
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  // return <iframe src={`/workorder?token=${token}`} style={{ width: '100%', height: '100%' }}></iframe>;
  return <iframe src='http://localhost:3000/#/workorder/order' style={{ width: '100%', height: '100%' }}></iframe>;
};

export default workOrder;
