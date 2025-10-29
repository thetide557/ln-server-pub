import React from 'react';
import Cookies from 'js-cookie';

const DataRoom = function () {
  const token = Cookies.get('access_token')
  const timestamp = new Date().getTime();
  return <iframe src={`/dataroom?time=${timestamp}`} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default DataRoom;
