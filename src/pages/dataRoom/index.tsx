import React, { useState } from 'react';
import Cookies from 'js-cookie';

const DataRoom = function () {
  const token = Cookies.get('access_token')
  const timestamp = new Date().getTime();
  const [url, setUrl] = useState(`/dataroom/?time=${timestamp}`);
  return <iframe src={url} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default DataRoom;
