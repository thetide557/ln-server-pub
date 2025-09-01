import React, { useRef, useEffect, useContext } from 'react';
import Cookies from 'js-cookie';
import { CommonStateContext } from '@/App';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const workOrder = function () {
  const token = Cookies.get('access_token')
  const { permList } = useContext(CommonStateContext);
  if (!permList.includes('/workorder/order') && !permList.includes('/workorder/ticket/index')) {
    return <iframe src={`/workorder/#/ticket/space`} style={{ width: '100%', height: '100%' }}></iframe>
  } else if (!permList.includes('/workorder/order')) {
    return <iframe src={`/workorder/#/ticket/index`} style={{ width: '100%', height: '100%' }}></iframe>
  } else {
    return <iframe src={`/workorder`} style={{ width: '100%', height: '100%' }}></iframe>;
  }
};

export default workOrder;
