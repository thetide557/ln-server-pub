import React, { useCallback, useEffect, useRef, useState } from 'react';

import './index.less';
import { useLocalStorageState } from 'ahooks';
import { Options } from '@antv/x6/lib/graph/options';
import { Dnd } from '@antv/x6-plugin-dnd';
import { Cell, Graph } from '@antv/x6';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Transform } from '@antv/x6-plugin-transform';
import { History } from '@antv/x6-plugin-history';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { Selection } from '@antv/x6-plugin-selection';

import _ from 'lodash';
import Left from './Left';
import Right from './Right';
import Header from './Header';
import '../Widget';
import { defaultPorts, widgetConfigure } from '../configuration';
import { IWidget } from '../type';
import { useHistory } from 'react-router-dom';
import { Button, Menu } from 'antd';

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
  grid: true,
  panning: true,
  mousewheel: true,
  embedding: true,

  connecting: {
    allowNode: true,
    allowBlank: false,
    allowLoop: false,
    allowMulti: false,
    allowPort: false,
    snap: true,
    connectionPoint: 'boundary',
    anchor: {
      name: 'center',
    },
  },
};

function createGraph(graphDom: React.MutableRefObject<null>) {
  const graph = new Graph({
    container: graphDom.current || undefined,
    ...graphOptions,
  });

  return graph;
}

interface IProps {
  value?: any;
  onChange?: (value: any) => void;
}

const Design = ({ value = {}, onChange }: IProps) => {
  const graphDom = useRef(null);
  const [data, setData] = useState(value);

  const [contextMenu, setContextMenu] = useState<{ left?: number; top?: number; show: boolean }>({
    left: 0,
    top: 0,
    show: false,
  });

  const [metricBox, setMetricBox] = useState<{ left?: number; top?: number; show: boolean; metric?: any[] }>({
    left: 0,
    top: 0,
    show: false,
    metric: [],
  });

  // 是否显示左边
  const [leftFlag, setLeftFlag] = useState(true);
  const [rightFlag, setRightFlag] = useState(true);

  const graph = useRef<Graph>();
  const dnd = useRef<Dnd>();

  // 选中的节点
  const [selection, setSelection] = useState<Cell[]>([]);

  useEffect(() => {
    graph.current = createGraph(graphDom);
    dnd.current = new Dnd({
      target: graph.current,
    });

    graph.current
      .use(
        new Snapline({
          enabled: true,
        }),
      )
      .use(
        new Transform({
          resizing: {
            enabled: true,
            orthogonal: false,
          },
        }),
      )
      .use(
        new History({
          enabled: true,
          ignoreChange: true,
        }),
      )
      .use(
        new Clipboard({
          enabled: true,
        }),
      )
      .use(
        new Selection({
          enabled: true,
          rubberband: true,
          modifiers: ['ctrl', 'meta'],
          showNodeSelectionBox: true,
          showEdgeSelectionBox: true,
        }),
      );

    graph.current
      .on('cell:mouseenter', ({ cell }) => {
        // 鼠标悬停时显示连接桩，对于边显示工具
        if (cell.isEdge()) {
          cell.addTools(['vertices', 'segments', 'button-remove']);
        }
        if (cell.isNode()) {
          cell.addTools(['button-remove']);
          cell.addPorts(defaultPorts.items);
          if (!metricBox.show) {
            setMetricBox({
              left: cell.getBBox().left + 200,
              top: cell.getBBox().top + 45 - 80,
              show: true,
              metric: cell.data.metric,
            });
          }
        }
      })
      .on('cell:mouseleave', ({ cell }) => {
        //鼠标移出后移除工具和连接桩
        cell.removeTools();
        if (cell.isNode()) {
          cell.removePorts();
          setMetricBox({
            show: false,
          });
        }
      })
      .on('edge:connected', ({ edge }) => {
        // 连线后，将source从port改为node
        const source = edge.getSourceNode();
        if (source) {
          edge.setSource(source);
        }
      })
      .on('edge:added', ({ edge }) => {
        // 默认连线属性
        edge.setAttrs({
          line: {
            stroke: '#00ba88',
            targetMarker: null,
          },
        });
      })
      .on('selection:changed', ({ added, removed, selected, options }) => {
        // 选择节点
        removed.forEach((v) => {
          v.removeTools();
          if (v.isNode()) {
            v.removePorts();
          }
        });
        setSelection(selected);
      })
      .on('cell:changed', () => {
        handleSave();
      })
      .on('cell:contextmenu', ({ x, y, cell }) => {
        setContextMenu({
          left: x + 200,
          top: y + 45,
          show: true,
        });
        setSelection([cell]);
      })
      .on('blank:mousedown', () => {
        setContextMenu({ show: false });
      });

    return () => {
      graph.current?.dispose();
      dnd.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (graph.current) {
      graph.current.fromJSON(data);
    }
  }, [data]);

  // 添加节点
  const handleAdd = useCallback((item: any, e: any) => {
    if (dnd.current && graph.current) {
      const { code } = item;
      const { configureValue } = widgetConfigure[code];
      const node = graph.current.createNode(_.cloneDeep(configureValue));
      dnd.current.start(node, e.nativeEvent as any);
    }
  }, []);

  // 修改节点属性
  const handleUpdate = (val: any) => {
    selection.forEach((v) => {
      v.setData(val);
    });
  };

  const handleCopy = useCallback(() => {}, []);
  const handleDelete = useCallback(() => {
    graph.current?.removeCells(selection);
    setContextMenu({ show: false });
  }, [selection]);
  const handleUndo = useCallback(() => {}, []);
  const handleRedo = useCallback(() => {}, []);
  const handleSave = useCallback(() => {
    onChange && onChange(graph.current?.toJSON());
  }, []);

  return (
    <>
      <div className='topo-designer'>
        <div className='topo-left'>
          <Left leftFlag={leftFlag} setLeftFlag={setLeftFlag} onDnd={handleAdd}></Left>
        </div>
        <div className='topo-center'>
          <Header selection={selection} onCopy={handleCopy} onDelete={handleDelete} onRedo={handleRedo} onUndo={handleUndo} onSave={handleSave}></Header>
          <div className='topo-designer-paint'>
            <div ref={graphDom}></div>
          </div>
        </div>
        <div className='topo-right'>
          <Right selection={selection} rightFlag={rightFlag} setRightFlag={setRightFlag} onUpdateData={handleUpdate}></Right>
        </div>
      </div>
      <div className='topo-designer-context-menu' style={{ left: contextMenu.left, top: contextMenu.top, display: contextMenu.show ? '' : 'none' }}>
        <Button size='small' onClick={() => handleDelete()}>
          删除
        </Button>
      </div>
      <div className='topo-designer-metric' style={{ left: metricBox.left, top: metricBox.top, display: metricBox.show ? '' : 'none' }}>
        <ul>
          {metricBox.metric?.map((m) => {
            return (
              <li>
                {m.label}: {m.value}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

export default Design;
