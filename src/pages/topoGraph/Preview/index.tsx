import React, { useEffect, useRef } from 'react';

import './index.less';
import { Options } from '@antv/x6/lib/graph/options';
import { Graph } from '@antv/x6';

import _ from 'lodash';
import '../Widget';

// 注册连接点位置
Graph.registerPortLayout(
  'center',
  (portsPositionArgs, elemBBox) => {
    return portsPositionArgs.map(() => {
      return {
        position: {
          x: elemBBox.width / 2,
          y: elemBBox.height / 2,
        },
        angle: 0,
      };
    });
  },
  true,
);

const graphOptions: Partial<Options.Manual> = {
  autoResize: true,
  width: 600,
  height: 400,
};

function createGraph(graphDom: React.MutableRefObject<null>) {
  const graph = new Graph({
    container: graphDom.current || undefined,
    ...graphOptions,
  });

  return graph;
}

interface IProps {
  topo: any;
}

const Preview = ({ topo }: IProps) => {
  const graphDom = useRef(null);
  const graph = useRef<Graph>();

  useEffect(() => {
    graph.current = createGraph(graphDom);
    graph.current.on('resize', ({ width, height }) => {
      graph.current?.zoomToFit({ maxScale: 1 });
    });
    return () => {
      graph.current?.dispose();
    };
  }, []);

  useEffect(() => {
    graph.current?.fromJSON(topo);
    graph.current?.zoomToFit({ maxScale: 1 });
  }, [topo]);

  return (
    <>
      <div className='preview'>
        <div ref={graphDom}></div>
      </div>
    </>
  );
};

export default Preview;
