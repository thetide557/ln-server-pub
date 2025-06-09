import React from 'react';
import Cookies from 'js-cookie';

const DataRoom = function () {
  const token = Cookies.get('access_token')
  return <iframe src={`/dataroom/#/big-screen-list`} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default DataRoom;
