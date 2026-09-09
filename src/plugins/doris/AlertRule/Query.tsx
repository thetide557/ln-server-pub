import React, { useEffect, useState, useContext } from 'react';
import { Form, Select, Space, Tooltip, Alert, InputNumber, Button, Segmented, Modal } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation, Trans } from 'react-i18next';
import { SqlMonacoEditor, SqlMonacoPreview } from '@fc-components/monaco-editor';
// 第六步 第4段 W1-SQL组：pub 锁的 lucide-react 是 0.294.0，里面还没有 WandSparkles 这个名字
// （node_modules/lucide-react/dist/lucide-react.d.ts 里只有 Wand / Wand2），换成同类的 Wand2。
// 升 lucide-react 属依赖升级，本轮不做（做法与阶段 0 的 ck 样板一致，登记在 拿不准-SQL组.md U-02）。
import { Wand2 as WandSparkles } from 'lucide-react';

import { CommonStateContext } from '@/App';
import { IS_PLUS } from '@/utils/constant';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import QueryName, { generateQueryName } from '@/components/QueryName';
import { normalizeTime } from '@/pages/alertRules/Form/utils';
import { FormStateContext } from '@/pages/alertRules/Form';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';

import { NAME_SPACE, DORIS_SQL_MODE_DOC_URL } from '../constants';
import AdvancedSettings from '../components/AdvancedSettings';
import BuilderModal from '../components/BuilderModal';
import BuilderConfigRequiredItem from '../components/BuilderConfigRequiredItem';
import GraphPreview from './GraphPreview';

interface Props {
  datasourceId: number;
  field: any;
  dbList: string[];
  disabled?: boolean;
  // 第六步 第4段 W1-SQL组：rule_config 的**绝对**路径（含义 = 上层的 absPrefix，
  // 羚牛下是 ['strategies', n, 'rule_config']，fe 下是 ['rule_config']）。
  // 本文件里 useWatch / setFields / getFieldValue 全是绝对路径调用（规矩 A），一律从它拼。
  // 缺省值 ['rule_config'] = fe 原状，不传就和 fe 一字不差。
  fullPrefixName?: (string | number)[];
  // 第六步 第4段 W1-SQL组：fe 原文在下面 shouldUpdate 里读**顶层** cate 字段；
  // 羚牛的 cate 在每条策略上，改成由上层传进来。
  cate?: string;
  onClose?: () => void;
}

