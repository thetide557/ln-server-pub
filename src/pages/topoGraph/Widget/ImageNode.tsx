import React from 'react';
import { Node } from '@antv/x6';
import { register } from '@antv/x6-react-shape';

export const createImageNode = (img: any, label: string, name: string) => {
  const component = ({ node }: { node: Node }) => {
    const data = node?.getData();
    const { width, height } = node?.size();
    return (
      <>
        <div style={{ color: node.attr('body/fill'), width, height }}>
          <svg className='icon' aria-hidden='true'>
            <rect height={height} width={width} style={{ fillOpacity: 0, stroke: node.attr('body/stroke'), strokeWidth: node.attr('body/stroke-width') }}></rect>
            <use x={2} y={2} height={height - 4} width={width - 4} xlinkHref={img}></use>
          </svg>
        </div>
        <div className='node-label'>{data?.label || label}</div>
      </>
    );
  };

  register({
    shape: name,
    effect: ['data', 'attrs', 'size'],
    component: component,
  });

  return component;
};
