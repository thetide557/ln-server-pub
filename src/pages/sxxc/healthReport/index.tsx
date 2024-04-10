import React from 'react';

const healthReport = function () {
  const token = localStorage.getItem('access_token')
  return <iframe src={`http://localhost/workcard/qrInfo?token=${token}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }} scrolling='no'></iframe>;
};

export default healthReport;
