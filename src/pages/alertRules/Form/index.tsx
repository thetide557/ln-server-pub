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
import React, { useContext, useEffect, createContext, useState } from 'react';
import { Form, Space, Button, notification, message ,Tabs, Modal,Tag,Dropdown,Menu,Input} from 'antd';
import { PlusSquareFilled , EllipsisOutlined} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams, Link, useLocation } from 'react-router-dom';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { addStrategy, EditStrategy, getStrategiesByRuleIds,EditAlertRule } from '@/services/warning';
import Base from './Base';
import Rule from './Rule';
import queryString from 'query-string';
import './style.less'
import { getXhMonitorByAssetId } from '@/services/manage';

import Effective from './Effective';
import Notify from './Notify';
import { getFirstDatasourceId, processFormValues, processInitialValues ,transformAlertRules,transformStrategyData} from './utils';
import { defaultValues } from './constants';
import { useSearchParam } from 'react-use';
import { buildPromVisualQueryFromPromQL, renderQuery } from '@/components/PromQueryBuilder';
import { PromVisualQueryLabelFilter } from '@/components/PromQueryBuilder/types';

interface IProps {
  type?: number; // 空: 新增 1:编辑 2:克隆 3:查看
  initialValues?: any;
}

export const FormStateContext = createContext({
  disabled: false,
});

