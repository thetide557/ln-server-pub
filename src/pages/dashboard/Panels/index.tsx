/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useRef, useState, useContext, useEffect } from 'react';
import _ from 'lodash';
import semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { message, Modal } from 'antd';
import { useLocation } from 'react-router-dom';
import querystring from 'query-string';
import RGL, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { updateDashboardConfigs as updateDashboardConfigsFunc } from '@/services/dashboardV2';
import { Dashboard } from '@/store/dashboardInterface';
import { CommonStateContext } from '@/App';
import {
  buildLayout,
  sortPanelsByGridLayout,
  updatePanelsLayout,
  handleRowToggle,
  updatePanelsWithNewPanel,
  updatePanelsInsertNewPanel,
  panelsMergeToConfigs,
  updatePanelsInsertNewPanelToRow,
  getRowCollapsedPanels,
  getRowUnCollapsedPanels,
  processRepeats,
} from './utils';
import Renderer from '../Renderer/Renderer/index';
import Row from './Row';
import { ASSET_TYPE_OVERRIDES_KEY, extractNetworkChartOverride } from '../Detail/assetTypeCharts';
import Editor from '../Editor';
import './style.less';

interface IProps {
  dashboardId: string;
  editable: boolean;
  dashboard: Dashboard;
  range: IRawTimeRange;
  variableConfig: any;
  panels: any[];
  isPreview: boolean;
  isHome?: boolean;
  setPanels: (panels: any[]) => void;
  onShareClick: (panel: any) => void;
  onFullScreenClick?: (panel: any) => void;
  onUpdated: (res: any) => void;
  // 渲染层面板（如网络设备专属指标集）：仅用于渲染与布局，各交互回调仍作用于 panels 原始面板
  renderPanels?: any[];
}

const ReactGridLayout = WidthProvider(RGL);

