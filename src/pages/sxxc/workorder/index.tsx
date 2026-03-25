import React, { useRef, useEffect, useContext, useState } from 'react';
import Cookies from 'js-cookie';
import { CommonStateContext } from '@/App';
import { GetProfile } from '@/services/account';
// import PageLayout from '@/components/pageLayout';
// import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';

const workOrder = function () {
  const token = Cookies.get('access_token')
  const { permList } = useContext(CommonStateContext);
  const [url, setUrl] = useState('');
  useEffect(() => {
    // 当接口401时，验证用户是否开启单一会话，若开启则跳转登录页
    GetProfile().then(_ => {
      const timestamp = new Date().getTime();
      if (!permList.includes('/workorder/order') && !permList.includes('/workorder/ticket/index')) {
        setUrl(`/workorder/?time=${timestamp}#/ticket/space`)
      } else if (!permList.includes('/workorder/order')) {
        setUrl(`/workorder/?time=${timestamp}#/ticket/index`)
      } else {
        setUrl(`/workorder/?time=${timestamp}`)
      }
    })
  }, [])
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>
};

export default workOrder;
