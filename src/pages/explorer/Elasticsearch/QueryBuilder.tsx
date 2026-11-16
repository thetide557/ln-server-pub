import React, { useState, useEffect, useRef, useContext } from 'react';
import _ from 'lodash';
import { useDebounceFn } from 'ahooks';
import { useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Tooltip, Form, AutoComplete, Button, FormInstance, Select, Row, Col } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

// step6f（ES 升级轮）：原来是 `import TimeRangePicker from '@/components/TimeRangePicker'`。
// fe v9.1.0 的时间选择器多两个 props：`ajustTimeOptions`（往下拉里插「最近 5/15/30 秒」这几档）
// 和 `showMillisecond`（时间精确到毫秒）；羚牛 pub 那份还是老版，两个都没有
//（pub `src/components/TimeRangePicker/index.tsx`）。pub 现有共享文件不许改，
// 这里把组件的类型放宽成 any 让 tsc 过去——运行时这两个 props 会被 pub 的组件忽略，
// 也就是 ES 查询栏里没有秒级快捷档、时间不显示毫秒，其余照常。已登记。
import _TimeRangePicker from '@/components/TimeRangePicker';
const TimeRangePicker: any = _TimeRangePicker;
// step6f（ES 升级轮）：原来指向 '@/components/InputGroupWithFormItem'。pub 那个公共组件是老版、不支持 addonAfter，
// pub 现有共享文件不许改，改指本层的本地副本（原因见该文件开头）。已登记。
import InputGroupWithFormItem from './components/InputGroupWithFormItem';
import KQLInput from '@/components/KQLInput';
import DocumentDrawer from '@/components/DocumentDrawer';
import { CommonStateContext } from '@/App';
import ConditionHistoricalRecords from '@/components/HistoricalRecords/ConditionHistoricalRecords';

import { getIndices, getFullFields, Field } from './services';
import InputFilter from './InputFilter';
import { CACHE_KEY_MAP, SYNTAX_OPTIONS } from './index';

interface Props {
  onExecute: () => void;
  datasourceValue?: number;
  setFields: (fields: Field[]) => void;
  allowHideSystemIndices?: boolean;
  form: FormInstance;
  loading: boolean;
  setHistory: () => void;
  resetFilters: () => void;
}

