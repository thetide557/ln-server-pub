import React, { useContext } from 'react';
import { Form, Space, Row, Col, Button, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import { SqlMonacoEditor } from '@fc-components/monaco-editor';
// 第六步 第4段 W0：fe 用的是 lucide-react 的 WandSparkles，pub 锁的 lucide-react 0.294.0 里还没有这个名字
// （node_modules/lucide-react/dist/lucide-react.d.ts 里只有 Wand / Wand2），换成同类的 Wand2，只是图标形状略有不同。
// 升 lucide-react 属于依赖升级，本轮不做（登记在 拿不准-W0.md U-04）。
import { Wand2 as WandSparkles } from 'lucide-react';
import { IS_PLUS } from '@/utils/constant';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import QueryName, { generateQueryName } from '@/components/QueryName';

import AdvancedSettings from '../../components/AdvancedSettings';
import { NAME_SPACE } from '../../constants';
import GraphPreview from './GraphPreview';

interface IProps {
  form: any;
  prefixField?: any;
  // 本文件里 fullPrefixName 的含义（fe 原有约定，见下面 :94 的用法）：**要拼在 prefixName 前面**的那一段，
  // 拼起来 [...fullPrefixName, ...prefixName] 才是从表单根算起的绝对路径。
  // fe 的告警表单是平铺的，调用方只传 prefixName=['rule_config']、fullPrefixName 留空，绝对路径就是 ['rule_config']。
  // 羚牛的表单外面套了一层 Form.List name='strategies'，就要传 fullPrefixName=['strategies']、
  // prefixName=[n,'rule_config']，绝对路径 = ['strategies', n, 'rule_config']。
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名
  disabled?: boolean;
  datasourceValue: number | number[];
  // 第六步 第4段 W0（阶段 0 · ck 试点）新增：cate（数据源类型）字段的**绝对**路径。
  // fe 里 cate 是顶层字段，羚牛的多策略表单里在 ['strategies', n, 'cate']。不传默认 ['cate']，与 fe 原样。
  catePath?: (string | number)[];
}

export default function index({ form, prefixField = {}, fullPrefixName = [], prefixName = [], disabled, datasourceValue, catePath = ['cate'] }: IProps) {
  const { t } = useTranslation(NAME_SPACE);
  // 第六步 第4段 W0：fe 的 ICommonState 里有 darkMode（暗色模式开关），pub 的没有（src/App.tsx 不改），
  // 照 pub 已有先例加 as any，取到 undefined = 浅色（写法同 src/components/LogQL/index.tsx:78）。
  const { darkMode } = useContext(CommonStateContext) as any;
  const datasourceID = _.isArray(datasourceValue) ? datasourceValue[0] : datasourceValue;
  // 第六步 第4段 W0：fe 这里写死的是 Form.useWatch(['rule_config', 'queries'])。
  // antd 的 useWatch 拿的是从表单根算起的绝对路径、不吃 Form.List 的相对前缀
  //（node_modules/rc-field-form/lib/useWatch.js 里 getValue(store, namePathRef.current)），
  // 所以改成按同一份前缀拼绝对路径。fe 的调用方（fullPrefixName 空、prefixName=['rule_config']）拼出来
  // 仍然是 ['rule_config', 'queries']，一字不变。
  const queries = Form.useWatch([...fullPrefixName, ...prefixName, 'queries']);

  return (
    <>
      <Form.List
        {...prefixField}
        name={[...prefixName, 'queries']}
        initialValue={[
          {
            ref: 'A',
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <div>
            <FormItemLabel>{t('datasource:query.title')}</FormItemLabel>
            {fields.map((field, index) => {
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
                        <div className='tdengine-discover-query'>
                          <InputGroupWithFormItem label={<Space>{t('query.query')}</Space>}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'sql']}
                              validateTrigger={['onBlur']}
                              trigger='onChange'
                              rules={[{ required: true, message: t('datasource:query.query_required') }]}
                            >
                              <SqlMonacoEditor
                                disabled={disabled}
                                maxHeight={200}
                                placeholder='SELECT count(*) as count FROM db_name.table_name'
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
                        </div>
                      </Col>
                    </Row>
                  </CardContainerHeader>
                  <AdvancedSettings mode='graph' prefixField={field} prefixName={[field.name]} disabled={disabled} expanded showUnit={IS_PLUS} />
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      // 第六步 第4段 W0：fe 这里是 getFieldValue('cate')（顶层字段）；
                      // 羚牛多策略表单里 cate 在 ['strategies', n, 'cate']，所以改成走 catePath（默认 ['cate']，fe 原样）。
                      const cate = getFieldValue(catePath);
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
    </>
  );
}