function index(props: IProps) {
  const { profile } = useContext(CommonStateContext);
  const location = useLocation();
  const { themeMode } = querystring.parse(location.search);
  const { editable, dashboard, range, variableConfig, panels, isPreview, setPanels, onShareClick, onUpdated, onFullScreenClick, isHome, renderPanels } = props;
  const renderList = renderPanels ?? panels;
  const roles = _.get(profile, 'roles', []);
  const isAuthorized = !_.some(roles, (item) => item === 'Guest') && !isPreview;
  const layoutInitialized = useRef(false);
  const allowUpdateDashboardConfigs = useRef(false);
  const reactGridLayoutDefaultProps = {
    rowHeight: 40,
    cols: 24,
    useCSSTransforms: false,
    draggableHandle: '.dashboards-panels-item-drag-handle',
  };
  const updateDashboardConfigs = (dashboardId, options) => {
    if (!editable) {
      message.warning('仪表盘已经被别人修改，为避免相互覆盖，请刷新仪表盘查看最新配置和数据');
    }
    if (!_.isEmpty(roles) && isAuthorized && editable) {
      return updateDashboardConfigsFunc(dashboardId, options);
    }
    return Promise.reject();
  };
  const [editorData, setEditorData] = useState<{
    mode: string;
    visible: boolean;
    id: string;
    initialValues: any;
    // 网络设备专属图表（渲染层注入视图）的编辑：编辑器展示当前图表定义，保存写入 configs.assetTypeChartOverrides
    networkOverride?: boolean;
  }>({
    mode: 'add',
    visible: false,
    id: '',
    initialValues: {},
  });

  useEffect(() => {
    setPanels(processRepeats(panels, variableConfig));
  }, []);

  return (
    <div className='dashboards-panels scroll-container'>
      <ReactGridLayout
        layout={buildLayout(renderList)}
        onLayoutChange={(layout) => {
          if (layoutInitialized.current) {
            const newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
            if (!_.isEqual(panels, newPanels)) {
              setPanels(newPanels);
              // TODO: 这里可能会触发两次 update, 删除、克隆面板后可能会触发 layoutChange，此时需要更新面板重新更新下 dashboard 配置
              if (allowUpdateDashboardConfigs.current) {
                allowUpdateDashboardConfigs.current = false;
                updateDashboardConfigs(dashboard.id, {
                  configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                }).then((res) => {
                  onUpdated(res);
                });
              }
            }
          }
          layoutInitialized.current = true;
        }}
        onDragStop={(layout) => {
          const newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
          if (!_.isEqual(panels, newPanels)) {
            updateDashboardConfigs(dashboard.id, {
              configs: panelsMergeToConfigs(dashboard.configs, newPanels),
            }).then((res) => {
              onUpdated(res);
            });
          }
        }}
        onResizeStop={(layout) => {
          const newPanels = sortPanelsByGridLayout(updatePanelsLayout(panels, layout));
          if (!_.isEqual(panels, newPanels)) {
            updateDashboardConfigs(dashboard.id, {
              configs: panelsMergeToConfigs(dashboard.configs, newPanels),
            }).then((res) => {
              onUpdated(res);
            });
          }
        }}
        {...reactGridLayoutDefaultProps}
      >
        {_.map(renderList, (item) => {
          // 渲染层面板可能是注入后的定义（如网络设备专属指标集），交互操作需回带原始面板，避免污染看板配置
          const rawItem = _.find(panels, { id: item.id }) || item;
          return (
            <div key={item.layout.i} data-id={item.layout.i} style={{display: item.hidden ? 'none': ''}}>
              {item.type !== 'row' ? (
                semver.valid(item.version) ? (
                  <Renderer
                    isPreview={!isAuthorized}
                    themeMode={themeMode as 'dark'}
                    dashboardId={_.toString(props.dashboardId)}
                    id={item.id}
                    time={range}
                    values={item}
                    isHome={isHome}
                    variableConfig={variableConfig}
                    onCloneClick={() => {
                      const newPanels = updatePanelsInsertNewPanel(panels, {
                        ...rawItem,
                        id: uuidv4(),
                        layout: {
                          ...rawItem.layout,
                          i: uuidv4(),
                        },
                      });
                      setPanels(newPanels);
                      // 克隆面板必然会触发 layoutChange，更新 dashboard 放到 onLayoutChange 里面处理
                      allowUpdateDashboardConfigs.current = true;
                    }}
                    onShareClick={() => {
                      onShareClick(item);
                    }}
                    onFullScreenClick={() => {
                      onFullScreenClick && onFullScreenClick(item)
                    }}
                    onEditClick={() => {
                      // 注入的网络设备图表：编辑器展示当前渲染定义，保存写入网络图表自定义（不碰原始主机面板的查询定义）
                      const isNetworkView = renderList !== panels && item !== rawItem;
                      setEditorData({
                        mode: 'edit',
                        visible: true,
                        id: item.id,
                        initialValues: {
                          ...(isNetworkView ? item : rawItem),
                          id: item.id,
                        },
                        networkOverride: isNetworkView,
                      });
                    }}
                    onDeleteClick={() => {
                      Modal.confirm({
                        title: `是否删除图表：${rawItem.name}`,
                        okText:'确定',
                        cancelText:'取消',
                        onOk: async () => {
                          const newPanels = _.filter(panels, (panel) => panel.id !== item.id);
                          allowUpdateDashboardConfigs.current = true;
                          setPanels(newPanels);
                          updateDashboardConfigs(dashboard.id, {
                            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                          }).then((res) => {
                            onUpdated(res);
                          });
                        },
                      });
                    }}
                    onTopNChange={(topN) => {
                      const newPanel = { ...rawItem, custom: { ...rawItem.custom, topN } };
                      const newPanels = updatePanelsWithNewPanel(panels, newPanel);
                      setPanels(newPanels);
                      updateDashboardConfigs(dashboard.id, {
                        configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                      }).then((res) => {
                        onUpdated(res);
                      });
                    }}
                  />
                ) : (
                  <div className='dashboards-panels-item-invalid'>
                    <div>
                      <div>无效的图表配置</div>
                      <a
                        onClick={() => {
                          const newPanels = _.filter(panels, (panel) => panel.id !== item.id);
                          allowUpdateDashboardConfigs.current = true;
                          setPanels(newPanels);
                          updateDashboardConfigs(dashboard.id, {
                            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                          }).then((res) => {
                            onUpdated(res);
                          });
                        }}
                      >
                        删除
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <Row
                  isPreview={!isAuthorized}
                  name={item.name}
                  row={item}
                  onToggle={() => {
                    const newPanels = handleRowToggle(!item.collapsed, panels, _.cloneDeep(item));
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                  onAddClick={() => {
                    setEditorData({
                      mode: 'add',
                      visible: true,
                      id: item.id,
                      initialValues: {
                        type: 'timeseries',
                        name: 'Panel Title',
                        targets: [
                          {
                            refId: 'A',
                            expr: '',
                          },
                        ],
                      },
                    });
                  }}
                  onEditClick={(newPanel) => {
                    const newPanels = updatePanelsWithNewPanel(panels, newPanel);
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                  onDeleteClick={(mode: 'self' | 'withPanels') => {
                    let newPanels: any[] = _.cloneDeep(panels);
                    if (mode === 'self') {
                      newPanels = getRowCollapsedPanels(newPanels, item);
                      newPanels = _.filter(newPanels, (panel) => panel.id !== item.id);
                    } else {
                      newPanels = getRowUnCollapsedPanels(newPanels, item);
                      newPanels = _.filter(newPanels, (panel) => panel.id !== item.id);
                    }
                    allowUpdateDashboardConfigs.current = true;
                    setPanels(newPanels);
                    updateDashboardConfigs(dashboard.id, {
                      configs: panelsMergeToConfigs(dashboard.configs, newPanels),
                    }).then((res) => {
                      onUpdated(res);
                    });
                  }}
                />
              )}
            </div>
          );
        })}
      </ReactGridLayout>
      <Editor
        mode={editorData.mode}
        visible={editorData.visible}
        setVisible={(visible) => {
          setEditorData({
            ...editorData,
            visible,
          });
        }}
        variableConfigWithOptions={variableConfig}
        id={editorData.id}
        dashboardId={_.toString(props.dashboardId)}
        time={range}
        initialValues={editorData.initialValues}
        onOK={(values, mode) => {
          if (editorData.networkOverride) {
            // 网络设备专属图表：定义类字段（标题/查询/单位）写入 configs.assetTypeChartOverrides，仅作用于网络设备视图；
            // custom（TopN/聚合方式等）写回原始主机面板，保证拖拽/TopN 调整在两套视图下行为一致
            const originalPanel = _.find(panels, { id: editorData.id });
            const newPanels = originalPanel && values.custom ? updatePanelsWithNewPanel(panels, { ...originalPanel, custom: values.custom }) : panels;
            const newConfigs = JSON.parse(panelsMergeToConfigs(dashboard.configs, newPanels));
            newConfigs[ASSET_TYPE_OVERRIDES_KEY] = {
              ...(newConfigs[ASSET_TYPE_OVERRIDES_KEY] || {}),
              [editorData.id]: extractNetworkChartOverride(values),
            };
            updateDashboardConfigs(dashboard.id, { configs: JSON.stringify(newConfigs) }).then((res) => {
              onUpdated(res);
            });
            return;
          }
          const newPanels = mode === 'edit' ? updatePanelsWithNewPanel(panels, values) : updatePanelsInsertNewPanelToRow(panels, editorData.id, values);
          setPanels(newPanels);
          updateDashboardConfigs(dashboard.id, {
            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
          }).then((res) => {
            onUpdated(res);
          });
        }}
      />
    </div>
  );
}

export default React.memo(index);
