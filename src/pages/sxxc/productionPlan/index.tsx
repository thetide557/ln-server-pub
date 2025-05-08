import React, { useRef, useEffect } from 'react';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const productionPlan = function () {
  const token = sessionStorage.getItem('access_token')
  // const iframeRef = useRef(null);
  // const handleload = () => {
  //   const domElement:any = iframeRef?.current;
  //   domElement.contentWindow.postMessage({ 'token': token }, '*');
  // }
  return <iframe src={`/productionPlan?token=${token}`} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default productionPlan;