export default function index(props: IProps) {
  const { type, initialValues } = props;
  const history = useHistory();
  const assetid = useSearchParam("assetid");
  const { bgid } = useParams<{ bgid: string }>();
  const { t } = useTranslation('alertRules');
  const [form] = Form.useForm();
  const [assets, setAssets] = useState({
    includes: [],excludes: []
  })

  const { groupedDatasourceList, licenseRulesRemaining } = useContext(CommonStateContext);
  const disabled = type === 3;
  const handleCheck = async (values) => {
    if (values.cate === 'prometheus') {
      if (values.rule_config.checked && values.prod === 'anomaly') {
        message.warning('请先校验指标');
        return;
      }
    } else if (type !== 1) {
      if (licenseRulesRemaining === 0 && values.prod === 'anomaly') {
        message.error('可添加的智能告警规则数量已达上限，请联系客服');
      }
    }
  };
  const handleMessage = (res) => {
    if (type === 1) {
      if (res.err) {
        message.error(res.error);
      } else {
        message.success(t('common:success.modify'));
        history.goBack()
      }
    } else {
      const { dat,err } = res;
      let errorNum = 0;
      if(dat!=undefined){
        const msg = Object.keys(dat).map((key) => {
          dat[key] && errorNum++;
          return dat[key];
        });

        if (!errorNum) {
          message.success(`${type === 2 ? t('common:success.clone') : t('common:success.add')}`);
          history.goBack()
        } else {
          message.error(t(msg));
        }
      }
    }
  };

  useEffect(() => {
    if (type === 1 || type === 2 || type === 3) {
      // form.setFieldsValue(processInitialValues(initialValues));
      const newData = transformAlertRules(initialValues.map(item=>processInitialValues(item))) || {};
      form.setFieldsValue(newData);
    } else {
      // form.setFieldsValue(defaultValues);
      form.setFieldsValue({strategies:[{id:undefined,strategy_name: '策略1',...defaultValues}]});
    }
    
  }, [initialValues]);

  const [activeTabKey, setActiveTabKey] = useState('0'); // 告警策略当前选中值
  const [editStrategyNameVisible, setEditStrategyNameVisible] = useState(false); // 策略名称修改模态框
  const [editingStrategyIndex, setEditingStrategyIndex] = useState<number | null>(null);
  // 新增告警策略
  // const handleAddStrategy = () => {
  //   const strategies = form.getFieldValue('strategies') || [];
  //   if (strategies.length >= 5) {
  //     message.warning("最多只能添加5个策略");
  //     return;
  //   }
  //   // const newKey = (strategies.length + 1).toString();
  //   const newStrategy = {
  //     id: undefined,
  //     // temp_strategy_id:_.uniqueId("strategy_"),
  //     strategy_name: `策略${strategies.length + 1}`,
  //     ...defaultValues
  //   };
    
  //   form.setFieldsValue({
  //     strategies: [...strategies, newStrategy],
  //   });
    
  //   setActiveTabKey(`${strategies.length}`);
  // };
  // 删除告警策略
  // const handleRemoveStrategy = (targetKey) => {
  //   const strategies = form.getFieldValue('strategies') || [];
  //   if (strategies.length <= 1) {
  //     message.warning("至少保留一个策略");
  //     return;
  //   }
  //   Modal.confirm({
  //     title: "删除策略",
  //     content: "删除后不可恢复，是否删除该策略？",
  //     okText: "确认",
  //     cancelText: "取消",
  //     onOk() {
  //       const newStrategies = strategies.filter((_, i) => i !== targetKey);
  //       form.setFieldsValue({
  //         strategies: newStrategies,
  //       });
  //       console.log("删除策略field",activeTabKey,targetKey);
  //       // 更新活动标签
  //       if (activeTabKey == targetKey) {
          
  //         setActiveTabKey('0');
  //       }
        
  //     },
  //     onCancel() {},
  //   });
  // };

  // 1. 策略名称
  const [tempStrategyName, setTempStrategyName] = useState("");

  // 打开弹窗时，设置策略名称值
  const onEditStrategyName = (index) => {
    setEditingStrategyIndex(index);
    setTempStrategyName(form.getFieldValue(["strategies", index, "strategy_name"]));
    setEditStrategyNameVisible(true);
  };


  return (
    <FormStateContext.Provider
      value={{
        disabled,
      }}
    >
      <Form form={form} layout='horizontal' disabled={disabled} >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 10px', marginBottom: 24 }}>
          <Form.Item name='disabled' hidden>
            <div />
          </Form.Item>
          <Form.Item name="strategy_id" hidden>
            <div />
          </Form.Item>
          <Base type={1} form={form} assetId={assetid?parseInt(""+assetid):0} onAssetChange={setAssets}/>

          {/* <Rule form={form} type={0} assets={assets} />
          <Effective />
          <Notify disabled={disabled} /> */}

          <Form.List name="strategies">
            {(fields, { add, remove }) => {
              console.log("fields",fields)
              if (fields.length && !fields.some(f => `${f.key}` === activeTabKey)) {
                setActiveTabKey(`${fields[0].key}`);
              }
              return (
                <Tabs
                  type="editable-card"
                  hideAdd={disabled}
                  className="alert_strategy"
                  activeKey={activeTabKey}
                  onChange={setActiveTabKey}
                  onEdit={(targetKey, action) => {
                    if (action === "add") {
                      // handleAddStrategy();
                      if (fields.length >= 5) {
                        message.warning("最多只能添加5个策略");
                        return;
                      }
                      // add({
                      //   strategy_name: `策略${fields.length + 1}`,
                      //   ...defaultValues,
                      // });
                      const newStrategy = {
                        strategy_name: `策略${fields.length + 1}`,
                        ...defaultValues,
                      };
                      add(newStrategy);
                    }
                  }}
                  addIcon={
                    <PlusSquareFilled
                      style={{ fontSize: 16, color: "#3f7be5" }}
                    />
                  }
                >
                  {fields.map((field) => {
                    // console.log("field", field);
                    return (
                      <Tabs.TabPane
                        // tab={strategy.name}
                        tab={
                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => {
                              // console.log("shouldUpdate",prev, curr);
                              return prev?.strategies[field.name]?.enable_status !== curr?.strategies[field.name]?.enable_status;
                              // return !_.isEqual(
                              //   prev.strategies,
                              //   curr.strategies
                              // );
                            }}
                          >
                            {() => (
                              <div
                                className="strategy-tab-container"
                                key={`container-${field.key}`}
                              >
                                <div className="strategy-tab-content">
                                  <span className="strategy-name">
                                    {form.getFieldValue([
                                      "strategies",
                                      field.name,
                                      "strategy_name",
                                    ])}
                                  </span>
                                  {!disabled && (
                                    <Dropdown
                                      overlay={
                                        <Menu
                                          style={{ width: "100px" }}
                                          onClick={({ key, domEvent }) => {
                                            domEvent.stopPropagation();
                                            if (key === "edit") {
                                              onEditStrategyName(field.name);
                                            } else if (key === "del") {
                                              fields.length > 1 &&
                                                Modal.confirm({
                                                  title: "删除策略",
                                                  content:
                                                    "删除后不可恢复，是否删除该策略？",
                                                  okText: "确认",
                                                  cancelText: "取消",
                                                  onOk() {
                                                    remove(field.name);
                                                  },
                                                  onCancel() {},
                                                });
                                            }
                                          }}
                                          items={[
                                            { key: "edit", label: "修改名称" },
                                            ...(fields.length > 1
                                              ? [
                                                  {
                                                    key: "del",
                                                    label: "删除",
                                                  },
                                                ]
                                              : []),
                                          ]}
                                        ></Menu>
                                      }
                                    >
                                      <EllipsisOutlined className="dropdown-icon" />
                                    </Dropdown>
                                  )}
                                </div>
                                <Tag
                                  color={
                                    form.getFieldValue([
                                      "strategies",
                                      field.name,
                                      "enable_status",
                                    ])
                                      ? "success"
                                      : "default"
                                  }
                                  className="status-tag"
                                >
                                  {form.getFieldValue([
                                    "strategies",
                                    field.name,
                                    "enable_status",
                                  ])
                                    ? "生效中"
                                    : "未生效"}
                                </Tag>
                              </div>
                            )}
                          </Form.Item>
                        }
                        key={field.key}
                        closable={false}
                      >
                        <div
                          className="alert_strategy_forms"
                          key={`froms-${field.key}`}
                        >
                          <Rule
                            form={form}
                            type={0}
                            assets={assets}
                            field={field}
                            key={`rule-${field.key}`}
                          />
                          <Effective field={field} key={`effective-${field.key}`}/>
                          <Notify disabled={disabled} field={field} key={`notify-${field.key}`}/>
                        </div>
                      </Tabs.TabPane>
                    );
                  })}
                </Tabs>
              );
            }}
          </Form.List>
          {/* 修改策略名称 */}
          {editingStrategyIndex !== null && (
            <Modal
              title="修改名称"
              visible={editStrategyNameVisible}
              onOk={() => {
                // 校验重复
                const strategies = form.getFieldValue("strategies") || [];
                const hasDuplicate = strategies.some(
                  (strategy, idx) =>
                    idx !== editingStrategyIndex && strategy.strategy_name === tempStrategyName
                );
                if (hasDuplicate) {
                  message.error("策略名称不能重复");
                  return;
                }
                form.setFields([
                  {
                    name: ["strategies", editingStrategyIndex, "strategy_name"],
                    value: tempStrategyName,
                  },
                ]);
                setEditStrategyNameVisible(false);
                setEditingStrategyIndex(null);
              }}
              onCancel={() => {
                setEditStrategyNameVisible(false);
                setEditingStrategyIndex(null);
              }}
            >
              <Form.Item
                label="策略名称"
                // name={["strategies", editingStrategyIndex, "strategy_name"]}
                rules={[
                  { required: true, message: "请输入策略名称" },
                  // 校验逻辑已在 onOk 处理
                ]}
              >
                <Input
                  placeholder="请输入策略名称"
                  maxLength={10}
                  value={tempStrategyName}
                  onChange={e => setTempStrategyName(e.target.value)}
                />
              </Form.Item>
            </Modal>
          )}

          {!disabled && (
            <Space>
              <Button
                type='primary'
                onClick={() => {
                  
                  form
                    .validateFields()
                    .then(async (values) => {
                      console.log("表单提交", values);
                      let map = {};
                      if (values["asset_id"]) {
                        getXhMonitorByAssetId(values["asset_id"]).then(
                          ({ dat }) => {
                            dat.forEach((element) => {
                              map[element.id] = element;
                            });
                          }
                        );
                      }

                      const submitValues = transformStrategyData(values);
                      console.log("表单转换后的数据", submitValues);
                      const submitArr: any[] = [];
                      submitValues.map((values, index) => {
                        if (values["asset_id"]) {
                          // getXhMonitorByAssetId(values["asset_id"]).then(({ dat }) => {
                          //     let map = {};
                          //     dat.forEach(element => {
                          //       map[element.id] = element;
                          //     });
                          handleCheck(values);
                          let replayList = new Array();
                          if (values.rule_config.queries.length > 0) {
                            let config_cn = new Array();
                            values.rule_config.queries.forEach((element) => {
                              if (element.reprom_ql) {
                                replayList.push({
                                  prom_ql: element.reprom_ql,
                                });
                              } else {
                                element.reprom_ql = element.prom_ql;
                                replayList.push({
                                  prom_ql: element.prom_ql,
                                });
                              }
                              if (
                                element.monitor_id != null &&
                                map[element.monitor_id] != null
                              ) {
                                let monitor = map[element.monitor_id];
                                config_cn.push(
                                  monitor.monitoring_name +
                                    (element.relation ? element.relation : "") +
                                    (element.value ? element.value : "")
                                );
                              }
                            });
                            values["rule_config_cn"] = config_cn.join(";");
                          }
                          values["rule_config_fe"] = JSON.stringify(
                            values["rule_config"]
                          );
                          values["rule_replay"] = {
                            queries: replayList,
                          };
                          const data = processFormValues(values) as any;
                          if (type == 2) {
                            delete data["id"];
                            delete data["strategy_id"];
                          }
                          console.log("提交data", data);
                          submitArr[index] = data;

                          // if (type === 1) {
                          //   const res = EditStrategy(data, initialValues.group_id, initialValues.id);
                          //   handleMessage(res);
                          // } else {
                          //   // console.log('groupId', initialValues.group_id);
                          //   // console.log('bgid', bgid);
                          //   const curBusiId = initialValues?.group_id || Number(bgid);
                          //   addStrategy([data], curBusiId).then(res=>{
                          //       handleMessage(res);
                          //   });
                          // }
                          // });
                        } else {
                          handleCheck(values);
                          const data = processFormValues(values) as any;
                          if (
                            data.rule_config.queries &&
                            data.rule_config.queries.length > 0
                          ) {
                            let replayList = new Array();
                            data.rule_config.queries.forEach((element) => {
                              if (element.reprom_ql) {
                                replayList.push({
                                  prom_ql: element.reprom_ql,
                                });
                              } else {
                                element.reprom_ql = element.prom_ql;
                                replayList.push({
                                  prom_ql: element.prom_ql,
                                });
                              }
                            });
                            data["rule_replay"] = {
                              queries: replayList,
                            };
                          }
                          if (type == 2) {
                            delete data["id"];
                            delete data["strategy_id"];
                          }
                          submitArr[index] = data;
                          // if (type === 1) {
                          //   const res = await EditStrategy(data, initialValues.group_id, initialValues.id);
                          //   handleMessage(res);
                          // } else {

                          //   let curBusiId = initialValues?.group_id || Number(bgid) || 1;
                          //   if(curBusiId<=0){
                          //     curBusiId = 1;
                          //   }
                          //   const res = await addStrategy([data], curBusiId);
                          //   handleMessage(res);
                          // }
                        }
                      });
                      console.log("提交的数据", submitArr);
                      if (type === 1) {
                        const res = await EditAlertRule(
                          submitArr,
                          initialValues[0]?.group_id,
                          initialValues[0]?.strategy_id
                        );
                        handleMessage(res);
                      } else {
                        let curBusiId =
                          initialValues[0]?.group_id || Number(bgid) || 1;
                        if (curBusiId <= 0) {
                          curBusiId = 1;
                        }
                        const res = await addStrategy(submitArr, curBusiId);
                        handleMessage(res);
                      }
                    })
                    .catch((err) => {
                      console.error(err);
                    });
                }}
              >
                {t('common:btn.save')}
              </Button>
              <Link to='/alert-rules'>
                <Button>{t('common:btn.cancel')}</Button>
              </Link>
            </Space>
          )}
        </div>
      </Form>
    </FormStateContext.Provider>
  );
}
