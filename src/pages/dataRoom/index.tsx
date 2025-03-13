import React from 'react';

const DataRoom = function () {
  const token = sessionStorage.getItem('access_token')
  return <iframe src={`/dataroom/#/big-screen-list`} style={{ width: '100%', height: '100%' }}></iframe>;
};

export default DataRoom;
