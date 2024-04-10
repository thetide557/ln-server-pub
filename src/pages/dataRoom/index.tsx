import React from 'react';

const DataRoom = function () {
  const token = localStorage.getItem('access_token')
  return <iframe src={`/dataroom?token=${token}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }} scrolling='no'></iframe>;
};

export default DataRoom;
