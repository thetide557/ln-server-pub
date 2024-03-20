import { Space } from 'antd';
import React from 'react';
import './index.less';

const Header = ({ selection, onCopy, onDelete, onUndo, onRedo, onSave }) => {
  return (
    <div className='topo-designer-header'>
      <Space>
        <div
          className={`topo-designer-header-button ${selection.length === 0 ? 'disable' : ''}`}
          onClick={() => {
            onCopy && onCopy();
          }}
        >
          复制
        </div>
        <div
          className={`topo-designer-header-button ${selection.length === 0 ? 'disable' : ''}`}
          onClick={() => {
            onDelete && onDelete();
          }}
        >
          删除
        </div>
        <div
          className={`topo-designer-header-button ${selection.length === 0 ? 'disable' : ''}`}
          onClick={() => {
            onUndo && onUndo();
          }}
        >
          撤销
        </div>
        <div
          className={`topo-designer-header-button ${selection.length === 0 ? 'disable' : ''}`}
          onClick={() => {
            onRedo && onRedo();
          }}
        >
          恢复
        </div>
        <div
          className='topo-designer-header-button disabled'
          style={{ display: 'none' }}
          onClick={() => {
            onSave && onSave();
          }}
        >
          保存
        </div>
      </Space>
    </div>
  );
};

export default Header;
