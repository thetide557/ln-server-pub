import React, { useRef, useEffect, useContext, useState } from 'react';
import Cookies from 'js-cookie';
import { CommonStateContext } from '@/App';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const workOrder = function () {
  const token = Cookies.get('access_token')
  const { permList } = useContext(CommonStateContext);
  const timestamp = new Date().getTime();
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!permList.includes('/workorder/order') && !permList.includes('/workorder/ticket/index')) {
      setUrl(`/workorder/?time=${timestamp}#/ticket/space`)
    } else if (!permList.includes('/workorder/order')) {
      setUrl(`/workorder/?time=${timestamp}#/ticket/index`)
    } else {
      setUrl(`/workorder/?time=${timestamp}`)

    }
  }, [])
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>
};

export default workOrder;
