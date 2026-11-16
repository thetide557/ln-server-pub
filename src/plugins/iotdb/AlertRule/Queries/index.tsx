import React, { useContext } from 'react';
import { Form, Space, Row, Col, InputNumber, Select, Tooltip, Button } from 'antd';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
// 第六步 第4段 W1：pub 锁的 lucide-react 是 0.294.0，里面还没有 WandSparkles 这个名字
// （node_modules/lucide-react/dist/lucide-react.d.ts 里只有 Wand / Wand2），换成同类的 Wand2。
// 升 lucide-react 属依赖升级，本轮不做（阶段 0 ck 已按同一写法处理，登记在 拿不准-W0.md U-04）。
import { Wand2 as WandSparkles } from 'lucide-react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import { SqlMonacoEditor } from '@fc-components/monaco-editor';
import { DatasourceCateEnum, IS_PLUS } from '@/utils/constant';
import DocumentDrawer from '@/components/DocumentDrawer';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import AdvancedSettings from '../../components/AdvancedSettings';
import QueryName, { generateQueryName } from '@/components/QueryName';
import { MetaModal } from '../../components/Meta';
import GraphPreview from './GraphPreview';

interface IProps {
  form: any;
  prefixField?: any;
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值。第六步 第4段 W1：类型从 string[] 放宽到 (string|number)[]——羚牛的前缀里带策略下标（数字）
  prefixName?: (string | number)[]; // 列表字段名（相对路径）
  disabled?: boolean;
  datasourceValue: number | number[];
  // 第六步 第4段 W1：fe 原来在下面那处 shouldUpdate 里，直接读**顶层**的 cate 字段；
  // 羚牛的 cate 在每条策略上（['strategies', n, 'cate']），所以改成由上层传进来。
  cate?: string;
}

