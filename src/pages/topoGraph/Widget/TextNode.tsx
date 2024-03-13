import React, { useEffect, useRef, useState } from 'react';
import { Node } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { min } from 'lodash';

export const createTextNode = (label: string = '文字', name: string) => {
  const component = ({ node }: { node: Node }) => {
    const data = node?.getData();
    const { width, height } = node?.size();

    return (
      <>
        <div style={{ color: node.attr('body/fill'), width, height, fontSize: node.attr('text/font-size') }}>{data?.label || label}</div>
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
