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
import { Form, Space, Button, notification, message,Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams, Link, useLocation } from 'react-router-dom';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { addStrategy, EditStrategy, getStrategiesByRuleIds } from '@/services/warning';
import Base from './Base';
import Rule from './Rule';
import queryString from 'query-string';
import './style.less'
import { getXhMonitorByAssetId } from '@/services/manage';

import Effective from './Effective';
import Notify from './Notify';
import { getFirstDatasourceId, processFormValues, processInitialValues } from './utils';
import { defaultValues } from './constants';
import { useSearchParam } from 'react-use';

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
      form.setFieldsValue(processInitialValues(initialValues));
      
    } else {
      form.setFieldsValue(defaultValues);
      
    }
    
  }, [initialValues]);

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
          <Base type={1} form={form} assetId={assetid?parseInt(""+assetid):0} onAssetChange={setAssets}/>
          <Rule form={form} type={0} assets={assets} />
          <Effective />
          <Notify disabled={disabled} />
          {/* 教育项目：添加推荐方案 */}
          <Form.Item name="handle_tip" label="推荐方案">
            <Input.TextArea placeholder="请输入推荐方案" maxLength={200}/>
          </Form.Item>

          {!disabled && (
            <Space>
              <Button
                type='primary'
                onClick={() => {
                  
                  form
                    .validateFields()
                    .then(async (values) => {
                      if(values["asset_id"]){                           
                        getXhMonitorByAssetId(values["asset_id"]).then(({ dat }) => { 
                          let map = {};                         
                          dat.forEach(element => {
                            map[element.id] = element;                            
                          });
                          handleCheck(values);
                          let replayList = new Array
                          if(values.rule_config.queries.length>0){
                            let config_cn = new Array;
                            values.rule_config.queries.forEach(element=>{
                              if (element.reprom_ql) {
                                replayList.push(
                                  {
                                    prom_ql: element.reprom_ql
                                  }
                                )
                              } else {
                                element.reprom_ql = element.prom_ql
                                replayList.push(
                                  {
                                    prom_ql: element.prom_ql
                                  }
                                )
                              }
                              if(element.monitor_id!=null && map[element.monitor_id]!=null){
                                let monitor = map[element.monitor_id];
                                config_cn.push(monitor.monitoring_name+(element.relation?element.relation:'')+(element.value?element.value:''))
                              }
                            })
                            values["rule_config_cn"] = config_cn.join(";")    
                          }
                          values["rule_config_fe"] =JSON.stringify(values["rule_config"]);  
                          values["rule_replay"] = {
                            queries: replayList
                          }  
                          const data = processFormValues(values) as any;
                          console.log(11111, data);
                          
                          
                          if (type === 1) {
                            const res = EditStrategy(data, initialValues.group_id, initialValues.id);
                            handleMessage(res);
                          } else {
                            // console.log('groupId', initialValues.group_id);
                            // console.log('bgid', bgid);
                            const curBusiId = initialValues?.group_id || Number(bgid);
                            addStrategy([data], curBusiId).then(res=>{
                                handleMessage(res);
                            })
                            
                            
                          }
                        })
                      }else{
                        handleCheck(values);
                        const data = processFormValues(values) as any;
                        if (data.rule_config.queries && data.rule_config.queries.length > 0) {
                          let replayList = new Array
                          data.rule_config.queries.forEach(element => {
                            if (element.reprom_ql) {
                              replayList.push(
                                {
                                  prom_ql: element.reprom_ql
                                }
                              )
                            } else {
                              element.reprom_ql = element.prom_ql
                              replayList.push(
                                {
                                  prom_ql: element.prom_ql
                                }
                              )
                            }
                          })
                          data["rule_replay"] = {
                            queries: replayList
                          }  
                        }
                        
                        if(type==2){
                          delete data["id"];
                        }
                        if (type === 1) {
                          const res = await EditStrategy(data, initialValues.group_id, initialValues.id);
                          handleMessage(res);
                        } else {
                          
                          let curBusiId = initialValues?.group_id || Number(bgid) || 1;
                          if(curBusiId<=0){
                            curBusiId = 1;
                          }
                          const res = await addStrategy([data], curBusiId);
                          handleMessage(res);
                        }
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
