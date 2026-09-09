import React, { useContext } from 'react';
import { Form, Space, Row, Col, Input, Alert, Button, Tooltip } from 'antd';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import _ from 'lodash';
import { useTranslation, Trans } from 'react-i18next';

import { CommonStateContext } from '@/App';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import QueryName, { generateQueryName } from '@/components/QueryName';
import DocumentDrawer from '@/components/DocumentDrawer';

import { NAME_SPACE, DEFAULT_QUERY } from '../../constants';
import GraphPreview from './GraphPreview';

interface IProps {
  prefixField?: any;
  // 第六步 第4段 W1-日志组：类型从 string[] 放宽到 (string|number)[]——羚牛的前缀里带策略下标（数字）。
  // 同 ck 样板 src/plugins/clickHouse/AlertRule/Queries/index.tsx 的同名两个字段。
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名（相对路径）
  disabled?: boolean;
  datasourceValue: number | number[];
}

export default function index({ prefixField = {}, fullPrefixName = [], prefixName = [], disabled, datasourceValue }: IProps) {
  const { t, i18n } = useTranslation(NAME_SPACE);
  // 第六步 第4段 W1-日志组：fe 的 ICommonState 里有 darkMode（暗色模式开关），pub 的没有（src/App.tsx 不改），
  // 照 pub 已有先例加 as any，取到 undefined = 浅色（写法同 src/components/LogQL/index.tsx:78，与阶段 0 的 ck 一致）。
  const { darkMode } = useContext(CommonStateContext) as any;
  const datasourceID = _.isArray(datasourceValue) ? datasourceValue[0] : datasourceValue;
  // 第六步 第4段 W1-日志组（规矩 A）：useWatch 走绝对路径。fe 原文写死 ['rule_config','queries']；
  // 不传前缀时 [...[], ...['rule_config'], 'queries'] 拼出来还是它，fe 行为一字不变。
  const queries = Form.useWatch([...fullPrefixName, ...prefixName, 'queries']);

  return (
    <>
      <Form.List
        {...prefixField}
        name={[...prefixName, 'queries']}
        initialValue={[
          {
            ref: 'A',
            query: DEFAULT_QUERY,
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <div>
            <FormItemLabel>{t('datasource:query.title')}</FormItemLabel>
            {fields.map((field) => {
              return (
                <CardContainer key={field.key} onClose={fields.length > 1 ? () => remove(field.name) : undefined}>
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const query = getFieldValue([...fullPrefixName, ...prefixName, 'queries', field.name]);
                      const queryValue = query?.query;
                      if (!queryValue || _.includes(queryValue, '_time')) return null;
                      return <Alert className='mb-2' type='warning' message={<Trans ns={NAME_SPACE} i18nKey='alert.query_warning_no_time' components={{ b: <strong /> }} />} />;
                    }}
                  </Form.Item>
                  <CardContainerHeader>
                    <Row gutter={8}>
                      <Col flex='32px'>
                        <Form.Item {...field} name={[field.name, 'ref']} initialValue={generateQueryName(_.map(queries, 'ref'))}>
                          <QueryName existingNames={_.map(queries, 'ref')} />
                        </Form.Item>
                      </Col>
                      <Col flex='auto'>
                        <div className='tdengine-discover-query'>
                          <InputGroupWithFormItem
                            label={
                              <Space>
                                {t('explorer.query')}
                                <Tooltip title={t('common:click_to_view_doc')}>
                                  <QuestionCircleOutlined
                                    onClick={() => {
                                      DocumentDrawer({
                                        language: i18n.language,
                                        darkMode,
                                        title: t('common:page_help'),
                                        type: 'iframe',
                                        documentPath:
                                          'https://flashcat.cloud/docs/content/flashcat-monitor/nightingale-v9/usage/alert-notify/rules/alert-rules/query-data/victorialogs/',
                                      });
                                    }}
                                  />
                                </Tooltip>
                              </Space>
                            }
                          >
                            <Form.Item {...field} name={[field.name, 'query']}>
                              <Input.TextArea autoSize={{ minRows: 0 }} />
                            </Form.Item>
                          </InputGroupWithFormItem>
                        </div>
                      </Col>
                    </Row>
                  </CardContainerHeader>
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const query = getFieldValue([...fullPrefixName, ...prefixName, 'queries', field.name]);

                      return <GraphPreview datasourceValue={datasourceID} query={query} />;
                    }}
                  </Form.Item>
                </CardContainer>
              );
            })}
            <Button
              className='w-full'
              type='dashed'
              onClick={() => {
                add({
                  query: DEFAULT_QUERY,
                  interval: 1,
                  interval_unit: 'min',
                });
              }}
              icon={<PlusOutlined />}
            >
              {t('datasource:query.title')}
            </Button>
          </div>
        )}
      </Form.List>
    </>
  );
}
