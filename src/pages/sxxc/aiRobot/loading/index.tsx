// LoadingDots.js
import React from 'react';
import { Spin } from 'antd';
import './index.less';

const LoadingDots = (props) => {
  const {theme} = props
  return (
    <Spin indicator={<div className={`loading-dots ${theme === 'dark' ? 'dark' : ''}`}>
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </div>} />
  );
};

export default LoadingDots;