export default function Query(props: Props) {
  const { t } = useTranslation(NAME_SPACE);
  const { darkMode } = useContext(CommonStateContext);
  // 第六步 第4段 W1-SQL组：fe 的 FormStateContext 有 { disabled, type }（fe Form/index.tsx:42-45），
  // 羚牛那份只有 { disabled }（pub src/pages/alertRules/Form/index.tsx:45-47，本轮不许改挂点）。
  // 这里加 as any 让编译过；运行时 type 取到 undefined，下面 showDatabase 恒为 false —— 后果登记在 拿不准-SQL组.md U-01。
  const { type } = useContext(FormStateContext) as any;
  const { datasourceId, field, dbList, disabled, onClose, fullPrefixName = ['rule_config'], cate } = props;
  const [sqlWarningI18nKey, setSqlWarningI18nKey] = useState<string>('');
  const [builderModalVisible, setBuilderModalVisible] = useState(false);
  const form = Form.useFormInstance();
  // 第六步 第4段 W1-SQL组（规矩 A）：useWatch 走绝对路径，从 fullPrefixName 拼。
  const queries = Form.useWatch([...fullPrefixName, 'queries']);
  const query = queries?.[field.name];
  const editMode = query?.editMode ?? 'code';
  const sql = query?.sql;
  const database = query?.database;

  // 新增/查看规则时隐藏数据库字段；编辑/克隆规则时仅当已有数据库配置时才显示, 且仅在代码模式下显示
  const showDatabase = editMode === 'code' && (type === 1 || type === 2) ? !!database : false;

  useEffect(() => {
    if (!sql) {
      setSqlWarningI18nKey('');
      return;
    }
    // 如果查询条件中没包含关键字（不区分大小写，TIMESTAMP、DATE、INTERVAL、DATE_TRUNC、NOW()、$__timeFilter）
    const warningKeywords = ['TIMESTAMP', 'DATE', 'INTERVAL', 'DATE_TRUNC', 'NOW()', '$__timeFilter'];
    const hasKeyword = warningKeywords.some((keyword) => {
      return _.includes(_.upperCase(sql), _.upperCase(keyword));
    });
    if (!hasKeyword) {
      setSqlWarningI18nKey('query.sql_warning_1');
    } else if (_.includes(sql, '$__timeGroup')) {
      setSqlWarningI18nKey('query.sql_warning_2');
    } else {
      setSqlWarningI18nKey('');
    }
  }, [sql]);

  return (
    <CardContainer key={field.key} onClose={onClose}>
      <CardContainerHeader>
        <Form.Item {...field} name={[field.name, 'editMode']} initialValue='code' hidden>
          <input type='hidden' />
        </Form.Item>
        <Space>
          <Form.Item {...field} name={[field.name, 'ref']} initialValue={generateQueryName(_.map(queries, 'ref'))}>
            <QueryName existingNames={_.map(queries, 'ref')} />
          </Form.Item>
          {IS_PLUS && (
            <Form.Item>
              <Segmented
                value={editMode}
                disabled={disabled}
                options={[
                  { label: 'Builder', value: 'builder' },
                  { label: 'Code', value: 'code' },
                ]}
                onChange={(value) => {
                  if (value === 'builder' && editMode === 'code') {
                    const sqlValue = _.get(queries, [field.name, 'sql']);
                    if (sqlValue) {
                      Modal.confirm({
                        title: t('query.editMode.switch_to_builder_confirm_title'),
                        content: t('query.editMode.switch_to_builder_confirm_content'),
                        onOk: () => {
                          form.setFields([
                            {
                              name: [...fullPrefixName, 'queries', field.name, 'editMode'],
                              value: 'builder',
                            },
                            {
                              name: [...fullPrefixName, 'queries', field.name, 'sql'],
                              value: undefined,
                            },
                            {
                              name: [...fullPrefixName, 'queries', field.name, 'builderConfig'],
                              value: undefined,
                            },
                          ]);
                        },
                      });
                      return;
                    }
                  }
                  form.setFields([
                    {
                      name: [...fullPrefixName, 'queries', field.name, 'editMode'],
                      value,
                    },
                  ]);
                }}
              />
            </Form.Item>
          )}
          {showDatabase && (
            <InputGroupWithFormItem label={t('query.database')}>
              <Form.Item {...field} name={[field.name, 'database']}>
                <Select style={{ width: 200 }} disabled={disabled}>
                  {dbList.map((db) => (
                    <Select.Option key={db} value={db}>
                      {db}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </InputGroupWithFormItem>
          )}
          <InputGroupWithFormItem
            label={
              <Space>
                {t('query.interval')}
                <Tooltip
                  title={
                    <Trans
                      ns={NAME_SPACE}
                      i18nKey='query.interval_tip'
                      components={{
                        br: <br />,
                      }}
                    />
                  }
                >
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            addonAfter={
              <Form.Item {...field} name={[field.name, 'interval_unit']} initialValue='min'>
                <Select disabled={disabled} dropdownMatchSelectWidth={false}>
                  <Select.Option value='second'>{t('common:time.second')}</Select.Option>
                  <Select.Option value='min'>{t('common:time.minute')}</Select.Option>
                  <Select.Option value='hour'>{t('common:time.hour')}</Select.Option>
                </Select>
              </Form.Item>
            }
          >
            <Form.Item {...field} name={[field.name, 'interval']}>
              <InputNumber disabled={disabled} style={{ width: 80 }} min={0} />
            </Form.Item>
          </InputGroupWithFormItem>
        </Space>
      </CardContainerHeader>
      {editMode === 'builder' && (
        <div className='mb-4'>
          {sql && (
            <CardContainer className='mb-4 bg-fc-150'>
              <SqlMonacoPreview theme={darkMode ? 'dark' : 'light'} value={sql} />
            </CardContainer>
          )}
          <Tooltip title={!datasourceId ? t('query.datasource_disabled_tip') : undefined}>
            <Button
              disabled={disabled || !datasourceId}
              onClick={() => {
                setBuilderModalVisible(true);
              }}
            >
              {t('builder.open_builder')}
            </Button>
          </Tooltip>
          <BuilderConfigRequiredItem name={[field.name, 'builderConfig']} message={t('builder.config_required')} />
          <Form.Item name={[field.name, 'sql']} hidden rules={[{ required: true, message: t('datasource:query.query_required') }]}>
            <input type='hidden' />
          </Form.Item>
          <BuilderModal
            visible={builderModalVisible}
            datasourceId={datasourceId}
            builderConfig={query?.builderConfig}
            onCancel={() => {
              setBuilderModalVisible(false);
            }}
            onConfirm={(builderConfig, res) => {
              form.setFields([
                {
                  name: [...fullPrefixName, 'queries', field.name, 'sql'],
                  value: res.sql,
                },
                {
                  name: [...fullPrefixName, 'queries', field.name, 'builderConfig'],
                  value: builderConfig,
                  errors: [],
                },
                {
                  name: [...fullPrefixName, 'queries', field.name, 'keys', 'valueKey'],
                  value: res.value_key,
                },
                {
                  name: [...fullPrefixName, 'queries', field.name, 'keys', 'labelKey'],
                  value: res.label_key,
                },
              ]);
              setBuilderModalVisible(false);
            }}
          />
        </div>
      )}
      {editMode === 'code' && (
        <InputGroupWithFormItem
          label={
            <Space>
              SQL
              <Tooltip
                overlayClassName='ant-tooltip-with-link ant-tooltip-auto-width'
                title={
                  <Trans
                    ns='db_doris'
                    i18nKey='query.query_tip'
                    components={{
                      br: <br />,
                      a: <a href={DORIS_SQL_MODE_DOC_URL} target='_blank' />,
                    }}
                  />
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          }
        >
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
              placeholder={t('query.query_placeholder')}
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
      )}
      {sqlWarningI18nKey && (
        <Alert
          className='mb-4'
          type='warning'
          message={
            <Trans
              ns={NAME_SPACE}
              i18nKey={sqlWarningI18nKey}
              components={{
                b: <strong />,
              }}
            />
          }
        />
      )}
      <AdvancedSettings prefixField={field} prefixName={[field.name]} disabled={disabled} showUnit={IS_PLUS} showOffset span={6} expanded />
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          // 第六步 第4段 W1-SQL组：fe 原文这里是从表单**顶层**取 cate 字段，
          // 羚牛的 cate 在每条策略上，改成用上面传进来的 cate prop。
          const sql = getFieldValue([...fullPrefixName, 'queries', field.name, 'sql']);
          const database = getFieldValue([...fullPrefixName, 'queries', field.name, 'database']);
          const interval = getFieldValue([...fullPrefixName, 'queries', field.name, 'interval']);
          const interval_unit = getFieldValue([...fullPrefixName, 'queries', field.name, 'interval_unit']);
          const intervalValue = normalizeTime(interval, interval_unit);
          const offset = getFieldValue([...fullPrefixName, 'queries', field.name, 'offset']);

          return <GraphPreview cate={cate} datasourceValue={datasourceId} sql={sql} database={database} interval={intervalValue} offset={offset} />;
        }}
      </Form.Item>
    </CardContainer>
  );
}
