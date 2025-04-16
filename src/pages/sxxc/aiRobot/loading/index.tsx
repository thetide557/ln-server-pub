// LoadingDots.js
import React from 'react';
import { Spin } from 'antd';
import './index.less';

const LoadingDots = () => {
  return (
    <Spin indicator={<div className="loading-dots">
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </div>} />
  );
};

export default LoadingDots;