export default function IotDBAlertRuleQueries({ form, prefixField = {}, fullPrefixName = [], prefixName = [], disabled, datasourceValue, cate }: IProps) {
  const { t, i18n } = useTranslation('db_iotdb');
  // 第六步 第4段 W1：fe 的 ICommonState 里有 darkMode（暗色模式开关），pub 的没有（src/App.tsx 不改），
  // 照 pub 已有先例加 as any，取到 undefined = 浅色（写法同 src/components/LogQL/index.tsx:78）。
  const { darkMode } = useContext(CommonStateContext) as any;
  const datasourceID = _.isArray(datasourceValue) ? datasourceValue[0] : datasourceValue;
  // 第六步 第4段 W1（规矩 A）：useWatch 走绝对路径。fe 原文写死 ['rule_config','queries']；
  // 不传前缀时 [...[], ...['rule_config'], 'queries'] 拼出来还是它，fe 行为一字不变。
  const queries = Form.useWatch([...fullPrefixName, ...prefixName, 'queries']);

  return (
    <Form.List
      {...prefixField}
      name={[...prefixName, 'queries']}
      initialValue={[
        {
          ref: 'A',
          interval: 1,
          interval_unit: 'min',
        },
      ]}
    >
      {(fields, { add, remove }) => (
        <div>
          <FormItemLabel>{t('datasource:query.title')}</FormItemLabel>
          {fields.map((field) => {
            return (
              <CardContainer key={field.key} onClose={fields.length > 1 ? () => remove(field.name) : undefined}>
                <CardContainerHeader>
                  <Row gutter={8}>
                    <Col flex='32px'>
                      <Form.Item {...field} name={[field.name, 'ref']} initialValue={generateQueryName(_.map(queries, 'ref'))}>
                        <QueryName existingNames={_.map(queries, 'ref')} />
                      </Form.Item>
                    </Col>
                    <Col flex='auto'>
                      <InputGroupWithFormItem
                        label={
                          <Space>
                            {t('query.query')}
                            <Tooltip title={t('common:click_to_view_doc')}>
                              <QuestionCircleOutlined
                                onClick={() => {
                                  DocumentDrawer({
                                    language: i18n.language,
                                    darkMode,
                                    title: t('common:page_help'),
                                    type: 'iframe',
                                    documentPath: 'https://flashcat.cloud/docs/content/flashcat-monitor/nightingale-v9/usage/alert-notify/rules/alert-rules/query-data/iotdb/',
                                  });
                                }}
                              />
                            </Tooltip>
                          </Space>
                        }
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, 'query']}
                          validateTrigger={['onBlur']}
                          trigger='onChange'
                          rules={[{ required: true, message: t('query.query_msg') }]}
                        >
                          <SqlMonacoEditor
                            disabled={disabled}
                            maxHeight={200}
                            placeholder='SELECT * FROM table_name'
                            theme={darkMode ? 'dark' : 'light'}
                            enableAutocomplete={true}
                            enableFormat
                            renderFormatButton={() => {
                              return (
                                <Tooltip title={t('common:format_sql')}>
                                  <Button size='small' type='text' icon={<WandSparkles size={12} strokeWidth={1} />} />
                                </Tooltip>
                              );
                            }}
                          />
                        </Form.Item>
                      </InputGroupWithFormItem>
                    </Col>
                    <Col flex='none'>
                      <InputGroupWithFormItem
                        label={t('datasource:es.interval')}
                        addonAfter={
                          <Form.Item {...field} name={[field.name, 'interval_unit']} noStyle initialValue='min'>
                            <Select disabled={disabled} dropdownMatchSelectWidth={false}>
                              <Select.Option value='second'>{t('common:time.second')}</Select.Option>
                              <Select.Option value='min'>{t('common:time.minute')}</Select.Option>
                              <Select.Option value='hour'>{t('common:time.hour')}</Select.Option>
                            </Select>
                          </Form.Item>
                        }
                      >
                        <Form.Item {...field} name={[field.name, 'interval']} noStyle>
                          <InputNumber disabled={disabled} style={{ width: 80 }} />
                        </Form.Item>
                      </InputGroupWithFormItem>
                    </Col>
                    <Col flex='none'>
                      <MetaModal
                        datasourceCate={DatasourceCateEnum.iotdb}
                        datasourceValue={datasourceID}
                        onTreeNodeClick={(nodeData) => {
                          // 第六步 第4段 W1（规矩 A + 大顾问 Q1 第三节点名）：fe v9.1.0 原文见
                          // fe:src/plugins/iotdb/AlertRule/Queries/index.tsx:128-146——先 cloneDeep 整个 queries 数组、
                          // _.set 改若干项，再用 setFieldsValue 把整个 rule_config 覆盖回去。两个毛病：
                          // ① getFieldValue / setFieldsValue 是绝对路径调用，却写死表单顶层那一层（cloneDeep 那一行更是
                          //    把相对路径喂给了 getFieldValue），羚牛这里应该是 ['strategies', n, 'rule_config']；
                          // ② 整块覆盖会把同一策略里别人（触发条件那一块）刚改的值一起写回旧值。
                          // 改成 setFields 只写要改的那几个键。
                          // 原文里 keys 是「取旧的 keys 再展开、只换 metricKey / timeKey」，
                          // 直接写到 ['keys','metricKey'] / ['keys','timeKey'] 这一层等价，且不用先读旧值。
                          const queryPath = [...fullPrefixName, ...prefixName, 'queries', field.name];
                          const nextFields: { name: (string | number)[]; value: any }[] = [];
                          if (nodeData.levelType === 'field') {
                            nextFields.push({ name: [...queryPath, 'query'], value: `select time, ${nodeData.field} from ${nodeData.table}` });
                            nextFields.push({ name: [...queryPath, 'keys', 'metricKey'], value: [nodeData.field] });
                            nextFields.push({ name: [...queryPath, 'keys', 'timeKey'], value: 'time' });
                          } else {
                            nextFields.push({ name: [...queryPath, 'query'], value: `select * from ${nodeData.table}` });
                          }
                          form.setFields(nextFields);
                        }}
                      />
                    </Col>
                  </Row>
                </CardContainerHeader>
                <AdvancedSettings
                  mode='graph'
                  prefixField={field}
                  prefixName={[field.name]}
                  disabled={disabled}
                  showUnit={IS_PLUS}
                  expanded
                  datasourceCate={DatasourceCateEnum.iotdb}
                />
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue }) => {
                    // 第六步 第4段 W1：fe 原文这里是从表单**顶层**取 cate 字段，
                    // 羚牛的 cate 在每条策略上，改成用上面传进来的 cate prop。
                    const query = getFieldValue([...fullPrefixName, ...prefixName, 'queries', field.name]);

                    return <GraphPreview cate={cate} datasourceValue={datasourceID} query={query} />;
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
  );
}
