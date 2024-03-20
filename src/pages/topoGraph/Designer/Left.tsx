import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Collapse, Image } from 'antd';
import React, { useState } from 'react';
import { widgetType } from '../configuration';

const Left = ({ leftFlag, setLeftFlag, onDnd }) => {
  return (
    <>
      <div
        className='topo-designer-left'
      >
        <Collapse bordered={false} defaultActiveKey={widgetType[0].name}>
          {widgetType.map((item) => {
            return (
              <Collapse.Panel key={item.name} header={item.name}>
                <div className='topo-designer-left-menu'>
                  {item.list.map((subItem) => {
                    return (
                      <div
                        className='topo-designer-left-menu-item'
                        key={subItem.name}
                        draggable
                        onMouseDown={(e) => {
                          onDnd(subItem, e);
                        }}
                      >
                        <Image width={40} height={40} preview={false} src={subItem.url}></Image>
                        <span>{subItem.name}</span>
                      </div>
                    );
                  })}
                </div>
              </Collapse.Panel>
            );
          })}
        </Collapse>
        <div onClick={() => setLeftFlag(!leftFlag)} className='topo-designer-left-opertion'>
          {leftFlag ? <LeftOutlined /> : <RightOutlined />}
        </div>
      </div>
    </>
  );
};

export default Left;