export default function QueryBuilder(props: Props) {
  const { t, i18n } = useTranslation('explorer');
  // step6f（ES 升级轮）：fe 的 ICommonState 有 darkMode（暗色模式），pub 的没有（`src/App.tsx:73-108`）。
  // pub 现有文件不许改，加 as any 取一下：pub 上取到 undefined，等于一直亮色，和 pub 现在的表现一致。已登记。
  const { darkMode } = useContext(CommonStateContext) as any;
  const { onExecute, datasourceValue, setFields, allowHideSystemIndices = false, form, loading, setHistory, resetFilters } = props;
  const params = new URLSearchParams(useLocation().search);
  const [indexOptions, setIndexOptions] = useState<any[]>([]);
  const [indexSearch, setIndexSearch] = useState('');
  const [dateFields, setDateFields] = useState<Field[]>([]);
  const indexValue = Form.useWatch(['query', 'index']);
  const date_field = Form.useWatch(['query', 'date_field']);
  const syntax = Form.useWatch(['query', 'syntax']);
  const [allFields, setAllFields] = useState<Field[]>([]);
  const refInputFilter = useRef<any>();
  const initialized = useRef<boolean>(false);
  const { run: onIndexChange } = useDebounceFn(
    (val) => {
      if (datasourceValue && val) {
        getFullFields(datasourceValue, val, {
          type: 'date',
          allowHideSystemIndices,
        }).then((res) => {
          setFields(res.allFields);
          setAllFields(res.allFields);
          setDateFields(res.fields);
          // 如果没有初始化过，并且 URL 携带了 index_name 和 timestamp，则不需要初始化 date_field 字段值
          if (!initialized.current && params.get('timestamp') && params.get('index_name')) {
            initialized.current = true;
            return;
          }
          const query = form.getFieldValue('query');
          const dateField = _.find(res.fields, { name: query.date_field })?.name;
          const defaultDateField = _.find(res.fields, { name: '@timestamp' })?.name || res.fields[0]?.name;
          form.setFieldsValue({
            query: {
              ...query,
              date_field: dateField || defaultDateField,
            },
          });
        });
      }
    },
    {
      wait: 500,
    },
  );

  useEffect(() => {
    if (datasourceValue) {
      getIndices(datasourceValue, allowHideSystemIndices).then((res) => {
        const indexOptions = _.map(res, (item) => {
          return {
            value: item,
          };
        });
        setIndexOptions(indexOptions);
      });
    }
  }, [datasourceValue, allowHideSystemIndices]);

  useEffect(() => {
    if (params.get('__execute__')) {
      onExecute();
    } else if (params.get('timestamp') && params.get('index_name')) {
      // @deprecated 立即执行查询
      // 假设 URL 携带了 index_name 和 timestamp，则触发一次查询
      onExecute();
    }
  }, []);

  useEffect(() => {
    if (indexValue) {
      onIndexChange(indexValue);
    }
  }, [indexValue]);

  return (
    <Row gutter={8}>
      <Col flex='none'>
        <div style={{ width: 290 }}>
          <InputGroupWithFormItem
            label={
              <>
                {t('datasource:es.index')}{' '}
                <Tooltip title={<Trans ns='datasource' i18nKey='datasource:es.index_tip' components={{ 1: <br /> }} />}>
                  <QuestionCircleOutlined />
                </Tooltip>
              </>
            }
          >
            <Form.Item
              name={['query', 'index']}
              rules={[
                {
                  required: true,
                  message: t('datasource:es.index_msg'),
                },
              ]}
              validateTrigger='onBlur'
            >
              <AutoComplete
                dropdownMatchSelectWidth={false}
                options={_.filter(indexOptions, (item) => {
                  if (indexSearch) {
                    return _.includes(item.value, indexSearch);
                  }
                  return true;
                })}
                onSearch={(val) => {
                  setIndexSearch(val);
                }}
              />
            </Form.Item>
          </InputGroupWithFormItem>
        </div>
      </Col>
      <Col flex='auto'>
        <InputGroupWithFormItem
          label={
            <>
              {t('datasource:es.filter')}{' '}
              <Tooltip title={t('common:page_help')}>
                <QuestionCircleOutlined
                  onClick={() => {
                    DocumentDrawer({
                      language: i18n.language,
                      darkMode,
                      title: t('common:page_help'),
                      type: 'iframe',
                      documentPath: 'https://flashcat.cloud/docs/content/flashcat-monitor/nightingale-v9/usage/data-query/logs/elasticserch/',
                    });
                  }}
                />
              </Tooltip>
            </>
          }
          addonAfter={
            <Form.Item name={['query', 'syntax']} noStyle initialValue='kuery'>
              <Select
                bordered={false}
                options={SYNTAX_OPTIONS}
                dropdownMatchSelectWidth={false}
                onChange={() => {
                  form.setFieldsValue({
                    query: {
                      filter: '',
                    },
                  });
                }}
              />
            </Form.Item>
          }
        >
          {syntax === 'lucene' ? (
            <Form.Item name={['query', 'filter']}>
              <InputFilter
                fields={allFields}
                ref={refInputFilter}
                onExecute={() => {
                  setHistory();
                  onExecute();
                }}
              />
            </Form.Item>
          ) : (
            <Form.Item name={['query', 'filter']}>
              <KQLInput
                datasourceValue={datasourceValue}
                query={{
                  index: indexValue,
                  date_field: date_field,
                }}
                historicalRecords={[]}
                onEnter={() => {
                  setHistory();
                  onExecute();
                }}
              />
            </Form.Item>
          )}
        </InputGroupWithFormItem>
      </Col>
      <Col flex='none'>
        <div style={{ width: 200 }}>
          <InputGroupWithFormItem label={t('datasource:es.date_field')}>
            <Form.Item
              name={['query', 'date_field']}
              rules={[
                {
                  required: true,
                  message: t('datasource:es.date_field_msg'),
                },
              ]}
            >
              <AutoComplete
                dropdownMatchSelectWidth={false}
                style={{ width: '100%' }}
                options={_.map(dateFields, (item) => {
                  return {
                    value: item.name,
                  };
                })}
              />
            </Form.Item>
          </InputGroupWithFormItem>
        </div>
      </Col>
      <Col flex='none'>
        <Form.Item name={['query', 'range']} initialValue={{ start: 'now-1h', end: 'now' }}>
          <TimeRangePicker
            onChange={() => {
              if (refInputFilter.current) {
                refInputFilter.current.onCallback();
              }
              setHistory();

              onExecute();
            }}
            ajustTimeOptions={(options) => {
              return _.concat(
                [
                  { start: 'now-5s', end: 'now', display: 'Last 5 seconds' },
                  { start: 'now-15s', end: 'now', display: 'Last 15 seconds' },
                  { start: 'now-30s', end: 'now', display: 'Last 30 seconds' },
                ],
                options,
              );
            }}
            showMillisecond
          />
        </Form.Item>
      </Col>
      <Col flex='none'>
        <ConditionHistoricalRecords
          localKey={CACHE_KEY_MAP['indices']}
          datasourceValue={datasourceValue!}
          renderItem={(item) => {
            return (
              <div
                className='flex flex-wrap items-center gap-y-1 cursor-pointer hover:bg-[var(--fc-fill-3)] p-1 rounded leading-[1.1] mb-1'
                key={JSON.stringify(item)}
                onClick={() => {
                  form.setFieldsValue({ query: item });
                  resetFilters();
                  onExecute();
                }}
              >
                {_.map(_.pick(item, ['index', 'filter', 'syntax', 'date_field']), (value, key) => {
                  if (!value) return <span key={key} />;
                  return (
                    <span key={key}>
                      <span className='bg-[var(--fc-fill-1)] inline-block p-1 mr-1'>{t(`datasource:es.${key}`)}:</span>
                      <span className='pr-1'>{key === 'syntax' ? _.find(SYNTAX_OPTIONS, { value: value as string })?.label ?? String(value) : String(value)}</span>
                    </span>
                  );
                })}
              </div>
            );
          }}
        />
      </Col>
      <Col flex='none'>
        <Form.Item>
          <Button
            loading={loading}
            type='primary'
            onClick={() => {
              if (refInputFilter.current) {
                refInputFilter.current.onCallback();
              }
              setHistory();
              onExecute();
            }}
          >
            {t('query_btn')}
          </Button>
        </Form.Item>
      </Col>
    </Row>
  );
}
