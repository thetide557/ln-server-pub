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
import React, { useEffect, useRef, useState } from 'react';
import { Form, Select, Space, Row, Col, Button, Tooltip, Modal, Table } from 'antd';
import { WarningOutlined, PlusCircleOutlined, MinusCircleOutlined, InfoCircleOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { Trans, useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Link } from 'react-router-dom';

import { getDatasourceBriefList } from '@/services/common';
import { IS_ENT } from '@/utils/constant';
import DatasourceSelectExtra from '@/pages/alertRules/Form/components/DatasourceSelectExtra';

import { getDatasourcesByQueries } from './services';
import './style.less';

interface IProps {
  datasourceList: { id: number; name: string }[];
  reloadGroupedDatasourceList: () => void;
  datasourceCate?: string;
  names?: (string | number)[];
  // ---- 第六步 第4段 W2（阶段 2）改动 1/3：新增 absNames，默认等于 names，fe 自己调用时两者相同、行为不变。
  // 为什么要分两条路径：羚牛一条规则下可以有多个策略，表单里是 <Form.List name="strategies">
  //（src/pages/alertRules/Form/index.tsx:198,341-346），Metric/index.tsx 就渲染在它的 children 里。
  // rc-field-form 的 List 会把父 List 的前缀接在自己的 name 前面
  //（node_modules/rc-field-form/lib/List.js:40-43），所以下面 <Form.List name={names}> 只能收**相对**路径
  // [field.name, 'datasource_queries']；而 Form.useWatch / form.getFieldValue / form.setFieldsValue
  // 反过来不吃这个前缀（node_modules/rc-field-form/lib/useWatch.js:53,69,78 直接按原路径从整份 store 取），
  // 必须收**绝对**路径 ['strategies', field.name, 'datasource_queries']。
  // 同一件事 W0 在 ck 编辑器上已经踩过（Form/Rule/Rule/Metric/index.tsx:178-182 的注释）。
  // 登记：第六步-流水线/第4段/拿不准-W2.md 第 2 条。
  absNames?: (string | number)[];
  required?: boolean;
  disabled?: boolean;
  showExtra?: boolean;
}

const getInvalidDatasourceIds = (ids: number[], fullDatasourceList: any[]) => {
  const invalid = _.filter(ids, (item) => {
    const result = _.find(fullDatasourceList, { id: item });
    if (result) {
      return !result.cluster_name;
    }
  }) as number[];

  return invalid;
};

const isEmptyExactMatchQuery = (queries: any[]) => {
  if (queries.length > 1) {
    return false;
  }

  const firstQuery = queries[0] || {};
  return firstQuery.match_type === 0 && _.isEmpty(firstQuery.values);
};

function Query({ idx, names, field, remove, invalidDatasourceIds, datasourceList, disabled, fields }) {
  const { t } = useTranslation('alertRules');
  const form = Form.useFormInstance();
  const match_type = Form.useWatch([...names, field.name, 'match_type']);

  return (
    <Row gutter={8}>
      {idx > 0 && (
        <Col flex='none'>
          <div className='alert-rule-datasource-and'>{t('common:and')}</div>
        </Col>
      )}

      <Col flex='200px'>
        <Form.Item {...field} name={[field.name, 'match_type']} initialValue={0}>
          <Select
            disabled={disabled}
            options={[
              {
                label: t('common:datasource.queries.match_type_2'),
                value: 2,
              },
              {
                label: t('common:datasource.queries.match_type_0'),
                value: 0,
              },
              {
                label: (
                  <Space>
                    {t('common:datasource.queries.match_type_1')}
                    <Tooltip
                      title={
                        <Trans
                          i18nKey='common:datasource.queries.match_type_1_tip'
                          components={{
                            br: <br />,
                          }}
                        />
                      }
                    >
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                ),
                value: 1,
              },
            ]}
            onChange={() => {
              const values = _.cloneDeep(form.getFieldsValue());
              _.set(values, [...names, field.name, 'values'], []);
              form.setFieldsValue(values);
            }}
          />
        </Form.Item>
      </Col>
      {match_type !== 2 && (
        <>
          <Col flex='80px'>
            <Form.Item {...field} name={[field.name, 'op']} initialValue='in'>
              <Select
                disabled={disabled}
                options={[
                  {
                    label: t('common:datasource.queries.op_in'),
                    value: 'in',
                  },
                  {
                    label: t('common:datasource.queries.op_not_in'),
                    value: 'not in',
                  },
                ]}
              />
            </Form.Item>
          </Col>
          <Col flex='auto'>
            <Form.Item
              {...field}
              name={[field.name, 'values']}
              rules={[
                {
                  required: true,
                  message: t('common:datasource.id_required'),
                },
                {
                  validator(rule, value, callback) {
                    if (_.isEmpty(invalidDatasourceIds)) {
                      callback();
                    } else {
                      callback('invalidDatasourceIds');
                    }
                  },
                  message: '', // label 右侧已经显示，这里就不显示 error msg
                },
              ]}
            >
              <Select
                disabled={disabled}
                mode={match_type === 0 ? 'multiple' : 'tags'}
                tokenSeparators={[' ']}
                open={match_type === 1 ? false : undefined}
                options={_.map(datasourceList, (item) => {
                  return {
                    value: item.id,
                    label: item.name,
                  };
                })}
                optionFilterProp='label'
              />
            </Form.Item>
          </Col>
        </>
      )}
      {fields.length > 1 && (
        <Col flex='none'>
          <MinusCircleOutlined
            className='mt-2'
            onClick={() => {
              remove(field.name);
            }}
          />
        </Col>
      )}
    </Row>
  );
}

export default function index(props: IProps) {
  const { datasourceList, reloadGroupedDatasourceList, datasourceCate, names = ['datasource_queries'], absNames = names, disabled, showExtra } = props;
  const { t } = useTranslation('alertRules');
  const [fullDatasourceList, setFullDatasourceList] = useState<any[]>([]);
  const [datasources, setDatasources] = useState<any[]>([]);
  const [invalidDatasourceIds, setInvalidDatasourceIds] = useState<number[]>([]);
  const form = Form.useFormInstance();
  const datasource_cate = datasourceCate || Form.useWatch(['cate']);
  const datasource_queries = Form.useWatch(absNames); // 第六步 W2：绝对路径，见 IProps 上的注释
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  // ---- 第六步 第4段 W2（阶段 2）改动 3/3：预览降级。
  // 「这条规则会命中哪几个数据源」是问后端要的（POST /api/n9e/datasource/query），
  // 羚牛把这条路由漏搬了（夜莺基线 4f150ab7:center/router/router.go:290,327 有；
  // 羚牛 ln-server/center/router/router.go 零命中），后端待办 R1。
  // 所以这里兜一个失败状态：预览区改显示「预览不可用」，**不弹全局错误、也不挡保存**。
  // services.ts 里的请求本来就带 silence: true，pub 的 @/utils/request 认这个开关
  //（src/utils/request.ts:17,26：silence 时不 message.error，但仍然把错误抛出来），
  // 所以必须在这里 .catch 住，否则是一个没人接的 Promise 拒绝。
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const autoDefaultCheckedCateRef = useRef<string>();
  const fetchDatasourceList = () => {
    getDatasourceBriefList().then((res) => {
      setFullDatasourceList(res);
    });
  };

  useEffect(() => {
    if (!_.isEmpty(datasource_queries)) {
      getDatasourcesByQueries({
        datasource_cate,
        datasource_queries,
      })
        .then((res) => {
          setPreviewUnavailable(false);
          setDatasources(res);
          const datasourceIds = _.map(res, 'id');
          const invalidDatasourceIds = getInvalidDatasourceIds(datasourceIds, fullDatasourceList);
          setInvalidDatasourceIds(invalidDatasourceIds);
          form.setFieldsValue({
            datasource_value: _.head(datasourceIds), // 取第一个数据用于数据预览等地方
            datasource_values: datasourceIds, // 保存所有查询的数据源 id
          });
        })
        // 第六步 W2：接口不存在（404）或报错时只把预览标成不可用，别的什么都不做——
        // 表单里的 datasource_queries 照样能保存，编辑器要的那个「单个数据源 id」由
        // Form/utils.ts 的 resolveDatasourceIdsByQueries 在本地按后端同一套算法算。
        .catch(() => {
          setPreviewUnavailable(true);
          setDatasources([]);
          setInvalidDatasourceIds([]);
        });
    }
  }, [datasource_cate, JSON.stringify(datasource_queries), JSON.stringify(fullDatasourceList)]);

  useEffect(() => {
    if (!datasource_cate || _.isEmpty(datasourceList) || autoDefaultCheckedCateRef.current === datasource_cate) {
      return;
    }

    autoDefaultCheckedCateRef.current = datasource_cate;

    if (datasourceList.length !== 1) {
      return;
    }

    const queries = form.getFieldValue(absNames) || [];
    if (!isEmptyExactMatchQuery(queries)) {
      return;
    }

    const firstQuery = queries[0] || {};
    // ---- 第六步 第4段 W2（阶段 2）改动 2/3：fe 原文是 form.setFieldsValue(_.set({}, names, [ … ]))。
    // 在羚牛的多策略表单里这句会造出 { strategies: [ { datasource_queries: […] } ] }，
    // 而 rc-field-form 合并新值时只对「纯对象」递归、数组整体替换
    //（node_modules/rc-field-form/lib/utils/valueUtil.js:70-71,90-91），
    // 结果是整条 strategies 被换成只剩一项、那一项只剩 datasource_queries——别的策略和别的字段全丢。
    // 改成 V2 自己在 Query 的 onChange 里已经用的写法（本文件 :109-111）：先整份克隆表单值，再按绝对路径改一项。
    // 登记：第六步-流水线/第4段/拿不准-W2.md 第 3 条。
    const nextValues = _.cloneDeep(form.getFieldsValue());
    _.set(nextValues, absNames, [
      {
        ...firstQuery,
        match_type: 0,
        op: firstQuery.op || 'in',
        values: [datasourceList[0].id],
      },
    ]);
    form.setFieldsValue(nextValues);
  }, [datasource_cate, JSON.stringify(datasourceList)]);

  useEffect(() => {
    fetchDatasourceList();
  }, []);

  return (
    <>
      <Form.List
        name={names}
        initialValue={[
          {
            match_type: 0,
            op: 'in',
            values: [],
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <div>
            <div className='mb-2'>
              <Space>
                {t('common:datasource.queries.label')}
                <PlusCircleOutlined
                  onClick={() =>
                    add({
                      match_type: 0,
                      op: 'in',
                      values: [],
                    })
                  }
                />
                <Tooltip title={t('common:datasource.managePageLink')}>
                  <Link to={IS_ENT ? '/settings/source/timeseries' : '/datasources'} target='_blank'>
                    <SettingOutlined />
                  </Link>
                </Tooltip>
                <ReloadOutlined
                  onClick={() => {
                    reloadGroupedDatasourceList();
                  }}
                />
                <Button
                  size='small'
                  type='primary'
                  ghost
                  onClick={() => {
                    setPreviewModalVisible(true);
                  }}
                >
                  {t('common:datasource.preview')}
                </Button>
                {/* 第六步 W2：后端没有 POST /api/n9e/datasource/query 时，这里给一句话说明，不影响保存 */}
                {previewUnavailable && (
                  <span className='alert-rule-datasource-preview-unavailable' style={{ color: 'var(--fc-text-3, #8c8c8c)' }}>
                    {t('common:datasource.queries.preview_unavailable')}
                  </span>
                )}
                {showExtra && <DatasourceSelectExtra />}
                {!_.isEmpty(invalidDatasourceIds) && (
                  <span style={{ color: '#ff4d4f' }}>
                    <Tooltip
                      overlayClassName='ant-tooltip-with-link'
                      title={
                        <div
                          style={{
                            padding: '0 4px',
                          }}
                        >
                          {_.map(invalidDatasourceIds, (item) => {
                            const result = _.find(fullDatasourceList, { id: item });
                            if (result) {
                              let url = `/datasources/edit/${result.plugin_type}/${result.id}`;
                              if (IS_ENT) {
                                const cateMap = {
                                  timeseries: 'datasource',
                                  logging: 'logsource',
                                };
                                url = `/settings/${cateMap[result.category]}/edit/${result.id}`;
                                if (result.category === 'logging') {
                                  url = `/settings/${cateMap[result.category]}/edit/${result.plugin_type}/${result.id}`;
                                }
                              }
                              return (
                                <Link style={{ padding: '0 4px' }} target='_blank' to={url}>
                                  {result.name}
                                </Link>
                              );
                            }
                          })}
                        </div>
                      }
                    >
                      <span>
                        <WarningOutlined /> {t('invalid_datasource_tip_1')}
                      </span>
                    </Tooltip>

                    <span className='pl-2'>{t('invalid_datasource_tip_2')}</span>
                    <a
                      className='pl-2'
                      onClick={(e) => {
                        e.preventDefault();
                        fetchDatasourceList();
                      }}
                    >
                      {t('invalid_datasource_reload')}
                    </a>
                  </span>
                )}
              </Space>
            </div>
            {fields.map((field, index) => {
              return (
                <Query
                  key={field.name}
                  idx={index}
                  // 第六步 W2：Query 内部两处用法都是按整份表单值取的
                  //（本文件 :64 的 Form.useWatch([...names, field.name,'match_type'])、
                  //  :109-111 的 _.set(整份表单值, [...names, field.name,'values'], [])），所以给绝对路径。
                  names={absNames}
                  field={field}
                  remove={remove}
                  invalidDatasourceIds={invalidDatasourceIds}
                  datasourceList={datasourceList}
                  disabled={disabled}
                  fields={fields}
                />
              );
            })}
          </div>
        )}
      </Form.List>
      <Modal
        visible={previewModalVisible}
        title={t('common:datasource.queries.preview')}
        footer={null}
        onCancel={() => {
          setPreviewModalVisible(false);
        }}
      >
        {/* 第六步 W2：取不到预览数据时，弹窗里显示同一句「预览不可用」，不显示一张空表 */}
        {previewUnavailable ? (
          <div className='alert-rule-datasource-preview-unavailable'>{t('common:datasource.queries.preview_unavailable')}</div>
        ) : (
          <Table
            size='small'
            pagination={false}
            rowKey='id'
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
              },
              {
                title: t('common:datasource.name'),
                dataIndex: 'name',
              },
            ]}
            dataSource={datasources}
          />
        )}
      </Modal>
    </>
  );
}
